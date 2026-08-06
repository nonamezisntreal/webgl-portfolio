import type { SceneSection, SectionScene } from '../scene-nodes';
import type { NodePointer } from '../webgl/Experience';
import { scrollToElement } from './scroll';

const HIGHLIGHT_MS = 1400;

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

function assertSceneTargets(scenes: Record<SceneSection, SectionScene>): void {
  const usedTargets = new Map<string, string>();
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
    }
  }
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
export function initSceneNav(
  reducedMotion: boolean,
  onRelease: () => void,
  scenes: Record<SceneSection, SectionScene>,
  guideCopy: SceneGuideCopy,
): SceneNav {
  assertSceneTargets(scenes);

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

  document.body.append(tip, guide);

  const cursor = document.getElementById('cursor');
  const overlay = document.getElementById('case');
  let highlighted: HTMLElement | null = null;
  let highlightTimer = 0;
  let label = '';
  let halfWidth = 0;
  let activeSection = 'hero';
  let disposed = false;

  const resetGuide = (): void => {
    guide.classList.remove('scene-guide--active', 'scene-guide--selected');
    guideAction.textContent = guideCopy.action;
  };

  const clearHighlight = (): void => {
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

  const hide = (): void => {
    tip.classList.remove('scene-tip--visible');
    cursor?.classList.remove('cursor--node');
    resetGuide();
  };

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
      cursor?.classList.add('cursor--node');

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
      highlight(target);
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
      clearHighlight();
      hide();
      tip.remove();
      guide.remove();
    },
  };
}
