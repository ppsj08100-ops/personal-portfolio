import '../portfolio-tokens.css'
import './style.css'
import './hero-motion.css'
import './scroll-cue.css'
import './insight-section.css'
import './introduction.css'
import './design-process.css'
import './capabilities.css'
import './ocean-type.css'
import './sail-transition.css'
import './ocean-descent.css'
import './project-case.css'
import './project-overview.css'
import './project-bubbles.css'
import './seabed-cover.css'
import './project-scene-refinements.css'
import './project-planning.css'
import './project-research.css'
import './project-interviews.css'
import './project-definition.css'
import './project-structure.css'
import './project-visual.css'
import './project-screens.css'
import './personal-works.css'
import './short-form.css'
import './tools-skills.css'
import './about-title.css'
import './capability-cards.css'
import './about-fish.css'
import './portfolio.css'
import './benefits.css'
import './clients-title.css'
import './reviews.css'
import './contact-intro.css'
import './contact-form.css'
import './footer.css'
import { initHero } from './hero.js'
import { initHeroStars } from './hero-stars.js'
import { initHeroLocalMotion } from './hero-local-motion.js'
import { initScrollCue } from './scroll-cue.js'
import { initInsightReveal } from './insight-section.js'
import { initIntroduction } from './introduction.js'
import { initDesignProcess } from './design-process.js'
import { initCapabilities } from './capabilities.js'
import { initOceanType } from './ocean-type.js'
import { initOceanDescent } from './ocean-descent.js'
import { initSeabedCover } from './seabed-cover.js'
import { initProjectCase } from './project-case.js'
import { initProjectOverview } from './project-overview.js'
import { initProjectBubbles } from './project-bubbles.js'
import { initProjectPlanning } from './project-planning.js'
import { initProjectResearch } from './project-research.js'
import { initProjectInterviews } from './project-interviews.js'
import { initProjectDefinition } from './project-definition.js'
import { initProjectStructure } from './project-structure.js'
import { initProjectVisual } from './project-visual.js'
import { initProjectScreens } from './project-screens.js'
import { initPersonalWorks } from './personal-works.js'
import { initShortForm } from './short-form.js'
import { initToolsSkills } from './tools-skills.js'
import { initAboutTitle } from './about-title.js'
import { initCapabilityCards } from './capability-cards.js'
import { initBenefits } from './benefits.js'
import { initClientsTitle } from './clients-title.js'
import { initReviews } from './reviews.js'
import { initContactIntro } from './contact-intro.js'
import { initContactForm } from './contact-form.js'
import { initFooter } from './footer.js'

const destroyHero = initHero(document.querySelector('.hero'))
const destroyHeroStars = initHeroStars(document.querySelector('.hero'))
const destroyHeroLocalMotion = initHeroLocalMotion(document.querySelector('.hero'))
const destroyScrollCue = initScrollCue()
const destroyInsightReveal = initInsightReveal(document.querySelector('.insight-section'))
const destroyIntroduction = initIntroduction(document.querySelector('.introduction'))
const destroyDesignProcess = initDesignProcess(document.querySelector('.design-process'))
const destroyOceanType = initOceanType(document.querySelector('.ocean-type'))
const destroyOceanDescent = initOceanDescent(document.querySelector('.ocean-type.has-sail'))
const destroySeabedCover = initSeabedCover(document.querySelector('.sail-project--seabed'))
const destroyProjectCase = initProjectCase(document.querySelector('.project-case'))
const destroyProjectOverviews = [...document.querySelectorAll('#diptyque-details .project-overview')].map(initProjectOverview)
const destroyProjectBubbles = [...document.querySelectorAll('#diptyque-details .project-overview, #diptyque-details .sail-project--seabed')].map(section => initProjectBubbles(section))
const destroyProjectProcess = initProjectCase(document.querySelector('.project-planning'), { id: 'diptyque-process-pages' })
const destroyProjectPlanning = initProjectPlanning(document.querySelector('.project-planning'))
const destroyProjectResearch = initProjectResearch(document.querySelector('.project-research'))
const destroyProjectInterviews = initProjectInterviews(document.querySelector('.project-interviews'))
const destroyProjectDefinition = initProjectDefinition(document.querySelector('.project-definition'))
const destroyProjectStructure = initProjectStructure(document.querySelector('.project-structure'))
const destroyProjectVisual = initProjectVisual(document.querySelector('.project-visual'))
const destroyProjectScreens = initProjectScreens(document.querySelector('.project-screens'))
const destroyDieselCase = initProjectCase(document.querySelector('.diesel-case'), { id: 'diesel-project-pages' })
const destroyRepettoCase = initProjectCase(document.querySelector('.repetto-case'), { id: 'repetto-project-pages' })
const destroyPersonalWorks = [...document.querySelectorAll('.personal-works')].map(initPersonalWorks)
const destroyShortForm = initShortForm(document.querySelector('.short-form'))
const destroyToolsSkills = initToolsSkills(document.querySelector('.tools-skills'))
const destroyAboutTitle = initAboutTitle(document.querySelector('.about-title'))
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
  import.meta.hot.dispose(destroyHeroStars)
  import.meta.hot.dispose(destroyHeroLocalMotion)
  import.meta.hot.dispose(destroyScrollCue)
  import.meta.hot.dispose(destroyInsightReveal)
  import.meta.hot.dispose(destroyIntroduction)
  import.meta.hot.dispose(destroyDesignProcess)
  import.meta.hot.dispose(destroyOceanType)
  import.meta.hot.dispose(destroyOceanDescent)
  import.meta.hot.dispose(destroySeabedCover)
  import.meta.hot.dispose(destroyProjectCase)
  import.meta.hot.dispose(() => destroyProjectOverviews.forEach(destroy => destroy()))
  import.meta.hot.dispose(() => destroyProjectBubbles.forEach(destroy => destroy()))
  import.meta.hot.dispose(destroyProjectProcess)
  import.meta.hot.dispose(destroyProjectPlanning)
  import.meta.hot.dispose(destroyProjectResearch)
  import.meta.hot.dispose(destroyProjectInterviews)
  import.meta.hot.dispose(destroyProjectDefinition)
  import.meta.hot.dispose(destroyProjectStructure)
  import.meta.hot.dispose(destroyProjectVisual)
  import.meta.hot.dispose(destroyProjectScreens)
  import.meta.hot.dispose(() => destroyPersonalWorks.forEach(destroy => destroy()))
  import.meta.hot.dispose(destroyDieselCase)
  import.meta.hot.dispose(destroyRepettoCase)
  import.meta.hot.dispose(destroyShortForm)
  import.meta.hot.dispose(destroyToolsSkills)
  import.meta.hot.dispose(destroyAboutTitle)
  import.meta.hot.dispose(destroyCapabilityCards)
  import.meta.hot.dispose(destroyCapabilities)
  import.meta.hot.dispose(() => destroyBenefits())
  import.meta.hot.dispose(() => destroyClientsTitle())
  import.meta.hot.dispose(() => destroyReviews())
  import.meta.hot.dispose(() => destroyContactIntro())
  import.meta.hot.dispose(() => destroyContactForm())
  import.meta.hot.dispose(() => destroyFooter())
  import.meta.hot.dispose(() => { galleryDisposed = true; destroyPortfolioGallery() })
}
