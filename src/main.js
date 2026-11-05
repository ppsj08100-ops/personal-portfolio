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
import './project-exhibition.css'
import './project-exhibition-cover.css'
import './project-overview-reading.css'
import './project-planning.css'
import './project-research.css'
import './project-interviews.css'
import './project-definition.css'
import './project-structure.css'
import './project-visual.css'
import './project-screens.css'
import './short-form.css'
import './tools-skills.css'
import './tidal-title.css'
import './about-title.css'
import './capability-cards.css'
import './about-fish.css'
import './portfolio.css'
import './portfolio-cave.css'
import './footer.css'
import './footer-paper.css'
import './work-ocean-palette.css'
import './site-navigation.css'
import { initHero } from './hero.js'
import { initHeroStars } from './hero-stars.js'
import { initHeroLocalMotion } from './hero-local-motion.js'
import { initOceanTransitionMotion } from './ocean-transition-motion.js'
import { initScrollCue } from './scroll-cue.js'
import { initInsightReveal } from './insight-section.js'
import { initIntroduction } from './introduction.js'
import { initDesignProcess } from './design-process.js'
import { initIntroductionApproachWater } from './introduction-approach-water.js'
import { initCapabilities } from './capabilities.js'
import { initOceanType } from './ocean-type.js'
import { initWorkChapters } from './work-chapters.js'
import { initOceanDescent } from './ocean-descent.js'
import { initSeabedCover } from './seabed-cover.js'
import { initProjectCase } from './project-case.js'
import { initProjectOverview } from './project-overview.js'
import { initTeamAirSupport } from './team-air-support.js'
import { initProjectExhibition } from './project-exhibition.js'
import { initProjectPlanning } from './project-planning.js'
import { initProcessExhibition } from './process-exhibition.js'
import { initProcessDescentTransition } from './process-descent-transition.js'
import { initProjectResearch } from './project-research.js'
import { initProjectInterviews } from './project-interviews.js'
import { initProjectDefinition } from './project-definition.js'
import { initProjectStructure } from './project-structure.js'
import { initProjectVisual } from './project-visual.js'
import { initProjectScreens } from './project-screens.js'
import { initPersonalBrandArchive } from './personal-brand-archive.js'
import { initPersonalBrandSurface } from './personal-brand-surface.js'
import { initPersonalBrandGallery } from './personal-brand-gallery.js'
import { initShortForm } from './short-form.js'
import { initToolsSkills } from './tools-skills.js'
import { initAboutTitle } from './about-title.js'
import { initCapabilityCards } from './capability-cards.js'
import { initPortfolioReveal } from './portfolio-reveal.js'
import { initFooter } from './footer.js'
import { initPortfolioChat } from './portfolio-chat.js'
import { initOceanContinuity } from './ocean-continuity.js'
import { initWorkChapterDiscovery } from './work-chapter-discovery.js'

const destroyHero = initHero(document.querySelector('.hero'))
const destroyHeroStars = initHeroStars(document.querySelector('.hero'))
const destroyHeroLocalMotion = initHeroLocalMotion(document.querySelector('.hero'))
const destroyOceanTransitionMotion = initOceanTransitionMotion(document.querySelector('.ocean-transition'))
const destroyScrollCue = initScrollCue()
const destroyInsightReveal = initInsightReveal(document.querySelector('.insight-section'))
const destroyIntroduction = initIntroduction(document.querySelector('.introduction'))
const destroyDesignProcess = initDesignProcess(document.querySelector('.design-process'))
const destroyIntroductionApproachWater = initIntroductionApproachWater()
const destroyProjectExhibition = initProjectExhibition(document.querySelector('#diptyque-details'))
const destroyWorkChapters = initWorkChapters()
const destroyOceanType = initOceanType(document.querySelector('.ocean-type'))
const destroyOceanDescent = initOceanDescent(document.querySelector('.ocean-type.has-sail'))
const destroySeabedCover = initSeabedCover(document.querySelector('.sail-project--seabed'))
const destroyProjectCase = initProjectCase(document.querySelector('.project-case'))
const destroyProjectOverviews = [...document.querySelectorAll('#diptyque-details .project-overview')].map(initProjectOverview)
const destroyProjectProcess = initProjectCase(document.querySelector('.project-planning'), { id: 'diptyque-process-pages' })
const destroyProjectPlanning = initProjectPlanning(document.querySelector('.project-planning'))
const destroyProjectResearch = initProjectResearch(document.querySelector('.project-research'))
const destroyProjectInterviews = initProjectInterviews(document.querySelector('.project-interviews'))
const destroyProjectDefinition = initProjectDefinition(document.querySelector('.project-definition'))
const destroyProjectStructure = initProjectStructure(document.querySelector('.project-structure'))
const destroyProjectVisual = initProjectVisual(document.querySelector('.project-visual'))
const destroyProjectScreens = initProjectScreens(document.querySelector('.project-screens'))
const destroyProcessExhibition = initProcessExhibition(document.querySelector('#diptyque-process'))
const destroyTeamAirSupport = initTeamAirSupport()
const destroyProcessDescentTransition = initProcessDescentTransition(document.querySelector('#diptyque-process'))
const destroyPersonalBrandArchive = initPersonalBrandArchive()
const destroyPersonalBrandSurface = initPersonalBrandSurface()
const destroyPersonalBrandGallery = initPersonalBrandGallery()
const destroyShortForm = initShortForm(document.querySelector('.short-form'))
const destroyToolsSkills = initToolsSkills(document.querySelector('.tools-skills'))
const destroyAboutTitle = initAboutTitle(document.querySelector('.about-title'))
const destroyCapabilityCards = initCapabilityCards(document.querySelector('.capability-cards'))
const destroyPortfolioReveal = initPortfolioReveal(document.querySelector('.portfolio'))
const destroyCapabilities = initCapabilities(document.querySelector('.capabilities'))
const destroyFooter = initFooter(document.querySelector('.site-footer'))
const destroyPortfolioChat = initPortfolioChat()
const destroyOceanContinuity = initOceanContinuity()
const destroyWorkChapterDiscovery = initWorkChapterDiscovery()
let destroyPortfolioGallery = () => {}
let galleryDisposed = false
// Load the gallery renderer separately so the opening scenes keep their small bundle.
import('./portfolio-gallery.js').then(({ initPortfolioGallery }) => {
  if (!galleryDisposed) {
    destroyPortfolioGallery = initPortfolioGallery(document.querySelector('.portfolio'))
  }
})

if (import.meta.hot) {
  import.meta.hot.dispose(destroyHero)
  import.meta.hot.dispose(destroyHeroStars)
  import.meta.hot.dispose(destroyHeroLocalMotion)
  import.meta.hot.dispose(destroyOceanTransitionMotion)
  import.meta.hot.dispose(destroyScrollCue)
  import.meta.hot.dispose(destroyInsightReveal)
  import.meta.hot.dispose(destroyIntroduction)
  import.meta.hot.dispose(destroyDesignProcess)
  import.meta.hot.dispose(destroyIntroductionApproachWater)
  import.meta.hot.dispose(destroyProjectExhibition)
  import.meta.hot.dispose(destroyOceanType)
  import.meta.hot.dispose(destroyOceanDescent)
  import.meta.hot.dispose(destroyWorkChapters)
  import.meta.hot.dispose(destroySeabedCover)
  import.meta.hot.dispose(destroyProjectCase)
  import.meta.hot.dispose(() => destroyProjectOverviews.forEach(destroy => destroy()))
  import.meta.hot.dispose(destroyTeamAirSupport)
  import.meta.hot.dispose(destroyProjectProcess)
  import.meta.hot.dispose(destroyProjectPlanning)
  import.meta.hot.dispose(destroyProjectResearch)
  import.meta.hot.dispose(destroyProjectInterviews)
  import.meta.hot.dispose(destroyProjectDefinition)
  import.meta.hot.dispose(destroyProjectStructure)
  import.meta.hot.dispose(destroyProjectVisual)
  import.meta.hot.dispose(destroyProjectScreens)
  import.meta.hot.dispose(destroyProcessDescentTransition)
  import.meta.hot.dispose(destroyProcessExhibition)
  import.meta.hot.dispose(destroyPersonalBrandGallery)
  import.meta.hot.dispose(destroyPersonalBrandSurface)
  import.meta.hot.dispose(destroyPersonalBrandArchive)
  import.meta.hot.dispose(destroyShortForm)
  import.meta.hot.dispose(destroyToolsSkills)
  import.meta.hot.dispose(destroyAboutTitle)
  import.meta.hot.dispose(destroyCapabilityCards)
  import.meta.hot.dispose(destroyPortfolioReveal)
  import.meta.hot.dispose(destroyCapabilities)
  import.meta.hot.dispose(() => destroyFooter())
  import.meta.hot.dispose(destroyPortfolioChat)
  import.meta.hot.dispose(destroyOceanContinuity)
  import.meta.hot.dispose(destroyWorkChapterDiscovery)
  import.meta.hot.dispose(() => { galleryDisposed = true; destroyPortfolioGallery() })
}
