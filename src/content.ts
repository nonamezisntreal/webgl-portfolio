/**
 * ─────────────────────────────────────────────────────────────
 *  CONTENT CONFIG — edit everything about *you* in this file.
 *  No need to touch the WebGL or UI code to personalize the site.
 * ─────────────────────────────────────────────────────────────
 */

export type Locale = 'ru' | 'en';

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  tech: string[];
  year: string;
  /** Accent hue used for the card glow (CSS color) */
  glow: string;
  /** Extended case study shown in the overlay */
  caseStudy: {
    challenge: string;
    solution: string;
    highlights: string[];
    link?: string;
  };
}

export const profile = {
  name: 'Hazard',
  role: {
    ru: 'Full-stack разработчик',
    en: 'Full-stack Developer',
  },
  email: 'nikita04tar@gmail.com',
  github: 'https://github.com/nonamezisntreal',
  telegram: 'https://t.me/JustNikitafornow',
};

export const stack = [
  'TypeScript',
  'WebGL',
  'GLSL',
  'Three.js',
  'React',
  'C#',
  '.NET',
  'ASP.NET Core',
  'Node.js',
  'Vite',
  'PostgreSQL',
  'SQL Server',
];

export const skills: { name: string; level: Record<Locale, string>; icon: string }[] = [
  { name: 'WebGL / WebGPU', level: { ru: 'Эксперт', en: 'Expert' }, icon: '◈' },
  { name: 'GLSL Shaders', level: { ru: 'Эксперт', en: 'Expert' }, icon: '✦' },
  { name: 'Three.js', level: { ru: 'Эксперт', en: 'Expert' }, icon: '▲' },
  { name: 'TypeScript', level: { ru: 'Продвинутый', en: 'Advanced' }, icon: '⌬' },
  { name: 'React', level: { ru: 'Продвинутый', en: 'Advanced' }, icon: '⟁' },
  { name: 'C# / .NET', level: { ru: 'Продвинутый', en: 'Advanced' }, icon: '#' },
  { name: 'ASP.NET Core', level: { ru: 'Уверенно', en: 'Comfortable' }, icon: '◎' },
  { name: 'Node.js', level: { ru: 'Продвинутый', en: 'Advanced' }, icon: '⬢' },
  { name: 'Creative Coding', level: { ru: 'Эксперт', en: 'Expert' }, icon: '∿' },
  { name: 'Performance', level: { ru: 'Эксперт', en: 'Expert' }, icon: '⚡' },
  { name: 'Motion Design', level: { ru: 'Продвинутый', en: 'Advanced' }, icon: '◐' },
  { name: 'CI / DevOps', level: { ru: 'Уверенно', en: 'Comfortable' }, icon: '⛭' },
];

export const copy = {
  ru: {
    meta: {
      title: 'Hazard — Full-stack разработчик',
      description:
        'Full-stack разработчик: интерактивные WebGL-интерфейсы, ASP.NET/React-продукты и аккуратная инженерная архитектура.',
    },
    loaderLabel: 'инициализация experience',
    nav: {
      about: 'Обо мне',
      projects: 'Проекты',
      skills: 'Навыки',
      contact: 'Контакты',
      cta: 'Связаться',
    },
    hero: {
      eyebrow: 'доступен для проектов',
      line1: 'Full-stack',
      line2: 'Developer',
      tagline:
        'Создаю full-stack продукты, интерактивные WebGL-сцены и интерфейсы, которые ощущаются <em>живыми</em>.',
      primary: 'Смотреть проекты',
      secondary: 'Связаться',
      scroll: 'скролль, чтобы исследовать',
      meta: 'UTC+05 · удалённо',
    },
    about: {
      title: 'Обо мне',
      lead:
        'Я <strong>Hazard</strong> — full-stack разработчик, которому важно место, где инженерия встречается с визуальным опытом.',
      body:
        'Делаю веб-продукты от серверной логики до интерфейса: ASP.NET/C#, React/TypeScript, базы данных, realtime UI и WebGL. Люблю, когда архитектура, производительность и визуальный стиль работают как единая система.',
      quote: '“Сайт не должен просто читаться. Он должен ощущаться.”',
      cards: {
        performance: {
          title: 'Производительность',
          text: '60fps — база, а не цель. Профилирование, батчинг, аккуратный рендер и быстрый UX.',
        },
        creativity: {
          title: 'Интерактив',
          text: 'WebGL, свет, физика, микродвижение и живые реакции интерфейса на действия пользователя.',
        },
        architecture: {
          title: 'Архитектура',
          text: 'Модульный, типизированный, масштабируемый код — UI, backend и render loop не мешают друг другу.',
        },
      },
    },
    projectsTitle: 'Работы',
    skillsTitle: 'Навыки & стек',
    contact: {
      title: 'Контакты',
      pitch: 'Есть идея, которая должна<br /><span class="accent-gradient">ощущаться живой?</span>',
      text: 'Открыт к проектам, коллаборациям и full-time возможностям.',
      labels: { email: 'Email', github: 'GitHub', telegram: 'Telegram' },
      form: {
        name: 'Имя',
        email: 'Email',
        message: 'Сообщение',
        namePlaceholder: 'Ваше имя',
        emailPlaceholder: 'you@email.com',
        messagePlaceholder: 'Расскажите о проекте…',
        submit: 'Отправить',
        sent: '✦ Открываю почтовый клиент…',
        subject: 'Запрос с портфолио от',
      },
    },
    footer: {
      built: 'Собрано на Three.js & TypeScript',
      top: 'Наверх ↑',
    },
    caseLabels: {
      challenge: 'Задача',
      solution: 'Решение',
      highlights: 'Что внутри',
      link: 'Открыть проект ↗',
      open: 'Открыть кейс:',
    },
    projects: [
      {
        id: 'nooslib',
        title: 'Nooslib',
        tagline: 'Цифровая библиотека для чтения DJVU-книг онлайн',
        description:
          'Production-платформа на ASP.NET Core: онлайн-читалка DJVU с конвертацией страниц в WebP, Redis-кэшированием, SEO-оптимизацией и Docker-инфраструктурой.',
        tech: ['ASP.NET Core', '.NET 10', 'EF Core', 'SQL Server', 'Redis', 'Docker', 'Nginx'],
        year: '2026',
        glow: '#22d3ee',
        caseStudy: {
          challenge:
            'Читать тяжёлые DJVU-книги прямо в браузере быстро: мгновенная отдача текущей страницы, предзагрузка соседних и индексируемый поисковиками контент.',
          solution:
            'Конвейер DjVuLibre рендерит страницы в WebP с файловым кэшем, Redis + IMemoryCache ускоряют метаданные, фоновые сервисы прегенерируют страницы и извлекают текст, а Docker Compose (web, db, redis, nginx, certbot) обеспечивает деплой на VPS.',
          highlights: [
            'Онлайн-читалка: страница всегда реальная — из кэша или генерации на лету',
            'Роли User/Moderator/Admin, загрузка книг, закладки, история чтения',
            'SEO: Schema.org, Open Graph, sitemap, читаемые URL и серверный вывод текста',
          ],
        },
      },
      {
        id: 'itstudent',
        title: 'ITstudent',
        tagline: 'Образовательная платформа для изучения программирования',
        description:
          'ASP.NET Core MVC-приложение с курсами по Python, JavaScript и C#: страницы теории, практические задания, результаты и динамическая работа со стилями.',
        tech: ['ASP.NET Core', 'C#', '.NET 9', 'EF Core', 'SQL Server', 'SCSS', 'JavaScript'],
        year: '2025',
        glow: '#67e8f9',
        caseStudy: {
          challenge:
            'Собрать учебный сайт, где пользователь может выбрать язык, пройти темы, открыть теорию и перейти к практическим заданиям без перегруженного интерфейса.',
          solution:
            'Реализована MVC-структура на ASP.NET Core: HomeController маршрутизирует курсы и разделы, подключён EF Core/SQL Server, session state, компиляция SCSS через SharpScss и отдельные представления для тем, теории, упражнений и результата.',
          highlights: [
            'Курсы по Python, JavaScript и C# с отдельными сценариями и страницами',
            'Практические quiz-экраны и страница результата',
            'SCSS → CSS pipeline внутри приложения и кастомные интерактивные JS-эффекты',
          ],
          link: 'https://github.com/nonamezisntreal/ITstudent',
        },
      },
      {
        id: 'webgl-portfolio',
        title: 'WebGL Portfolio',
        tagline: 'Интерактивный landing-experience на Three.js',
        description:
          'Портфолио с живой WebGL-сценой, кастомными GLSL-шейдерами, scroll-driven анимациями, мультиязычностью и премиальным тёмным UI.',
        tech: ['TypeScript', 'Three.js', 'GLSL', 'Vite', 'Lenis', 'GitHub Pages'],
        year: '2026',
        glow: '#a78bfa',
        caseStudy: {
          challenge:
            'Сделать не просто лендинг, а атмосферный experience: WebGL должен быть заметным, но не мешать чтению и контактам.',
          solution:
            'UI и WebGL разделены по слоям: Three.js грузится лениво, сцена реагирует на мышь/скролл, bloom приглушается на контентных секциях, а текст и проекты вынесены в один конфиг.',
          highlights: [
            'Шейдерное энергетическое ядро, частицы, орбиты и light trails',
            'Локализация RU/EN без перезагрузки страницы',
            'Деплой на GitHub Pages через gh-pages branch',
          ],
          link: 'https://github.com/nonamezisntreal/webgl-portfolio',
        },
      },
    ] satisfies Project[],
  },
  en: {
    meta: {
      title: 'Hazard — Full-stack Developer',
      description:
        'Full-stack developer crafting interactive WebGL interfaces, ASP.NET/React products and clean engineering architecture.',
    },
    loaderLabel: 'initializing experience',
    nav: {
      about: 'About',
      projects: 'Projects',
      skills: 'Skills',
      contact: 'Contact',
      cta: "Let's talk",
    },
    hero: {
      eyebrow: 'available for projects',
      line1: 'Full-stack',
      line2: 'Developer',
      tagline:
        'I build full-stack products, interactive WebGL scenes and interfaces that feel <em>alive</em>.',
      primary: 'View Work',
      secondary: 'Get in touch',
      scroll: 'scroll to explore',
      meta: 'UTC+05 · remote-friendly',
    },
    about: {
      title: 'About',
      lead:
        "I'm <strong>Hazard</strong> — a full-stack developer focused on the point where engineering meets visual experience.",
      body:
        'I build web products from backend logic to interface: ASP.NET/C#, React/TypeScript, databases, realtime UI and WebGL. I care about architecture, performance and visual direction working as one system.',
      quote: '“A site shouldn’t just be read. It should be felt.”',
      cards: {
        performance: {
          title: 'Performance',
          text: '60fps is the baseline, not the goal. Profiling, batching, careful rendering and fast UX.',
        },
        creativity: {
          title: 'Interaction',
          text: 'WebGL, light, physics, micro-motion and interfaces that react to every user action.',
        },
        architecture: {
          title: 'Architecture',
          text: 'Modular, typed, scalable code — UI, backend and render loop never fight each other.',
        },
      },
    },
    projectsTitle: 'Selected Work',
    skillsTitle: 'Skills & Tech',
    contact: {
      title: 'Contact',
      pitch: 'Have an idea that needs<br /><span class="accent-gradient">to feel alive?</span>',
      text: 'Open to projects, collaborations and full-time opportunities.',
      labels: { email: 'Email', github: 'GitHub', telegram: 'Telegram' },
      form: {
        name: 'Name',
        email: 'Email',
        message: 'Message',
        namePlaceholder: 'Your name',
        emailPlaceholder: 'you@email.com',
        messagePlaceholder: 'Tell me about your project…',
        submit: 'Send message',
        sent: '✦ Opening your mail client…',
        subject: 'Portfolio inquiry from',
      },
    },
    footer: {
      built: 'Built with Three.js & TypeScript',
      top: 'Back to top ↑',
    },
    caseLabels: {
      challenge: 'The challenge',
      solution: 'The solution',
      highlights: 'Highlights',
      link: 'Visit project ↗',
      open: 'Open case study:',
    },
    projects: [
      {
        id: 'nooslib',
        title: 'Nooslib',
        tagline: 'Digital library for reading DJVU books online',
        description:
          'A production ASP.NET Core platform: an online DJVU reader with WebP page conversion, Redis caching, SEO optimization and a Docker-based infrastructure.',
        tech: ['ASP.NET Core', '.NET 10', 'EF Core', 'SQL Server', 'Redis', 'Docker', 'Nginx'],
        year: '2026',
        glow: '#22d3ee',
        caseStudy: {
          challenge:
            'Make heavy DJVU books readable right in the browser, fast: instant delivery of the current page, preloading of neighbours and content search engines can index.',
          solution:
            'A DjVuLibre pipeline renders pages to WebP with a file cache, Redis + IMemoryCache speed up metadata, background services pre-generate pages and extract text, and Docker Compose (web, db, redis, nginx, certbot) handles VPS deployment.',
          highlights: [
            'Online reader: the page is always real — served from cache or generated on the fly',
            'User/Moderator/Admin roles, book uploads, bookmarks, reading history',
            'SEO: Schema.org, Open Graph, sitemap, readable URLs and server-side text output',
          ],
        },
      },
      {
        id: 'itstudent',
        title: 'ITstudent',
        tagline: 'Educational platform for learning programming',
        description:
          'An ASP.NET Core MVC app with courses for Python, JavaScript and C#: theory pages, practice exercises, results and dynamic style handling.',
        tech: ['ASP.NET Core', 'C#', '.NET 9', 'EF Core', 'SQL Server', 'SCSS', 'JavaScript'],
        year: '2025',
        glow: '#67e8f9',
        caseStudy: {
          challenge:
            'Create a learning site where users can choose a language, browse topics, read theory and move into practice without a heavy interface.',
          solution:
            'Built an ASP.NET Core MVC structure: HomeController routes courses and sections, EF Core/SQL Server is configured, session state is enabled, SCSS is compiled through SharpScss and separate views cover topics, theory, exercises and results.',
          highlights: [
            'Python, JavaScript and C# course flows with dedicated pages',
            'Practice quiz screens and a results page',
            'SCSS → CSS pipeline inside the app plus custom JS interactions',
          ],
          link: 'https://github.com/nonamezisntreal/ITstudent',
        },
      },
      {
        id: 'webgl-portfolio',
        title: 'WebGL Portfolio',
        tagline: 'Interactive landing experience powered by Three.js',
        description:
          'A portfolio with a living WebGL scene, custom GLSL shaders, scroll-driven animation, language switching and a premium dark interface.',
        tech: ['TypeScript', 'Three.js', 'GLSL', 'Vite', 'Lenis', 'GitHub Pages'],
        year: '2026',
        glow: '#a78bfa',
        caseStudy: {
          challenge:
            'Build more than a landing page: a cinematic experience where WebGL feels central without hurting readability or contact conversion.',
          solution:
            'Separated UI and WebGL layers: Three.js lazy-loads, the scene reacts to pointer and scroll, bloom calms down in content sections and copy/projects live in one editable config.',
          highlights: [
            'Shader-driven energy core, particles, orbit rings and light trails',
            'RU/EN localization without a page reload',
            'GitHub Pages deployment through a gh-pages branch',
          ],
          link: 'https://github.com/nonamezisntreal/webgl-portfolio',
        },
      },
    ] satisfies Project[],
  },
} as const;

export function getCopy(locale: Locale) {
  return copy[locale];
}

export function getProjects(locale: Locale): Project[] {
  return copy[locale].projects as Project[];
}
