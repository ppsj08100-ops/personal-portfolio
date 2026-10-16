import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { footerContent } from './footer-content.js'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const sourceEase = CustomEase.create('footer-source-ease', '.25,.1,.25,1')

export function initFooter(footer) {
  if (!footer) return () => {}
  const name = footer.querySelector('[data-footer-name]')
  name.textContent = footerContent.name
  name.setAttribute('aria-label', `${footerContent.name} — 페이지 처음으로`)
  footer.querySelector('[data-footer-phone]').href = footerContent.phone.href
  footer.querySelector('[data-footer-phone-copy]').textContent = footerContent.phone.label
  footer.querySelector('[data-footer-design]').textContent = footerContent.credits.design
  footer.querySelector('[data-footer-development]').textContent = footerContent.credits.development
  footer.querySelector('[data-footer-year]').textContent = new Date().getFullYear()

  // Only confirmed values become working links. Empty slots never use '#'
  // or a reference studio's address as a substitute.
  if (footerContent.email) {
    const placeholder = footer.querySelector('[data-footer-email]')
    const link = document.createElement('a')
    link.className = placeholder.className.replace('site-footer__placeholder', '').trim()
    link.href = `mailto:${footerContent.email}`
    link.dataset.footerEmail = ''
    link.append(...placeholder.childNodes)
    link.firstElementChild.textContent = footerContent.email
    placeholder.replaceWith(link)
  }
  footer.querySelectorAll('[data-footer-social]').forEach(placeholder => {
    const service = placeholder.dataset.footerSocial
    const value = footerContent.socials[service]
    if (!value) return
    let url
    try { url = new URL(value) } catch { return }
    if (!['https:', 'http:'].includes(url.protocol)) return
    const link = document.createElement('a')
    link.className = placeholder.className
    link.href = url.href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.dataset.footerSocial = service
    link.setAttribute('aria-label', `${service} (새 탭)`)
    link.append(...placeholder.childNodes)
    placeholder.replaceWith(link)
  })

  const runs = [...footer.querySelectorAll('[data-footer-letters]')].map(element => ({ element, text: element.textContent }))
  runs.forEach(({ element, text }) => {
    if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', text)
    element.replaceChildren(...Array.from(text, char => {
      if (char === ' ') return document.createTextNode(' ')
      const span = document.createElement('span')
      span.className = 'site-footer__char'
      span.setAttribute('aria-hidden', 'true')
      span.textContent = char
      return span
    }))
    if (element.tagName !== 'A') {
      const readable = document.createElement('span')
      readable.className = 'sr-only'
      readable.textContent = text
      element.append(readable)
    }
  })
  const media = gsap.matchMedia()
  media.add('(prefers-reduced-motion: no-preference)', context => {
    const events = new AbortController()
    context.add('revealRun', element => {
      gsap.to(element.querySelectorAll('.site-footer__char'), { opacity: 1, duration: .6, stagger: .08, ease: sourceEase })
    })
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        context.revealRun(entry.target)
        observer.unobserve(entry.target)
      })
    }, { threshold: .3 })
    runs.forEach(({ element }) => {
      gsap.set(element.querySelectorAll('.site-footer__char'), { opacity: 0 })
      observer.observe(element)
    })
    // The original brand link dims characters outwards from a random letter;
    // the other credits here are plain owner text, without invented links.
    const chars = [...name.querySelectorAll('.site-footer__char')]
    context.add('dimBrand', () => {
      const center = Math.floor(Math.random() * chars.length)
      chars.forEach((char, index) => gsap.to(char, { opacity: .4, delay: Math.abs(index - center) * .1, duration: .4, ease: 'power1.out', overwrite: true }))
    })
    context.add('restoreBrand', () => {
      const center = Math.floor(Math.random() * chars.length)
      chars.forEach((char, index) => gsap.to(char, { opacity: 1, delay: Math.abs(index - center) * .08, duration: .5, ease: 'power1.in', overwrite: true }))
    })
    name.addEventListener('mouseenter', context.dimBrand, { signal: events.signal })
    name.addEventListener('mouseleave', context.restoreBrand, { signal: events.signal })
    footer.querySelectorAll('.site-footer__contact-item').forEach((item, index) => {
      gsap.fromTo(item, { opacity: 0 }, {
        opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { id: `footer-contact-${index}`, trigger: item, start: 'clamp(top 85%)', once: true },
      })
    })
    gsap.fromTo(footer.querySelectorAll('.site-footer__caption > span'), { opacity: 0 }, {
      opacity: 1, duration: .8, stagger: .15, ease: 'power1.in',
      scrollTrigger: { id: 'footer-caption', trigger: footer.querySelector('.site-footer__caption'), start: 'clamp(top bottom)', once: true },
    })
    return () => { events.abort(); observer.disconnect() }
  })
  return () => {
    media.revert()
    runs.forEach(({ element, text }) => { element.textContent = text })
  }
}
