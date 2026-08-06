import { getCopy, getProjects, skills, stack, type Locale } from './content';

export type SceneSection = 'hero' | 'about' | 'services' | 'projects' | 'process' | 'skills' | 'contact';

/** Spatial arrangement the scene layer uses to place the nodes of a section. */
export type Formation = 'swarm' | 'pillars' | 'ring' | 'ellipse' | 'spiral' | 'lattice' | 'collapse';

export interface SceneNode {
  id: string;
  label: string;
  /** CSS selector of the DOM element this node stands for. */
  target: string;
  /** Project id when selecting the node should open the case overlay instead. */
  projectId?: string;
  /** Hex accent for this node; falls back to the scene gradient when absent. */
  color?: string;
  /** 0..1 — formations that encode magnitude use this as a radius factor. */
  weight: number;
}

export interface SectionScene {
  formation: Formation;
  nodes: SceneNode[];
}

/** Locale-independent skill ranking, keyed by the English level label. */
const skillWeights: Record<string, number> = {
  Expert: 1,
  Advanced: 0.68,
  Comfortable: 0.42,
};

/**
 * Node descriptors for every section, derived from the existing content
 * registry so the scene never carries copy of its own.
 */
export function sectionScenes(locale: Locale): Record<SceneSection, SectionScene> {
  const copy = getCopy(locale);
  const cards = copy.about.cards;
  // `copy` is a const-asserted per-locale union, so widen to the fields used here
  const services: readonly { title: string }[] = copy.services;
  const process: readonly { num: string; title: string }[] = copy.process;

  return {
    hero: {
      formation: 'swarm',
      nodes: stack.map((tech, index) => ({
        id: `stack-${index}`,
        label: tech,
        target: `#about-stack .chip:nth-child(${index + 1})`,
        weight: 0.6,
      })),
    },
    about: {
      formation: 'pillars',
      nodes: [cards.performance, cards.creativity, cards.architecture].map((card, index) => ({
        id: `about-${index}`,
        label: card.title,
        target: `.about__cards .about__card:nth-child(${index + 1})`,
        weight: 1,
      })),
    },
    services: {
      formation: 'ring',
      nodes: services.map((service, index) => ({
        id: `service-${index}`,
        label: service.title,
        target: `#services-grid .service:nth-child(${index + 1})`,
        weight: 0.85,
      })),
    },
    projects: {
      formation: 'ellipse',
      nodes: getProjects(locale).map((project) => ({
        id: `project-${project.id}`,
        label: project.title,
        target: `[data-project="${project.id}"]`,
        projectId: project.id,
        color: project.glow,
        weight: 1,
      })),
    },
    process: {
      formation: 'spiral',
      nodes: process.map((step, index) => ({
        id: `process-${index}`,
        label: `${step.num} · ${step.title}`,
        target: `#process-grid .step:nth-child(${index + 1})`,
        weight: 0.8,
      })),
    },
    skills: {
      formation: 'lattice',
      nodes: skills.map((skill, index) => ({
        id: `skill-${index}`,
        label: `${skill.name} · ${skill.level[locale]}`,
        target: `#skills-grid .skill:nth-child(${index + 1})`,
        weight: skillWeights[skill.level.en] ?? 0.5,
      })),
    },
    contact: { formation: 'collapse', nodes: [] },
  };
}
