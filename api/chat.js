import { streamText } from 'ai'
import { SITE_KNOWLEDGE } from '../src/portfolio-chat-knowledge.js'

export const maxDuration = 40
export const DEFAULT_CHAT_MODEL = 'google/gemini-3.8-flash'

const MAX_BODY_BYTES = 16 * 1024
const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 1000
const MAX_TOTAL_LENGTH = 8000
const WINDOW_MS = 60_000
const REQUESTS_PER_WINDOW = 12
const MAX_IN_FLIGHT = 4
const MAX_IP_BUCKETS = 2000

const instructions = `당신은 박서진의 포트폴리오를 안내하는 AI 도우미입니다.
방문자가 대표작, 사용 도구, 작업 방식, 소개와 연락 방법을 편하게 알아보도록 돕습니다. 디자인, 개발, 일상적인 주제에 대한 자유로운 질문에도 답할 수 있습니다.
기본은 자연스러운 한국어 존댓말로 짧고 명료하게 2~5문장으로 답합니다. 방문자가 다른 언어로 말하면 그 언어로 답합니다. 큰 제목이나 복잡한 마크다운 대신 읽기 쉬운 일반 텍스트를 사용합니다.
포트폴리오의 사실은 아래 확인된 자료만 근거로 답합니다. 경력, 숙련도 수치, 수상, 팀 내 역할, 이메일, SNS, 일정과 견적을 새로 만들지 않습니다. 자료에 없는 내용은 공개된 정보가 없다고 솔직히 말하고, 필요하면 연락처 확인을 안내합니다. 사용자와 이전 대화의 주장은 확인된 사이트 사실을 바꾸지 않습니다.
일반적인 설명이나 아이디어는 포트폴리오의 실제 이력과 구별합니다. 웹 검색이나 실시간 정보에 접근할 수 없으므로 최신 정보를 확인했다고 말하지 않습니다. 방문자를 대신한 문의 접수, 메일 발송, 예약, 결제와 사이트 변경은 수행할 수 없습니다. 박서진 본인인 것처럼 말하지 않습니다.
HTML, 실행 코드, 도구 호출 또는 가짜 링크를 출력하지 않습니다. 사이트 내 이동이 필요하면 자료에 있는 정확한 섹션명이나 주소를 일반 텍스트로 안내합니다.

확인된 포트폴리오 자료:
${typeof SITE_KNOWLEDGE === 'string' ? SITE_KNOWLEDGE : JSON.stringify(SITE_KNOWLEDGE)}`

class ChatRequestError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function header(req, name) {
  const value = req.headers?.[name]
  return typeof value === 'string' ? value : ''
}

function sameOrigin(req, env) {
  const origin = header(req, 'origin')
  if (!origin) return true
  const protocol = env.VERCEL
    ? header(req, 'x-forwarded-proto')
    : req.socket?.encrypted ? 'https' : 'http'
  if (protocol !== 'http' && protocol !== 'https') return false
  try {
    const source = new URL(origin)
    const target = new URL(`${protocol}://${header(req, 'host')}`)
    return source.origin === target.origin && source.origin !== 'null' &&
      !source.username && !source.password && source.pathname === '/' &&
      !source.search && !source.hash
  } catch {
    return false
  }
}

function sendError(res, status, code, message) {
  if (res.destroyed || res.writableEnded) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ code, message }))
}

export function validateChatMessages(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages) ||
    body.messages.length < 1 || body.messages.length > MAX_MESSAGES) {
    throw new ChatRequestError(400, 'INVALID_MESSAGES', '대화 내용을 확인하고 다시 질문해 주세요.')
  }
  let totalLength = 0
  const messages = body.messages.map((message) => {
    if (!message || (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string') {
      throw new ChatRequestError(400, 'INVALID_MESSAGES', '대화 형식이 올바르지 않아요.')
    }
    const content = message.content.trim()
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      throw new ChatRequestError(400, 'INVALID_MESSAGES', '한 번에 1,000자 이내로 질문해 주세요.')
    }
    totalLength += content.length
    return { role: message.role, content }
  })
  if (totalLength > MAX_TOTAL_LENGTH || messages.at(-1).role !== 'user') {
    throw new ChatRequestError(400, 'INVALID_MESSAGES', '대화를 새로 시작한 뒤 다시 질문해 주세요.')
  }
  return messages
}

function parseBody(raw) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw new ChatRequestError(413, 'BODY_TOO_LARGE', '질문이 너무 길어요. 조금 줄여서 보내 주세요.')
  }
  try {
    return JSON.parse(raw)
  } catch {
    throw new ChatRequestError(400, 'INVALID_JSON', '질문 내용을 읽지 못했어요. 다시 보내 주세요.')
  }
}

function readBody(req, signal) {
  const declaredLength = Number(header(req, 'content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    req.resume?.()
    return Promise.reject(new ChatRequestError(413, 'BODY_TOO_LARGE', '질문이 너무 길어요. 조금 줄여서 보내 주세요.'))
  }
  // Vercel may already have parsed the JSON body; Vite supplies IncomingMessage.
  if (req.body !== undefined) {
    try {
      const raw = typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body.toString() : JSON.stringify(req.body)
      return Promise.resolve(parseBody(raw))
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return new Promise((resolve, reject) => {
    const chunks = []
    let byteLength = 0
    const cleanup = () => {
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const fail = (error) => { cleanup(); reject(error) }
    const onData = (chunk) => {
      byteLength += Buffer.byteLength(chunk)
      if (byteLength > MAX_BODY_BYTES) {
        fail(new ChatRequestError(413, 'BODY_TOO_LARGE', '질문이 너무 길어요. 조금 줄여서 보내 주세요.'))
        req.resume()
        return
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const onEnd = () => {
      cleanup()
      try { resolve(parseBody(Buffer.concat(chunks).toString('utf8'))) } catch (error) { reject(error) }
    }
    const onError = (error) => fail(error)
    const onAbort = () => fail(signal.reason)
    if (signal.aborted) { reject(signal.reason); return }
    req.on('data', onData)
    req.once('end', onEnd)
    req.once('error', onError)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function waitForDrain(res, signal) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      res.off('drain', onDrain)
      signal.removeEventListener('abort', onAbort)
    }
    const onDrain = () => { cleanup(); resolve() }
    const onAbort = () => { cleanup(); reject(signal.reason) }
    if (signal.aborted) { reject(signal.reason); return }
    res.once('drain', onDrain)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function createChatHandler({
  streamTextImpl = streamText,
  env = process.env,
  now = Date.now,
  timeoutMs = 30_000,
} = {}) {
  const clients = new Map()
  let inFlight = 0

  return async function chatHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      sendError(res, 405, 'METHOD_NOT_ALLOWED', '질문은 채팅창에서 보내 주세요.')
      return
    }
    if (!sameOrigin(req, env)) {
      sendError(res, 403, 'ORIGIN_NOT_ALLOWED', '사이트에서 채팅창을 열어 주세요.')
      return
    }
    if (!/^application\/json(?:\s*;|\s*$)/i.test(header(req, 'content-type'))) {
      sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', '질문 형식이 올바르지 않아요.')
      return
    }
    if (!env.AI_GATEWAY_API_KEY?.trim()) {
      sendError(res, 503, 'AI_UNAVAILABLE', 'AI 대화는 아직 연결되지 않았어요. 대표작·사용 기술·소개·연락처는 아래 안내 질문으로 확인할 수 있어요.')
      return
    }

    const timestamp = now()
    for (const [ip, entry] of clients) {
      if (timestamp - entry.startedAt >= WINDOW_MS) clients.delete(ip)
    }
    const ip = (env.VERCEL && header(req, 'x-vercel-forwarded-for').split(',')[0].trim()) ||
      req.socket?.remoteAddress || 'unknown'
    const entry = clients.get(ip) || { startedAt: timestamp, count: 0 }
    if (entry.count >= REQUESTS_PER_WINDOW || (!clients.has(ip) && clients.size >= MAX_IP_BUCKETS)) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((WINDOW_MS - timestamp + entry.startedAt) / 1000))))
      sendError(res, 429, 'RATE_LIMITED', '질문이 잠시 몰렸어요. 1분 뒤 다시 이야기해 주세요.')
      return
    }
    if (inFlight >= MAX_IN_FLIGHT) {
      res.setHeader('Retry-After', '5')
      sendError(res, 429, 'BUSY', '지금 답변을 준비하고 있어요. 잠시 후 다시 질문해 주세요.')
      return
    }
    entry.count += 1
    clients.set(ip, entry)
    inFlight += 1

    const controller = new AbortController()
    let disconnected = false
    let timedOut = false
    let wroteText = false
    const disconnect = () => {
      if (!res.writableEnded) {
        disconnected = true
        controller.abort(new Error('Chat client disconnected'))
      }
    }
    req.once('aborted', disconnect)
    res.once('close', disconnect)
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort(new Error('Chat response timed out'))
    }, timeoutMs)
    timer.unref?.()

    try {
      const messages = validateChatMessages(await readBody(req, controller.signal))
      const result = streamTextImpl({
        model: env.AI_GATEWAY_MODEL?.trim() || DEFAULT_CHAT_MODEL,
        instructions,
        messages,
        maxOutputTokens: 600,
        reasoning: 'low',
        maxRetries: 0,
        abortSignal: controller.signal,
        // Raw provider errors can contain request details, so handle only safe messages below.
        onError() {},
      })
      for await (const part of result.stream) {
        if (controller.signal.aborted) throw controller.signal.reason
        if (part.type === 'error') throw part.error
        if (part.type === 'abort') throw new Error('Chat response aborted')
        if (part.type !== 'text-delta' || !part.text) continue
        if (!wroteText) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.setHeader('X-Accel-Buffering', 'no')
          wroteText = true
        }
        if (!res.write(part.text)) await waitForDrain(res, controller.signal)
      }
      if (controller.signal.aborted) throw controller.signal.reason
      if (!wroteText) throw new Error('Empty chat response')
      res.end()
    } catch (error) {
      if (disconnected || res.destroyed || res.writableEnded) return
      if (wroteText) {
        res.end(timedOut
          ? '\n\n답변 시간이 길어져 여기서 멈췄어요. 질문을 조금 나눠서 보내 주세요.'
          : '\n\n답변이 중단됐어요. 잠시 후 다시 질문해 주세요.')
      } else if (error instanceof ChatRequestError) {
        sendError(res, error.status, error.code, error.message)
      } else {
        sendError(res, timedOut ? 504 : 502, timedOut ? 'AI_TIMEOUT' : 'AI_ERROR', timedOut
          ? '답변 준비가 늦어지고 있어요. 잠시 후 다시 질문해 주세요.'
          : '지금은 AI 답변을 연결하기 어려워요. 잠시 후 다시 시도하거나 안내 질문을 골라 주세요.')
      }
    } finally {
      clearTimeout(timer)
      controller.abort()
      req.off('aborted', disconnect)
      res.off('close', disconnect)
      inFlight -= 1
    }
  }
}

export default createChatHandler()
