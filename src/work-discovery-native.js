import './work-discovery-native.css'

/** The native/reduced chapter keeps the same first exhibit in its open space.
 *  Only decorative images are copied; the actual cover owns all interaction. */
export function initWorkDiscoveryPreview(root = document) {
  const chapter = root.querySelector('#team-projects-intro')
  if (!chapter || chapter.querySelector('.work-discovery-preview')) return () => {}
  const kinds = ['computer', 'tablet', 'phone']
  const sources = kinds.map(kind => root.querySelector(`#team-projects [data-exhibition-device="${kind}"] img`))
  if (sources.some(source => !source)) return () => {}

  const figure = document.createElement('figure')
  figure.className = 'work-discovery-preview'
  figure.setAttribute('aria-hidden', 'true')
  figure.inert = true

  function image(src, width, height, className = '') {
    const node = document.createElement('img')
    node.src = src
    node.alt = ''
    node.width = width
    node.height = height
    node.decoding = 'async'
    node.loading = 'lazy'
    node.draggable = false
    if (className) node.className = className
    return node
  }
  const shell = '/images/exhibition-shell.png'
  figure.append(image(shell, 1536, 1024, 'work-discovery-preview__shell'))
  sources.forEach((source, index) => {
    const frame = document.createElement('div')
    frame.className = `work-discovery-preview__device work-discovery-preview__device--${kinds[index]}`
    frame.append(image(source.getAttribute('src') || source.currentSrc,
      Number(source.getAttribute('width')) || source.naturalWidth,
      Number(source.getAttribute('height')) || source.naturalHeight))
    figure.append(frame)
  })
  figure.append(image(shell, 1536, 1024, 'work-discovery-preview__shell work-discovery-preview__lip'))
  chapter.append(figure)

  return () => figure.remove()
}
