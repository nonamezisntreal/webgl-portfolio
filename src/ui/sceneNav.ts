import type { NodePointer } from '../webgl/Experience';
import { scrollToElement } from './scroll';

const HIGHLIGHT_MS = 1400;

export interface SceneNav {
  hover(pointer: NodePointer | null): void;
  select(pointer: NodePointer): void;
}

/**
 * Bridges the interactive scene layer to the DOM: labels the hovered node and
 * turns a selection into ordinary page navigation. The scene is a shortcut —
 * every destination stays reachable by scrolling and by keyboard.
 */
export function initSceneNav(reducedMotion: boolean, onRelease: () => void): SceneNav {
  const tip = document.createElement('div');
  tip.className = 'scene-tip';
  tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);

  const cursor = document.getElementById('cursor');
  const overlay = document.getElementById('case');
  let highlighted: HTMLElement | null = null;
  let highlightTimer = 0;
  let label = '';
  let halfWidth = 0;

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
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    onRelease();
    clearHighlight();
    hide();
  });

  return {
    hover(pointer) {
      if (!pointer || overlay?.classList.contains('case--open')) {
        hide();
        return;
      }
      // the label only changes when the hovered node does; measuring is a forced layout
      if (pointer.node.label !== label) {
        label = pointer.node.label;
        tip.textContent = label;
        halfWidth = tip.offsetWidth / 2;
      }

      // keep the label inside the viewport even for nodes near an edge
      const x = Math.min(Math.max(pointer.x, halfWidth + 12), window.innerWidth - halfWidth - 12);
      const y = Math.max(pointer.y, 72);
      tip.style.transform = `translate(${Math.round(x - halfWidth)}px, ${Math.round(y)}px)`;
      tip.classList.add('scene-tip--visible');
      cursor?.classList.add('cursor--node');
    },

    select(pointer) {
      const target = document.querySelector<HTMLElement>(pointer.node.target);
      if (!target) return;

      // project nodes reuse the existing case-study overlay
      if (pointer.node.projectId) {
        target.click();
        return;
      }

      scrollToElement(target, reducedMotion);
      highlight(target);
    },
  };
}
