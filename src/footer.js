import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { footerContent } from './footer-content.js'
import { initFooterSeabed } from './footer-seabed.js'
import { initFooterGrounding } from './footer-grounding.js'
import { initFooterContact } from './footer-contact.js'
import { initFooterAmbience } from './footer-ambience.js'

gsap.registerPlugin(ScrollTrigger)

export function initFooter(footer) {
  if (!footer) return () => {}

  const name = footer.querySelector('[data-footer-name]')
  name.textContent = footerContent.name
  name.setAttribute('aria-label', `${footerContent.name} — 페이지 처음으로`)
  footer.querySelectorAll('[data-footer-contact-name]').forEach(copy => { copy.textContent = footerContent.contactName })
  footer.querySelectorAll('[data-footer-phone]').forEach(link => { link.href = footerContent.phone.href })
  footer.querySelectorAll('[data-footer-phone-copy]').forEach(copy => { copy.textContent = footerContent.phone.label })
  footer.querySelector('[data-footer-development]').textContent = footerContent.credits.development
  footer.querySelector('[data-footer-design]').textContent = footerContent.credits.design
  footer.querySelector('[data-footer-year]').textContent = new Date().getFullYear()

  footer.querySelectorAll('[data-footer-email]').forEach(link => {
    link.href = `mailto:${footerContent.email}`
  })
  footer.querySelectorAll('[data-footer-email-copy]').forEach(copy => {
    copy.textContent = footerContent.email
  })
  footer.querySelectorAll('[data-footer-link]').forEach(placeholder => {
    const service = placeholder.dataset.footerLink
    const value = footerContent.links[service]
    if (!value) return
    let url
    try { url = new URL(value, window.location.origin) } catch { return }
    if (!['https:', 'http:'].includes(url.protocol)) return
    const link = document.createElement('a')
    link.className = placeholder.className
    link.href = url.href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.dataset.footerLink = service
    link.setAttribute('aria-label', `${service === 'github' ? 'GitHub' : '이력서'} (새 탭)`)
    link.append(...placeholder.childNodes)
    link.querySelector('.site-footer__link-state')?.remove()
    placeholder.replaceWith(link)
  })

  const destroySeabed = initFooterSeabed(footer)
  const destroyAmbience = initFooterAmbience(footer)
  const destroyGrounding = initFooterGrounding(footer)
  const destroyContact = initFooterContact(footer)

  const media = gsap.matchMedia()
  media.add('(prefers-reduced-motion: no-preference)', () => {
    footer.querySelectorAll('.site-footer__nametag, .site-footer__brand, .site-footer__caption').forEach((item, index) => {
      gsap.fromTo(item, { opacity: 0 }, {
        opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { id: `footer-reveal-${index}`, trigger: item, start: 'clamp(top 93%)', once: true },
      })
    })
  })

  return () => {
    destroySeabed()
    destroyAmbience()
    destroyGrounding()
    destroyContact()
    media.revert()
  }
}
