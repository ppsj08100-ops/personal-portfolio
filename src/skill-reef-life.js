import { gsap } from 'gsap';

const atlas = '/images/skills-marine-engraving-atlas.png';
const fishAtlas = '/images/skills-reef-fish-species-v2.png';
const atlasSize = 1254;
const specimenBounds = {
  butterfly: '650 70 580 515',
  hermit: '40 740 585 455', clam: '650 670 575 525',
};
const fishBounds = {
  butterfly: specimenBounds.butterfly,
  wrasse: '15 276 650 273',
  angelfish: '693 79 530 600',
  damselfish: '30 738 585 385',
  goby: '616 838 638 288',
};
const fishPopulations = [
  ['butterfly', 'wrasse', 'damselfish'],
  ['angelfish', 'goby', 'wrasse'],
  ['damselfish', 'goby'],
];
let habitatId = 0;

function atlasImage(extra = '') {
  return `<image href="${atlas}" width="${atlasSize}" height="${atlasSize}" ${extra}/>`;
}
function fishSpecimen(species) {
  const source = species === 'butterfly' ? atlas : fishAtlas;
  return `<svg class="skill-reef__specimen skill-reef__specimen--fish skill-reef__specimen--${species}" data-fish-species="${species}" viewBox="${fishBounds[species]}" aria-hidden="true" focusable="false"><image href="${source}" width="${atlasSize}" height="${atlasSize}"/></svg>`;
}

const starfishDrawing = `
  <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g class="skill-reef__starfish-outline" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path class="skill-reef__starfish-body" d="M46 43C46 31 43 10 49 5C53 2 54 27 55 42C65 41 84 26 91 30C96 34 74 45 60 49C65 59 83 85 79 91C75 97 59 68 53 59C45 66 24 90 18 85C12 81 37 59 41 53C30 49 4 44 8 35C11 30 35 43 46 43Z"/>
      <path class="skill-reef__starfish-ridges" fill="none" d="M49 10C48 23 51 37 50 50M86 32C74 38 61 48 50 50M77 87C69 77 58 57 50 50M21 83C31 73 43 59 50 50M12 37C23 42 40 47 50 50"/>
      <g class="skill-reef__starfish-dots" fill="#34566a" stroke="none">
        <circle cx="49" cy="16" r=".65"/><circle cx="48" cy="23" r=".75"/><circle cx="51" cy="28" r=".7"/>
        <circle cx="48" cy="33" r=".75"/><circle cx="52" cy="38" r=".8"/><circle cx="49" cy="42" r=".7"/>
        <circle cx="80" cy="34" r=".65"/><circle cx="73" cy="39" r=".75"/><circle cx="68" cy="41" r=".7"/>
        <circle cx="62" cy="46" r=".8"/><circle cx="57" cy="47" r=".7"/><circle cx="53" cy="51" r=".7"/>
        <circle cx="75" cy="83" r=".65"/><circle cx="70" cy="77" r=".75"/><circle cx="68" cy="70" r=".7"/>
        <circle cx="61" cy="64" r=".8"/><circle cx="57" cy="57" r=".7"/><circle cx="50" cy="55" r=".85"/>
        <circle cx="24" cy="80" r=".65"/><circle cx="28" cy="74" r=".75"/><circle cx="34" cy="70" r=".7"/>
        <circle cx="37" cy="63" r=".8"/><circle cx="44" cy="59" r=".75"/><circle cx="45" cy="52" r=".8"/>
        <circle cx="17" cy="39" r=".65"/><circle cx="23" cy="42" r=".75"/><circle cx="30" cy="42" r=".7"/>
        <circle cx="36" cy="47" r=".8"/><circle cx="42" cy="48" r=".7"/><circle cx="48" cy="49" r=".85"/>
      </g>
      <path fill="none" stroke="currentColor" stroke-width=".55" stroke-opacity=".6" d="M46 41L49 39M56 45L57 49M57 56L54 58M45 57L42 55M43 47L44 44"/>
    </g>
  </svg>`;

function hermitDrawing() {
  // Keep shell and legs together so a retreat cannot leave a clipped, empty shell.
  return `
    <div class="skill-reef__hermit-walk">
      <svg class="skill-reef__specimen skill-reef__specimen--hermit" viewBox="${specimenBounds.hermit}" aria-hidden="true" focusable="false">
        ${atlasImage()}
      </svg>
    </div>`;
}

function clamDrawing(id) {
  return `
    <button class="skill-reef__clam" type="button" aria-label="조개 열어보기" aria-expanded="false" aria-controls="reef-clam-note-${id}">
      <span class="skill-reef__specimen skill-reef__specimen--clam">
        <svg class="skill-reef__clam-base" viewBox="${specimenBounds.clam}" aria-hidden="true" focusable="false">
          <defs><clipPath id="reef-clam-base-${id}"><path d="M650 956C790 969 1002 984 1225 951V1195H650Z"/></clipPath></defs>
          ${atlasImage(`clip-path="url(#reef-clam-base-${id})"`)}
        </svg>
        <svg class="skill-reef__clam-lid" viewBox="${specimenBounds.clam}" aria-hidden="true" focusable="false">
          <defs><clipPath id="reef-clam-lid-${id}"><path d="M650 670H1225V970C1002 995 790 979 650 968Z"/></clipPath></defs>
          ${atlasImage(`clip-path="url(#reef-clam-lid-${id})"`)}
        </svg>
      </span>
    </button>
    <div class="skill-reef__clam-note" id="reef-clam-note-${id}" role="region" aria-labelledby="reef-clam-title-${id}" hidden>
      <strong id="reef-clam-title-${id}">작은 발견</strong>
      <p>도구를 선택하면 화면을 설계하고 움직임을 구현할 때 어떻게 활용하는지 볼 수 있어요.</p>
      <button class="skill-reef__clam-close" type="button" aria-label="조개 설명 닫기">닫기</button>
    </div>`;
}

function decoration(modifier, drawing, interactive = false) {
  const node = document.createElement('div');
  node.className = `skill-reef__life skill-reef__${modifier}`;
  if (!interactive) node.setAttribute('aria-hidden', 'true');
  node.innerHTML = drawing;
  return node;
}

function closedCurve(points, phase) {
  const progress = (((phase % 1) + 1) % 1) * points.length;
  const index = Math.floor(progress);
  const t = progress - index;
  const p0 = points[(index + points.length - 1) % points.length];
  const p1 = points[index % points.length];
  const p2 = points[(index + 1) % points.length];
  const p3 = points[(index + 2) % points.length];
  return [0, 1].map((axis) => .5 * (
    2 * p1[axis] + (-p0[axis] + p2[axis]) * t
    + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t * t
    + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t * t * t
  ));
}

function cubicPoint(start, controlOne, controlTwo, end, progress) {
  const rest = 1 - progress;
  return rest ** 3 * start + 3 * rest ** 2 * progress * controlOne
    + 3 * rest * progress ** 2 * controlTwo + progress ** 3 * end;
}

/** Small, local habitats keep the animals close to the coral they are exploring. */
export function initSkillReefLife(scene) {
  if (!scene || scene.querySelector('.skill-reef__life')) return () => {};
  const rocks = [...scene.querySelectorAll('.skill-reef__rock')];
  if (!rocks.length) return () => {};

  const id = ++habitatId;
  const designRock = rocks[0];
  const workflowRock = rocks[1] || designRock;
  const creativeRock = rocks.at(-1);
  const starfish = decoration('starfish', starfishDrawing);
  starfish.classList.add('skill-reef__starfish--one');
  const smallStarfish = decoration('starfish', starfishDrawing);
  smallStarfish.classList.add('skill-reef__starfish--two');
  const hermit = decoration('hermit', hermitDrawing());
  const clam = decoration('clam-wrap', clamDrawing(id), true);
  designRock.append(clam);
  workflowRock.append(hermit);
  creativeRock.append(starfish, smallStarfish);

  const nodes = [starfish, smallStarfish, hermit, clam];
  const residentFish = [];
  const bubblePlumes = [];
  rocks.forEach((rock, rockIndex) => {
    const population = fishPopulations[rockIndex] || fishPopulations.at(-1);
    for (let slot = 1; slot <= population.length; slot += 1) {
      const species = population[slot - 1];
      const fish = decoration('butterfly', `<div class="skill-reef__swimmer skill-reef__swimmer--butterfly">${fishSpecimen(species)}</div>`);
      fish.classList.add('skill-reef__resident-fish');
      fish.dataset.habitatIndex = String(rockIndex);
      fish.dataset.fishSlot = String(slot);
      fish.dataset.fishSpecies = species;
      fish.dataset.fishPattern = species === 'butterfly' || species === 'angelfish'
        ? 'striped' : species === 'goby' ? 'spotted' : 'plain';
      rock.append(fish);
      residentFish.push({ node: fish, host: rock, index: residentFish.length });
      nodes.push(fish);
    }
    const sizes = [5, 8, 6, 10, 7, 12, 5, 9, 6, 11, 8, 13];
    const plume = decoration('bubble-plume', sizes.map((size, bubbleIndex) => (
      `<span class="skill-reef__air-bubble" data-bubble-source="${bubbleIndex % 3 + 1}" data-bubble-index="${bubbleIndex}" style="--bubble-size:${size}px"></span>`
    )).join(''));
    plume.dataset.habitatIndex = String(rockIndex);
    rock.append(plume);
    bubblePlumes.push({ node: plume, host: rock, index: rockIndex });
    nodes.push(plume);
  });

  const habitats = new Map();
  const renderers = [];
  const stateRenderers = [];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false;
  let sceneVisible = false;
  let resizeFrame = 0;

  function habitat(host) {
    if (!habitats.has(host)) habitats.set(host, {
      host, visible: false, width: host.clientWidth, height: host.clientHeight, animations: [], nodes: [],
    });
    return habitats.get(host);
  }
  for (const [host, inhabitants] of [
    [designRock, [clam]], [workflowRock, [hermit]],
    [creativeRock, [starfish, smallStarfish]],
  ]) habitat(host).nodes.push(...inhabitants);
  residentFish.forEach(({ node, host }) => habitat(host).nodes.push(node));
  bubblePlumes.forEach(({ node, host }) => habitat(host).nodes.push(node));

  function addInspectionRoute({ node, host, index }) {
    const environment = habitat(host);
    const clock = { phase: 0 };
    const swimmer = node.firstElementChild;
    const variation = index % 3;
    const mirror = index % 2 ? -1 : 1;
    const points = [[0, 0], [-.55, .12], [-.74, .32], [-.23, .45], [.42, .08], [.6, -.27], [.13, -.12]]
      .map(([x, y]) => [x * mirror, y * (index % 2 ? -1 : 1)]);
    const setX = gsap.quickSetter(node, 'x', 'px');
    const setY = gsap.quickSetter(node, 'y', 'px');
    let facing = 1;
    let desiredFacing = 1;
    let lastTime = 0;
    const render = (immediate = false) => {
      if (disposed) return;
      const [x, y] = closedCurve(points, clock.phase);
      const [nextX, nextY] = closedCurve(points, clock.phase + .0005);
      const radiusX = Math.min(32, Math.max(16, environment.width * (.055 + variation * .009)));
      const radiusY = Math.min(20, Math.max(9, environment.height * (.018 + variation * .003)));
      const dx = (nextX - x) * radiusX;
      const dy = (nextY - y) * radiusY;
      if (Math.abs(dx) > .0005) desiredFacing = dx > 0 ? -1 : 1;
      const now = performance.now();
      const elapsed = Math.min(50, Math.max(16, now - lastTime || 16));
      lastTime = now;
      facing = immediate ? desiredFacing : facing + (desiredFacing - facing) * (1 - Math.exp(-elapsed / 780));
      const pitch = Math.atan2(desiredFacing > 0 ? -dy : dy, Math.abs(dx)) * 180 / Math.PI;
      const safeX = Math.min(environment.width - node.offsetLeft - node.offsetWidth - 2, Math.max(2 - node.offsetLeft, x * radiusX));
      const safeY = Math.min(environment.height - node.offsetTop - node.offsetHeight - 2, Math.max(2 - node.offsetTop, y * radiusY));
      setX(Math.round(safeX * 10) / 10);
      setY(Math.round(safeY * 10) / 10);
      swimmer.style.transform = `rotate(${Math.max(-12, Math.min(12, pitch)).toFixed(2)}deg) scaleX(${facing.toFixed(4)})`;
    };
    const animation = gsap.timeline({ paused: true, repeat: -1, onUpdate: render });
    points.forEach((_, pointIndex) => {
      animation.to(clock, {
        phase: (pointIndex + 1) / points.length,
        duration: 4.4 + ((pointIndex + index * 2) % 4) * .85,
        ease: 'sine.inOut',
      });
      // A fish slows at a branch, examines it, and only then changes direction.
      if (pointIndex === 1 || pointIndex === 3 || pointIndex === 5) {
        animation.to(clock, { duration: 1.6 + ((index + pointIndex) % 3) * .55 });
      }
    });
    animation.totalTime(animation.duration() * ((index * .173 + .09) % 1));
    render(true);
    environment.animations.push(animation);
    renderers.push(() => render(true));
  }
  residentFish.forEach(addInspectionRoute);

  bubblePlumes.forEach(({ node, host, index: plumeIndex }) => {
    const environment = habitat(host);
    [...node.children].forEach((bubble, index) => {
      const startPhase = (index / node.children.length + plumeIndex * .113 + .07) % 1;
      const clock = { phase: startPhase };
      const drift = (index % 2 ? -1 : 1) * (16 + (index % 3) * 4);
      const setX = gsap.quickSetter(bubble, 'x', 'px');
      const setY = gsap.quickSetter(bubble, 'y', 'px');
      const setScale = gsap.quickSetter(bubble, 'scale');
      const setOpacity = gsap.quickSetter(bubble, 'opacity');
      const render = () => {
        if (disposed) return;
        const reduced = motionPreference.matches;
        const progress = reduced ? .29 + (index % 3) * .19 : clock.phase % 1;
        const rise = Math.min(240, Math.max(120, environment.height * (.29 + (index % 3) * .025)));
        // A single broad current bends each ascent; there is no oscillation or per-frame noise.
        setX(cubicPoint(0, drift * .12, drift * .64, drift, progress));
        setY(cubicPoint(0, -rise * .26, -rise * .7, -rise, progress));
        setScale(.65 + Math.min(1, progress) * .4);
        const entry = Math.min(1, progress / .1);
        const exit = Math.min(1, Math.max(0, (1 - progress) / .22));
        setOpacity(reduced && index > 2 ? 0 : (.5 + index % 3 * .06) * entry * exit);
      };
      const animation = gsap.to(clock, {
        phase: startPhase + 1, duration: 12.8 + (index % 4) * 1.35 + plumeIndex * .6,
        repeat: -1, ease: 'none', paused: true, onUpdate: render,
      });
      render();
      environment.animations.push(animation);
      renderers.push(render);
      stateRenderers.push(render);
    });
  });

  const hermitWalk = hermit.querySelector('.skill-reef__hermit-walk');
  const hermitMotion = gsap.timeline({ repeat: -1, paused: true });
  hermitMotion
    .to(hermitWalk, { x: 0, y: 0, duration: 7.2 })
    .to(hermitWalk, { x: 3, y: -.6, duration: .8, ease: 'sine.inOut' })
    .to(hermitWalk, { x: 6, y: .2, duration: .95, ease: 'sine.inOut' }, '+=.45')
    .to(hermitWalk, { x: 10, y: -.5, duration: .9, ease: 'sine.inOut' }, '+=.35')
    .to(hermitWalk, { x: 6, y: .1, duration: 1.05, ease: 'sine.inOut' }, '+=13.8')
    .to(hermitWalk, { x: 2.5, y: -.4, duration: .9, ease: 'sine.inOut' }, '+=.5')
    .to(hermitWalk, { x: 0, y: 0, duration: 1.1, ease: 'sine.inOut' }, '+=.4');
  habitat(workflowRock).animations.push(hermitMotion);

  const clamButton = clam.querySelector('.skill-reef__clam');
  const clamNote = clam.querySelector('.skill-reef__clam-note');
  const clamClose = clam.querySelector('.skill-reef__clam-close');
  let clamOpen = false;
  const setClamOpen = (open, restoreFocus = false) => {
    clamOpen = open;
    clam.classList.toggle('is-clam-open', open);
    clamButton.setAttribute('aria-expanded', String(open));
    clamButton.setAttribute('aria-label', open ? '조개 닫기' : '조개 열어보기');
    clamNote.hidden = !open;
    if (!open && restoreFocus) clamButton.focus({ preventScroll: true });
  };
  const toggleClam = () => setClamOpen(!clamOpen);
  const closeClam = () => setClamOpen(false, clamNote.contains(document.activeElement));
  const onEscape = (event) => {
    if (event.key === 'Escape' && clamOpen) setClamOpen(false, clam.contains(document.activeElement));
  };
  clamButton.addEventListener('click', toggleClam);
  clamClose.addEventListener('click', closeClam);
  document.addEventListener('keydown', onEscape);

  function syncActivity() {
    if (disposed) return;
    const reduced = motionPreference.matches;
    const active = sceneVisible && !document.hidden;
    scene.classList.toggle('is-reef-life-active', active && !reduced);
    scene.dataset.reefLifeMotion = reduced ? 'reduced' : active ? 'running' : 'paused';
    for (const environment of habitats.values()) {
      const running = active && environment.visible && !reduced;
      environment.nodes.forEach((node) => { node.dataset.lifeActive = String(running); });
      environment.animations.forEach((animation) => running ? animation.resume() : animation.pause());
    }
    stateRenderers.forEach((render) => render());
  }
  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === scene) sceneVisible = entry.isIntersecting;
        if (habitats.has(entry.target)) habitats.get(entry.target).visible = entry.isIntersecting;
      }
      syncActivity();
    }, { rootMargin: '70px', threshold: 0 })
    : null;
  if (observer) {
    observer.observe(scene);
    habitats.forEach(({ host }) => observer.observe(host));
  } else {
    sceneVisible = true;
    habitats.forEach((environment) => { environment.visible = true; });
  }
  const measure = () => {
    resizeFrame = 0;
    if (disposed) return;
    habitats.forEach((environment) => {
      environment.width = environment.host.clientWidth;
      environment.height = environment.host.clientHeight;
    });
    renderers.forEach((render) => render());
  };
  const queueMeasure = () => {
    if (!resizeFrame && !disposed) resizeFrame = requestAnimationFrame(measure);
  };
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(queueMeasure) : null;
  habitats.forEach(({ host }) => resizeObserver?.observe(host));
  window.addEventListener('resize', queueMeasure, { passive: true });
  document.addEventListener('visibilitychange', syncActivity);
  motionPreference.addEventListener('change', syncActivity);
  syncActivity();

  return () => {
    disposed = true;
    observer?.disconnect();
    resizeObserver?.disconnect();
    cancelAnimationFrame(resizeFrame);
    habitats.forEach((environment) => environment.animations.forEach((animation) => animation.kill()));
    document.removeEventListener('visibilitychange', syncActivity);
    document.removeEventListener('keydown', onEscape);
    motionPreference.removeEventListener('change', syncActivity);
    window.removeEventListener('resize', queueMeasure);
    clamButton.removeEventListener('click', toggleClam);
    clamClose.removeEventListener('click', closeClam);
    scene.classList.remove('is-reef-life-active');
    delete scene.dataset.reefLifeMotion;
    nodes.forEach((node) => node.remove());
  };
}
