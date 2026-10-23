import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getGuideReply, STARTER_QUESTIONS } from './portfolio-chat-knowledge.js'
import './portfolio-chat.css'

const mark = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 4c.8 7.7 4.3 11.2 12 12-7.7.8-11.2 4.3-12 12C15.2 20.3 11.7 16.8 4 16c7.7-.8 11.2-4.3 12-12Z"/><path d="M25 3v6M22 6h6" opacity=".6"/></svg>'
const arrow = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor"/></svg>'

// Curated portfolio answers work offline. Freeform questions go to the
// same-origin server; model credentials and SDK never enter the client bundle.
export function initPortfolioChat() {
  const widget = document.createElement('aside')
  widget.className = 'portfolio-chat'
  widget.dataset.open = 'false'
  widget.setAttribute('aria-label', '포트폴리오 챗봇')
  widget.innerHTML = `
    <button class="portfolio-chat__launcher" type="button" aria-label="DEEPER 포트폴리오 챗봇 열기" aria-expanded="false" aria-controls="portfolio-chat-panel">
      <span class="portfolio-chat__orb">${mark}</span><span class="portfolio-chat__launcher-label" lang="en">ASK DEEPER</span>
    </button>
    <section class="portfolio-chat__panel" id="portfolio-chat-panel" role="region" aria-labelledby="portfolio-chat-title" hidden>
      <header class="portfolio-chat__header"><div class="portfolio-chat__identity"><span class="portfolio-chat__orb" aria-hidden="true">${mark}</span><div>
        <p class="portfolio-chat__eyebrow" lang="en">PARK SEOJIN / PORTFOLIO GUIDE</p><h2 class="portfolio-chat__title" id="portfolio-chat-title" lang="en">DEEPER</h2>
      </div></div><button class="portfolio-chat__close" type="button" aria-label="챗봇 닫기"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></header>
      <p class="portfolio-chat__intro">화면 너머의 이야기, 조금 더 깊이.<br>작업과 서진님에 대해 궁금한 걸 물어보세요.</p>
      <div class="portfolio-chat__messages" role="log" aria-label="대화 내용" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
      <div class="portfolio-chat__starters" aria-label="추천 질문"></div>
      <form class="portfolio-chat__form"><label class="sr-only" for="portfolio-chat-input">챗봇에게 질문하기</label>
        <div class="portfolio-chat__input-wrap"><textarea class="portfolio-chat__input" id="portfolio-chat-input" name="question" rows="1" maxlength="1000" placeholder="궁금한 이야기를 남겨주세요" enterkeyhint="send"></textarea>
          <button class="portfolio-chat__send" type="submit" aria-label="질문 보내기" disabled>${arrow}</button></div>
      </form>
      <div class="portfolio-chat__footer"><span class="portfolio-chat__status">포트폴리오 안내</span><button class="portfolio-chat__reset" type="button">대화 지우기</button></div>
      <p class="sr-only" role="status" data-chat-announcement></p>
    </section>`
  document.body.append(widget)
  const controller = new AbortController()
  const { signal } = controller
  const launcher = widget.querySelector('.portfolio-chat__launcher')
  const panel = widget.querySelector('.portfolio-chat__panel')
  const log = widget.querySelector('.portfolio-chat__messages')
  const starters = widget.querySelector('.portfolio-chat__starters')
  const input = widget.querySelector('textarea')
  const send = widget.querySelector('.portfolio-chat__send')
  const status = widget.querySelector('.portfolio-chat__status')
  const announcement = widget.querySelector('[data-chat-announcement]')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let history = [], lastTopic = null, request = null
  let generation = 0, busy = false, open = false, destroyed = false

  function scrollToLatest() { log.scrollTop = log.scrollHeight }
  function nearBottom() { return log.scrollHeight - log.clientHeight - log.scrollTop < 70 }
  function updateSend() { send.disabled = busy || !input.value.trim() }
  function resizeInput() {
    input.style.height = 'auto'
    input.style.height = `${Math.min(88, input.scrollHeight)}px`
    updateSend()
  }
  function viewportChanged() {
    const viewport = window.visualViewport
    widget.dataset.keyboard = String(Boolean(viewport && viewport.height < innerHeight * .75))
    widget.style.bottom = `${viewport ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0}px`
    widget.style.setProperty('--chat-viewport-height', `${viewport?.height || innerHeight}px`)
  }
  function setOpen(value, restoreFocus = true) {
    open = value
    widget.dataset.open = String(value)
    panel.hidden = !value
    launcher.setAttribute('aria-expanded', String(value))
    launcher.setAttribute('aria-label', value ? 'DEEPER 포트폴리오 챗봇 닫기' : 'DEEPER 포트폴리오 챗봇 열기')
    if (value) {
      viewportChanged()
      scrollToLatest()
      const focusTarget = matchMedia('(pointer: fine)').matches ? input : widget.querySelector('.portfolio-chat__close')
      focusTarget.focus({ preventScroll: true })
    } else if (restoreFocus) launcher.focus({ preventScroll: true })
  }
  function navigate(action) {
    const target = document.querySelector(action.href)
    if (!target) return
    setOpen(false, false)
    const project = action.project ? document.querySelector(action.project) : null
    const button = project?.querySelector(`[data-project-page="${action.page ?? 0}"]`)
    const triggerIds = { '#diptyque-details': 'diptyque-project-pages', '#diesel-project': 'diesel-project-pages',
      '#repetto-project': 'repetto-project-pages', '#diptyque-process': 'diptyque-process-pages',
      '#design-process': 'design-process-pinned' }
    const triggerId = triggerIds[action.project || action.href]
    const trigger = triggerId ? ScrollTrigger.getById(triggerId) : null
    if (button) {
      button.click()
      if (!trigger) project.scrollIntoView({ block: 'start', behavior: 'instant' })
    } else if (action.href === '#capability-cards' && ScrollTrigger.getById('capability-depth')) {
      const about = ScrollTrigger.getById('capability-depth')
      scrollTo({ top: about.start + (about.end - about.start) * 7 / 76, behavior: 'instant' })
    } else if (action.href === '#tools-skills' && ScrollTrigger.getById('skills-current-title')) {
      scrollTo({ top: ScrollTrigger.getById('skills-current-title').end + innerHeight * .55, behavior: 'instant' })
    } else if (trigger) scrollTo({ top: trigger.start + 1, behavior: 'instant' })
    else target.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' })
    ScrollTrigger.update()
    const focus = target.querySelector('h2, h3') || target
    if (!focus.hasAttribute('tabindex')) focus.setAttribute('tabindex', '-1')
    focus.focus({ preventScroll: true })
  }
  function addMessage(role, text, actions = []) {
    const message = document.createElement('div')
    message.className = `portfolio-chat__message portfolio-chat__message--${role}`
    const label = document.createElement('span')
    label.className = 'portfolio-chat__message-label'
    label.lang = 'en'
    label.textContent = role === 'user' ? 'YOU' : 'DEEPER'
    const content = document.createElement('p')
    content.className = 'portfolio-chat__message-text'
    content.textContent = text
    message.append(label, content)
    if (actions.length) {
      const links = document.createElement('div')
      links.className = 'portfolio-chat__message-actions'
      for (const action of actions) {
        const link = document.createElement('a')
        link.className = 'portfolio-chat__action'
        link.textContent = action.label
        link.href = action.href
        if (action.href.startsWith('#')) link.addEventListener('click', event => { event.preventDefault(); navigate(action) }, { signal })
        if (action.href.startsWith('https:')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `${action.label} (새 탭)`) }
        links.append(link)
      }
      message.append(links)
    }
    log.append(message)
    while (log.children.length > 32) log.firstElementChild.remove()
    scrollToLatest()
    return content
  }
  function remember(role, content) { history.push({ role, content }); history = history.slice(-24) }
  function clearConversation(focus = false) {
    generation++
    request?.abort()
    request = null
    history = []
    lastTopic = null
    busy = false
    input.value = ''
    log.replaceChildren()
    log.setAttribute('aria-busy', 'false')
    addMessage('assistant', '안녕하세요. 서진님의 작업을 함께 둘러볼 DEEPER예요.\n어떤 이야기가 궁금하세요?')
    starters.hidden = false
    status.textContent = '포트폴리오 안내'
    resizeInput()
    announcement.textContent = focus ? '대화를 지웠습니다.' : ''
    if (focus) input.focus({ preventScroll: true })
  }
  function requestMessages() {
    let remaining = 7600
    const messages = []
    for (const item of history.slice(-11).reverse()) {
      const content = item.content.slice(0, Math.min(1000, remaining))
      if (!content) break
      messages.unshift({ role: item.role, content })
      if (new TextEncoder().encode(JSON.stringify({ messages })).byteLength > 15000) { messages.shift(); break }
      remaining -= content.length
    }
    return messages
  }
  async function ask(question) {
    const value = question.trim().slice(0, 1000)
    if (!value || busy || destroyed) return
    input.value = ''
    resizeInput()
    starters.hidden = true
    addMessage('user', value)
    remember('user', value)
    const guide = getGuideReply(value, { lastTopic })
    if (guide) {
      lastTopic = guide.topic
      addMessage('assistant', guide.text, guide.actions)
      remember('assistant', guide.text)
      announcement.textContent = '안내 답변이 도착했습니다.'
      status.textContent = '포트폴리오 안내'
      return
    }
    busy = true
    updateSend()
    status.textContent = '답변을 준비하고 있어요'
    log.setAttribute('aria-busy', 'true')
    const pending = document.createElement('div')
    pending.className = 'portfolio-chat__pending'
    pending.setAttribute('aria-label', '답변 준비 중')
    pending.innerHTML = '<span></span><span></span><span></span>'
    log.append(pending)
    scrollToLatest()
    request = new AbortController()
    const activeRequest = request, version = generation
    const timeout = setTimeout(() => activeRequest.abort(), 32000)
    let responseContent, answer = ''
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: requestMessages() }), signal: activeRequest.signal })
      if (destroyed || version !== generation) return
      pending.remove()
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const text = error.code === 'AI_UNAVAILABLE'
          ? '자유로운 AI 대화는 아직 연결 전이에요. 지금은 이 포트폴리오에 담긴 내용을 안내해 드릴 수 있어요.\n대표 작업, 딥디크에서 맡은 역할, 사용하는 도구나 연락 방법을 물어봐 주세요.'
          : error.code === 'RATE_LIMITED' || error.code === 'BUSY'
            ? '잠시 질문이 많아졌어요. 조금 뒤 다시 물어봐 주세요. 대표 작업이나 사용 도구는 바로 안내해 드릴 수 있어요.'
            : '지금은 AI 답변을 연결하기 어려워요. 잠시 후 다시 질문해 주세요. 포트폴리오에 관한 질문은 계속 안내해 드릴게요.'
        addMessage('assistant', text, [{ label: '대표 작업 둘러보기', href: '#design-code' }, { label: '연락 방법', href: '#contact' }])
        remember('assistant', text)
        status.textContent = '포트폴리오 안내'
        return
      }
      if (!response.body || !response.headers.get('content-type')?.includes('text/plain')) throw new Error('Invalid chat response')
      responseContent = addMessage('assistant', '')
      const reader = response.body.getReader(), decoder = new TextDecoder()
      while (true) {
        const { value: chunk, done } = await reader.read()
        if (destroyed || version !== generation) { await reader.cancel(); return }
        if (done) break
        const stick = nearBottom()
        answer += decoder.decode(chunk, { stream: true })
        if (answer.length > 6000) { activeRequest.abort(); break }
        responseContent.textContent = answer
        if (stick) scrollToLatest()
      }
      answer += decoder.decode()
      if (!answer.trim()) throw new Error('Empty chat response')
      responseContent.textContent = answer
      remember('assistant', answer)
      status.textContent = 'AI 대화 · 사이트 내용 기반'
      lastTopic = null
    } catch {
      if (destroyed || version !== generation) return
      pending.remove()
      const text = answer.trim() ? `${answer}\n\n연결이 끊겨 여기까지 답변했어요. 다시 질문해 주세요.`
        : '지금은 AI 답변에 연결할 수 없어요. 포트폴리오에 관한 질문은 계속 안내해 드릴게요.'
      if (responseContent) responseContent.textContent = text
      else addMessage('assistant', text)
      remember('assistant', text)
      status.textContent = '포트폴리오 안내'
    } finally {
      clearTimeout(timeout)
      if (!destroyed && version === generation) {
        busy = false
        request = null
        log.setAttribute('aria-busy', 'false')
        updateSend()
        announcement.textContent = '답변이 도착했습니다.'
      }
    }
  }

  for (const [index, question] of STARTER_QUESTIONS.entries()) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'portfolio-chat__starter'
    const number = document.createElement('span'), text = document.createElement('span')
    number.textContent = `0${index + 1}`
    text.textContent = question
    button.append(number, text)
    button.insertAdjacentHTML('beforeend', arrow)
    button.addEventListener('click', () => ask(question), { signal })
    starters.append(button)
  }
  launcher.addEventListener('click', () => setOpen(!open), { signal })
  widget.querySelector('.portfolio-chat__close').addEventListener('click', () => setOpen(false), { signal })
  widget.querySelector('.portfolio-chat__reset').addEventListener('click', () => clearConversation(true), { signal })
  widget.querySelector('form').addEventListener('submit', event => { event.preventDefault(); ask(input.value) }, { signal })
  input.addEventListener('input', resizeInput, { signal })
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); ask(input.value) }
  }, { signal })
  widget.addEventListener('keydown', event => { if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false) } }, { signal })
  const menu = document.querySelector('#portfolio-menu')
  const menuObserver = new MutationObserver(() => { if (menu?.open && open) setOpen(false, false) })
  if (menu) menuObserver.observe(menu, { attributes: true, attributeFilter: ['open'] })
  window.visualViewport?.addEventListener('resize', viewportChanged, { signal })
  window.visualViewport?.addEventListener('scroll', viewportChanged, { signal })
  window.addEventListener('resize', viewportChanged, { signal })
  clearConversation()
  viewportChanged()
  return () => {
    destroyed = true
    generation++
    request?.abort()
    controller.abort()
    menuObserver.disconnect()
    widget.remove()
  }
}
