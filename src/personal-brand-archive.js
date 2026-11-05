import './personal-brand-archive.css'
import './personal-brand-archive-dialog.css'

let dialogSerial = 0

export function initPersonalBrandArchive() {
  if (!document.querySelector('.brand-archive')) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const titleId = `brand-archive-dialog-title-${++dialogSerial}`
  const helpId = `brand-archive-dialog-help-${dialogSerial}`
  const dialog = document.createElement('dialog')
  dialog.className = 'brand-archive-dialog'
  dialog.dataset.brandDialog = 'shared'
  dialog.setAttribute('aria-labelledby', titleId)
  dialog.innerHTML = `
    <div class="brand-archive-dialog__sheet">
      <header class="brand-archive-dialog__header">
        <div class="brand-archive-dialog__heading">
          <p lang="en">DESIGN ARCHIVE / PREVIEW</p>
          <h2 id="${titleId}"></h2>
        </div>
        <button class="brand-archive-dialog__close" type="button" data-brand-dialog-close autofocus>
          <span>닫기</span>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
        </button>
      </header>
      <div class="brand-archive-dialog__viewport" data-brand-dialog-viewport tabindex="0" role="region" aria-describedby="${helpId}">
        <div class="brand-archive-dialog__content" data-brand-dialog-content></div>
      </div>
      <footer class="brand-archive-dialog__footer">
        <p class="brand-archive-dialog__help" id="${helpId}">화면을 밀어 디자인을 살펴보세요</p>
        <a class="brand-archive-dialog__figma" target="_blank" rel="noopener noreferrer">Figma 원본 보기 <span aria-hidden="true">↗</span></a>
      </footer>
    </div>`
  document.body.append(dialog)

  const title = dialog.querySelector('h2')
  const closeButton = dialog.querySelector('[data-brand-dialog-close]')
  const viewport = dialog.querySelector('[data-brand-dialog-viewport]')
  const content = dialog.querySelector('[data-brand-dialog-content]')
  const figma = dialog.querySelector('.brand-archive-dialog__figma')
  let opener = null
  let previousOverflow = null
  let destroyed = false

  function restoreBody() {
    if (previousOverflow === null) return
    const { value, priority } = previousOverflow
    if (value) document.body.style.setProperty('overflow', value, priority)
    else document.body.style.removeProperty('overflow')
    previousOverflow = null
  }

  function finished() {
    restoreBody()
    const returnTarget = opener
    opener = null
    content.replaceChildren()
    if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true })
  }

  function close() {
    if (dialog.open) dialog.close()
  }

  function open(section, button) {
    const preview = section.querySelector('.brand-archive__preview')
    const source = preview?.querySelector('.repetto-screen') || preview?.querySelector('img')
    if (!source) return
    const sourceRatio = source.matches('img')
      ? (source.naturalWidth || Number(source.getAttribute('width'))) / (source.naturalHeight || Number(source.getAttribute('height')))
      : 16 / 9
    content.style.setProperty('--brand-dialog-ratio', (Number.isFinite(sourceRatio) && sourceRatio > 0 ? sourceRatio : 16 / 9).toFixed(6))
    const brand = section.dataset.brandName || section.querySelector('.brand-archive__title')?.textContent.trim() || '작업'
    const clone = source.cloneNode(true)
    for (const element of [clone, ...clone.querySelectorAll('[id]')]) element.removeAttribute('id')
    const images = clone.matches('img') ? [clone] : [...clone.querySelectorAll('img')]
    images.forEach(image => {
      image.loading = 'eager'
      image.decoding = 'async'
      image.draggable = false
    })
    content.replaceChildren(clone)
    title.textContent = `${brand} 화면 미리보기`
    dialog.dataset.brandName = brand
    viewport.setAttribute('aria-label', `${brand} 디자인 확대 화면. 화면이 넓으면 방향키로 이동할 수 있습니다.`)
    const original = section.querySelector('a.brand-archive__link[href]')
    figma.hidden = !original
    if (original) {
      figma.href = original.href
      figma.setAttribute('aria-label', `${brand} Figma 원본 보기 (새 탭)`)
    } else figma.removeAttribute('href')

    opener = button
    if (!dialog.open) {
      previousOverflow = {
        value: document.body.style.getPropertyValue('overflow'),
        priority: document.body.style.getPropertyPriority('overflow'),
      }
      document.body.style.setProperty('overflow', 'hidden')
      try {
        dialog.showModal()
      } catch {
        restoreBody()
        opener = null
        content.replaceChildren()
        return
      }
    }
    viewport.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    closeButton.focus({ preventScroll: true })
  }

  document.addEventListener('click', event => {
    if (destroyed || !(event.target instanceof Element)) return
    const button = event.target.closest('[data-brand-preview]')
    const section = button?.closest('.brand-archive')
    if (!button || !section) return
    event.preventDefault()
    open(section, button)
  }, { signal })

  closeButton.addEventListener('click', close, { signal })
  dialog.addEventListener('close', finished, { signal })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
  }, { signal })
  viewport.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || viewport.scrollWidth <= viewport.clientWidth + 1) return
    const step = Math.max(80, viewport.clientWidth * .2)
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      viewport.scrollBy({ left: event.key === 'ArrowLeft' ? -step : step, behavior: 'instant' })
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      viewport.scrollTo({ left: event.key === 'Home' ? 0 : viewport.scrollWidth - viewport.clientWidth, behavior: 'instant' })
    }
  }, { signal })

  return () => {
    destroyed = true
    controller.abort()
    if (dialog.open) dialog.close()
    finished()
    dialog.remove()
  }
}
