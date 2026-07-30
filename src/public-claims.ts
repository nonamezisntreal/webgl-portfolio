import type { Locale } from './content';

export const publicClaims = {
  performanceCard: {
    ru: 'Профилирование, frame budgets, адаптивная детализация и graceful fallback для слабых устройств.',
    en: 'Profiling, frame budgets, adaptive detail and graceful fallback for lower-powered devices.',
  },
  webglServiceSummary: {
    ru: 'Three.js, кастомные GLSL-шейдеры, scroll-driven сцены и микроанимации с профилированием и адаптивным render budget.',
    en: 'Three.js, custom GLSL shaders, scroll-driven scenes and micro-interactions with profiling and an adaptive render budget.',
  },
} satisfies Record<string, Record<Locale, string>>;
