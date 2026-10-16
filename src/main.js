import '../portfolio-tokens.css'
import './style.css'
import './insight-section.css'
import './introduction.css'
import './capabilities.css'
import './capability-cards.css'
import './portfolio.css'
import './benefits.css'
import './clients-title.css'
import './reviews.css'
import './contact-intro.css'
import './contact-form.css'
import './footer.css'
import { initHero } from './hero.js'
import { initScrollCue } from './scroll-cue.js'
import { initInsightReveal } from './insight-section.js'
import { initIntroduction } from './introduction.js'
import { initCapabilities } from './capabilities.js'
import { initCapabilityCards } from './capability-cards.js'
import { initBenefits } from './benefits.js'
import { initClientsTitle } from './clients-title.js'
import { initReviews } from './reviews.js'
import { initContactIntro } from './contact-intro.js'
import { initContactForm } from './contact-form.js'
import { initFooter } from './footer.js'

const destroyHero = initHero(document.querySelector('.hero'))
const destroyScrollCue = initScrollCue()
const destroyInsightReveal = initInsightReveal(document.querySelector('.insight-section'))
const destroyIntroduction = initIntroduction(document.querySelector('.introduction'))
const destroyCapabilityCards = initCapabilityCards(document.querySelector('.capability-cards'))
const destroyCapabilities = initCapabilities(document.querySelector('.capabilities'))
const destroyContactForm = initContactForm(document.querySelector('[data-contact-form]'))
const destroyFooter = initFooter(document.querySelector('.site-footer'))
let destroyBenefits = () => {}
let destroyClientsTitle = () => {}
let destroyReviews = () => {}
let destroyContactIntro = () => {}
let destroyPortfolioGallery = () => {}
let galleryDisposed = false
// Load the gallery renderer separately so the opening scenes keep their small bundle.
import('./portfolio-gallery.js').then(({ initPortfolioGallery }) => {
  if (!galleryDisposed) {
    destroyPortfolioGallery = initPortfolioGallery(document.querySelector('.portfolio'))
    destroyBenefits = initBenefits(document.querySelector('.benefits'))
    destroyClientsTitle = initClientsTitle(document.querySelector('.clients-title'))
    destroyReviews = initReviews(document.querySelector('.reviews'))
    destroyContactIntro = initContactIntro(document.querySelector('.contact-intro'))
  }
})

if (import.meta.hot) {
  import.meta.hot.dispose(destroyHero)
  import.meta.hot.dispose(destroyScrollCue)
  import.meta.hot.dispose(destroyInsightReveal)
  import.meta.hot.dispose(destroyIntroduction)
  import.meta.hot.dispose(destroyCapabilities)
  import.meta.hot.dispose(destroyCapabilityCards)
  import.meta.hot.dispose(() => destroyBenefits())
  import.meta.hot.dispose(() => destroyClientsTitle())
  import.meta.hot.dispose(() => destroyReviews())
  import.meta.hot.dispose(() => destroyContactIntro())
  import.meta.hot.dispose(() => destroyContactForm())
  import.meta.hot.dispose(() => destroyFooter())
  import.meta.hot.dispose(() => { galleryDisposed = true; destroyPortfolioGallery() })
}
