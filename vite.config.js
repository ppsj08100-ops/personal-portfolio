import { defineConfig, loadEnv } from 'vite'
import chatHandler from './api/chat.js'

export default defineConfig(({ mode }) => {
  // Only the Node development server reads these credentials. No VITE_ key is used.
  const localEnv = loadEnv(mode, process.cwd(), 'AI_GATEWAY_')
  for (const name of ['AI_GATEWAY_API_KEY', 'AI_GATEWAY_MODEL']) {
    if (process.env[name] === undefined && localEnv[name] !== undefined) {
      process.env[name] = localEnv[name]
    }
  }
  const installChatApi = (server) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] !== '/api/chat') { next(); return }
      void chatHandler(req, res).catch(() => {
        if (res.destroyed || res.writableEnded) return
        if (res.headersSent) { res.end(); return }
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ code: 'AI_ERROR', message: '잠시 후 다시 질문해 주세요.' }))
      })
    })
  }
  return {
    plugins: [{
      name: 'portfolio-chat-api',
      configureServer: installChatApi,
      configurePreviewServer: installChatApi,
    }],
  }
})
