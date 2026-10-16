import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const sourceEase = CustomEase.create('contact-form-source-ease', '.25,.1,.25,1')
const sourceEaseOut = CustomEase.create('contact-form-source-ease-out', '0,0,.58,1')

export function initContactForm(form) {
  if (!form) return () => {}
  const media = gsap.matchMedia()
  const events = new AbortController()
  const status = form.querySelector('.contact-form__status')

  // This portfolio has no submission endpoint. Validate locally, retain the
  // values, and explain that nothing was sent; never simulate a success.
  form.addEventListener('submit', event => {
    event.preventDefault()
    for (const control of form.querySelectorAll('[required]')) {
      if (!control.value.trim()) control.setCustomValidity('내용을 입력해 주세요.')
    }
    if (!form.reportValidity()) return
    form.dataset.submitState = 'unavailable'
    status.hidden = false
    status.scrollIntoView({ block: 'nearest' })
  }, { signal: events.signal })
  form.addEventListener('input', event => {
    if (event.target.matches('input, textarea')) event.target.setCustomValidity('')
    status.hidden = true
    delete form.dataset.submitState
  }, { signal: events.signal })

  media.add('(prefers-reduced-motion: no-preference)', () => {
    // Live source a-14/a-19: reveal each underline and clear a small text blur
    // at top 85%; neither field nor form moves or changes its layout size.
    form.querySelectorAll('.contact-form__field').forEach((field, index) => {
      const entry = gsap.timeline({ scrollTrigger: {
        id: `contact-field-${index}`, trigger: field, start: 'clamp(top 85%)', once: true,
      } })
      entry.fromTo(field.querySelector('.contact-form__line-reveal'), { width: '0%' }, { width: '100%', duration: 1.6, ease: sourceEase }, 0)
        .fromTo(field.querySelector('.contact-form__line-glint'), { opacity: 1 }, { opacity: 0, duration: 2.7, ease: sourceEase }, 0)
        .fromTo(field.querySelector('.contact-form__control'), { filter: 'blur(2.5px)' }, { filter: 'blur(0px)', duration: 2, ease: sourceEaseOut }, 0)
        .fromTo(field.querySelector('.contact-form__control'), { opacity: 0 }, { opacity: 1, duration: 1.2, ease: sourceEase }, .4)
    })
    gsap.fromTo(form.querySelector('.contact-form__submit'), { opacity: 0 }, {
      opacity: 1, duration: 1, ease: 'power3.out',
      scrollTrigger: { id: 'contact-submit', trigger: form.querySelector('.contact-form__submit'), start: 'clamp(top 85%)', once: true },
    })
  })
  return () => {
    events.abort()
    media.revert()
  }
}
