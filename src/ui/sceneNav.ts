import type { SceneSection, SectionScene } from '../scene-nodes';
import type { NodePointer } from '../webgl/Experience';
import { scrollToElement } from './scroll';

const HIGHLIGHT_MS = 1400;
/** Idle window before the scene demonstrates itself once, and how long it holds. */
const DEMO_DELAY_MS = 3000;
const DEMO_HOLD_MS = 1300;
/** Travel time of the signal from the node to the element it selected. */
const PULSE_MS = 700;
/** Where the smooth scroll parks the target: see scrollToElement. */
const SCROLL_OFFSET = 90;
/** Anything here means the visitor is exploring on their own already. */
const ACTIVITY_EVENTS = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;

export interface SceneGuideCopy {
  title: string;
  pointer: string;
  touch: string;
  action: string;
  hover: string;
  selected: string;
  tip: string;
}

export interface SceneNav {
  hover(pointer: NodePointer | null): void;
  select(pointer: NodePointer): void;
  setSection(name: string): void;
  dispose(): void;
}

export interface SceneNavOptions {
  reducedMotion: boolean;
  scenes: Record<SceneSection, SectionScene>;
  guideCopy: SceneGuideCopy;
  /** Let the scene drop its node focus, e.g. when Escape is pressed. */
  onRelease: () => void;
  /** Report the node a hovered card stands for, or null when the pointer leaves. */
  onDomHover: (id: string | null) => void;
  /** Ask the scene to point one node out; false means it had nothing to show. */
  onHint: (active: boolean) => boolean;
}

interface SceneTargets {
  /** Element the pointer may enter → the node that stands for it. */
  byElement: Map<Element, string>;
  /** Node id → the element it points at. */
  byId: Map<string, HTMLElement>;
}

function assertSceneTargets(scenes: Record<SceneSection, SectionScene>): SceneTargets {
  const usedTargets = new Map<string, string>();
  const byElement = new Map<Element, string>();
  const byId = new Map<string, HTMLElement>();

  for (const scene of Object.values(scenes)) {
    for (const node of scene.nodes) {
      const previousNode = usedTargets.get(node.target);
      if (previousNode) {
        throw new Error(`Scene target '${node.target}' is shared by '${previousNode}' and '${node.id}'.`);
      }
      usedTargets.set(node.target, node.id);

      const matches = document.querySelectorAll<HTMLElement>(node.target);
      if (matches.length !== 1) {
        throw new Error(`Scene target '${node.target}' for '${node.id}' resolved to ${matches.length} elements.`);
      }

      const element = matches[0];
      const owner = byElement.get(element);
      if (owner) {
        throw new Error(`Scene nodes '${owner}' and '${node.id}' resolve to the same element.`);
      }
      byElement.set(element, node.id);
      byId.set(node.id, element);
    }
  }

  return { byElement, byId };
}

function textSpan(className: string, text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

/**
 * Bridges the interactive scene layer to the DOM: labels the hovered node and
 * turns a selection into ordinary page navigation. The scene is a shortcut —
 * every destination stays reachable by scrolling and by keyboard.
 */
export function initSceneNav({
  reducedMotion,
  scenes,
  guideCopy,
  onRelease,
  onDomHover,
  onHint,
}: SceneNavOptions): SceneNav {
  const targets = assertSceneTargets(scenes);

  const pulse = document.createElement('div');
  pulse.className = 'scene-pulse';
  pulse.setAttribute('aria-hidden', 'true');

  const tip = document.createElement('div');
  tip.className = 'scene-tip';
  tip.dataset.action = guideCopy.tip;
  tip.setAttribute('aria-hidden', 'true');

  const guide = document.createElement('div');
  guide.className = 'scene-guide';
  guide.setAttribute('aria-hidden', 'true');

  const guideBeacon = textSpan('scene-guide__beacon', '');
  const guideCopyRoot = textSpan('scene-guide__copy', '');
  const guideTitle = textSpan('scene-guide__title', guideCopy.title);
  const guidePointer = textSpan('scene-guide__instruction scene-guide__instruction--pointer', guideCopy.pointer);
  const guideTouch = textSpan('scene-guide__instruction scene-guide__instruction--touch', guideCopy.touch);
  const guideAction = textSpan('scene-guide__action', guideCopy.action);
  const guideArrow = textSpan('scene-guide__arrow', '↖');
  guideCopyRoot.append(guideTitle, guidePointer, guideTouch, guideAction);
  guide.append(guideBeacon, guideCopyRoot, guideArrow);

  document.body.append(tip, guide, pulse);

  const cursor = document.getElementById('cursor');
  const overlay = document.getElementById('case');
  let highlighted: HTMLElement | null = null;
  let highlightTimer = 0;
  let highlightDelay = 0;
  let linked: HTMLElement | null = null;
  let linkedId: string | null = null;
  let label = '';
  let halfWidth = 0;
  let activeSection = 'hero';
  let disposed = false;

  /** Scene → DOM: mark the card the hovered node stands for. */
  const setLinked = (element: HTMLElement | null): void => {
    if (linked === element) return;
    linked?.classList.remove('is-scene-linked');
    linked = element;
    element?.classList.add('is-scene-linked');
  };

  const resetGuide = (): void => {
    guide.classList.remove('scene-guide--active', 'scene-guide--selected');
    guideAction.textContent = guideCopy.action;
  };

  const clearHighlight = (): void => {
    window.clearTimeout(highlightDelay);
    window.clearTimeout(highlightTimer);
    highlighted?.classList.remove('is-scene-target');
    highlighted = null;
  };

  const highlight = (element: HTMLElement): void => {
    clearHighlight();
    highlighted = element;
    element.classList.add('is-scene-target');
    highlightTimer = window.setTimeout(clearHighlight, HIGHLIGHT_MS);
  };

  /** The target announces itself when the signal reaches it, not before. */
  const announce = (element: HTMLElement, delay: number): void => {
    clearHighlight();
    highlightDelay = window.setTimeout(() => highlight(element), delay);
  };

  const hide = (): void => {
    tip.classList.remove('scene-tip--visible', 'scene-tip--hint');
    cursor?.classList.remove('cursor--node');
    setLinked(null);
    resetGuide();
  };

  /** DOM → scene: the card under the pointer lights up the node it belongs to. */
  const handlePointerOver = (event: PointerEvent): void => {
    if (disposed) return;
    const element = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-scene-target], [data-project]')
      : null;
    const id = element ? targets.byElement.get(element) ?? null : null;
    if (id === linkedId) return;
    linkedId = id;
    onDomHover(id);
  };
  document.addEventListener('pointerover', handlePointerOver, { passive: true });

  /**
   * Send a visible signal from the node to what it selected, so the scroll
   * reads as a consequence rather than as a jump. The destination is where the
   * smooth scroll will park the target, not where the target sits right now.
   */
  const signal = (from: NodePointer, target: HTMLElement): void => {
    const rect = target.getBoundingClientRect();
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const parked = Math.min(Math.max(rect.top + window.scrollY - SCROLL_OFFSET, 0), maxScroll);
    const shift = parked - window.scrollY;
    const toX = rect.left + rect.width / 2;
    const toY = rect.top + rect.height / 2 - shift;
    const at = (x: number, y: number, scale: number): string =>
      `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${scale})`;

    pulse.animate(
      [
        { transform: at(from.x, from.y, 0.5), opacity: 0 },
        { transform: at(from.x + (toX - from.x) * 0.25, from.y + (toY - from.y) * 0.25, 1), opacity: 1, offset: 0.25 },
        { transform: at(toX, toY, 1.4), opacity: 0 },
      ],
      { duration: PULSE_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  };

  /**
   * One-time demonstration: a visitor who stays idle is shown that the layer
   * responds, once. Nothing is clicked, scrolled or faked on their behalf.
   */
  let demoTimer = 0;
  let demoHold = 0;
  let engaged = false;

  const stopDemo = (): void => {
    window.clearTimeout(demoTimer);
    window.clearTimeout(demoHold);
    onHint(false);
  };

  const handleActivity = (): void => {
    if (engaged) return;
    engaged = true;
    stopDemo();
    for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, handleActivity);
  };
  for (const type of ACTIVITY_EVENTS) window.addEventListener(type, handleActivity, { passive: true });

  demoTimer = window.setTimeout(() => {
    if (disposed || engaged || activeSection !== 'hero') return;
    if (!onHint(true)) return;
    demoHold = window.setTimeout(() => onHint(false), DEMO_HOLD_MS);
  }, DEMO_DELAY_MS);

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    onRelease();
    clearHighlight();
    hide();
  };
  document.addEventListener('keydown', handleKeydown);

  return {
    hover(pointer) {
      if (disposed) return;
      if (!pointer || overlay?.classList.contains('case--open')) {
        hide();
        return;
      }

      if (pointer.node.label !== label) {
        label = pointer.node.label;
        tip.textContent = label;
        halfWidth = tip.offsetWidth / 2;
      }

      const x = Math.min(Math.max(pointer.x, halfWidth + 12), window.innerWidth - halfWidth - 12);
      const y = Math.max(pointer.y, 72);
      tip.style.transform = `translate(${Math.round(x - halfWidth)}px, ${Math.round(y)}px)`;
      tip.classList.add('scene-tip--visible');
      // a hint is not a hover: the real cursor is elsewhere and must not react
      tip.classList.toggle('scene-tip--hint', pointer.hint === true);
      if (!pointer.hint) cursor?.classList.add('cursor--node');
      setLinked(targets.byId.get(pointer.node.id) ?? null);

      if (activeSection === 'hero') {
        guide.classList.add('scene-guide--active');
        guide.classList.remove('scene-guide--selected');
        guideAction.textContent = `${guideCopy.hover}: ${pointer.node.label}`;
      }
    },

    select(pointer) {
      if (disposed) return;
      const matches = document.querySelectorAll<HTMLElement>(pointer.node.target);
      if (matches.length !== 1) {
        throw new Error(`Scene target '${pointer.node.target}' for '${pointer.node.id}' is no longer unique.`);
      }
      const target = matches[0];

      guide.classList.remove('scene-guide--active');
      guide.classList.add('scene-guide--selected');
      guideAction.textContent = `${guideCopy.selected}: ${pointer.node.label}`;

      if (pointer.node.projectId) {
        target.click();
        return;
      }

      scrollToElement(target, reducedMotion);
      if (reducedMotion) {
        // the causal link stays, the travelling light does not
        highlight(target);
        return;
      }
      signal(pointer, target);
      announce(target, PULSE_MS * 0.75);
    },

    setSection(name) {
      if (disposed) return;
      activeSection = name;
      guide.classList.toggle('scene-guide--hidden', name !== 'hero');
      tip.classList.remove('scene-tip--visible');
      cursor?.classList.remove('cursor--node');
      if (name === 'hero') resetGuide();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('pointerover', handlePointerOver);
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, handleActivity);
      window.clearTimeout(demoTimer);
      window.clearTimeout(demoHold);
      clearHighlight();
      hide();
      tip.remove();
      guide.remove();
      pulse.remove();
    },
  };
}
