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
    servicesTitle: 'Чем занимаюсь',
    services: [
      {
        icon: '◎',
        title: 'Веб-приложения на ASP.NET Core',
        text: 'Продуктовые MVC/API-приложения: EF Core, SQL Server, Identity, кэширование, фоновые сервисы и аккуратная доменная логика.',
      },
      {
        icon: '◈',
        title: 'Интерактивные WebGL-интерфейсы',
        text: 'Three.js, кастомные GLSL-шейдеры, scroll-driven сцены и микроанимации, которые держат стабильные 60fps.',
      },
      {
        icon: '⬢',
        title: 'Боты и автоматизация',
        text: 'Telegram-боты, парсеры и интеграции: AngleSharp, Playwright, очереди задач и доставка данных в реальном времени.',
      },
      {
        icon: '⛭',
        title: 'Инфраструктура и деплой',
        text: 'Docker Compose, Nginx, Redis, CI-сборки и продакшн-окружения на VPS — от кода до работающего сервиса.',
      },
    ],
    projectsTitle: 'Работы',
    processTitle: 'Как я работаю',
    process: [
      {
        num: '01',
        title: 'Погружение',
        text: 'Разбираю задачу, пользователей и ограничения. Фиксирую, что считается результатом, до первой строчки кода.',
      },
      {
        num: '02',
        title: 'Архитектура',
        text: 'Проектирую данные, модули и API. Решения, которые дорого менять, принимаются осознанно и на старте.',
      },
      {
        num: '03',
        title: 'Разработка',
        text: 'Итерации с работающими билдами: типизированный код, ревью собственных решений и постоянная проверка на реальных данных.',
      },
      {
        num: '04',
        title: 'Полировка',
        text: 'Производительность, анимации, edge-кейсы и детали интерфейса — то, что отличает «работает» от «ощущается».',
      },
    ],
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
        id: 'freelancebot',
        title: 'FreelanceBot',
        tagline: 'Telegram-бот и парсеры фриланс-площадок',
        description:
          'Агрегатор заказов с пяти фриланс-бирж: парсеры на AngleSharp и Playwright, доставка в Telegram, фильтры, статистика и React-панель управления.',
        tech: ['C#', '.NET', 'Telegram.Bot', 'EF Core', 'React', 'TypeScript', 'Docker'],
        year: '2026',
        glow: '#67e8f9',
        caseStudy: {
          challenge:
            'Собирать свежие заказы с разных фриланс-площадок в одном месте и мгновенно доставлять их фрилансеру в Telegram — с фильтрами, избранным и статистикой откликов.',
          solution:
            'Модульные парсеры (FL.ru, Kwork, Upwork, FreelanceHunt, Weblancer) на AngleSharp и Playwright, ядро на .NET с EF Core, бот на Telegram.Bot с inline-клавиатурами, REST API и веб-панель на React + TypeScript. Отдельно реализован SOCKS5-туннель с ручным TLS-handshake для работы Telegram API через прокси.',
          highlights: [
            'Пять парсеров площадок с единым контрактом и дедупликацией заказов',
            'Inbox, избранное, фильтры по бюджету и ключевым словам, личная статистика',
            'Кастомный SOCKS5/HTTP CONNECT туннель для Telegram API в обход блокировок',
          ],
        },
      },
      {
        id: 'online-school',
        title: 'Онлайн-школа',
        tagline: 'Веб-платформа онлайн-обучения на ASP.NET Core MVC',
        description:
          'Полноценное приложение онлайн-школы: каталог курсов, уроки с теорией и практикой, личный кабинет с прогрессом и ролевая модель студент / преподаватель / админ.',
        tech: ['ASP.NET Core MVC', 'C#', 'EF Core', 'SQL Server', 'Identity', 'Bootstrap', 'JavaScript'],
        year: '2025',
        glow: '#34d399',
        caseStudy: {
          challenge:
            'Построить платформу, где ученик проходит курс от записи до результата: смотрит уроки, выполняет задания и видит свой прогресс, а преподаватель управляет контентом без участия разработчика.',
          solution:
            'Классическая MVC-архитектура на ASP.NET Core: контроллеры курсов, уроков и кабинета, EF Core + SQL Server со связями курс → модуль → урок, ASP.NET Identity с ролями (студент, преподаватель, администратор), Razor-представления и прогресс прохождения с проверочными заданиями.',
          highlights: [
            'Каталог курсов с модулями, уроками и пошаговым прохождением',
            'Личный кабинет: прогресс, результаты заданий, история обучения',
            'Админ-панель преподавателя: создание курсов и уроков без правок кода',
          ],
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
    servicesTitle: 'What I Do',
    services: [
      {
        icon: '◎',
        title: 'ASP.NET Core web applications',
        text: 'Production MVC/API apps: EF Core, SQL Server, Identity, caching, background services and clean domain logic.',
      },
      {
        icon: '◈',
        title: 'Interactive WebGL interfaces',
        text: 'Three.js, custom GLSL shaders, scroll-driven scenes and micro-animations that hold a steady 60fps.',
      },
      {
        icon: '⬢',
        title: 'Bots & automation',
        text: 'Telegram bots, parsers and integrations: AngleSharp, Playwright, task pipelines and real-time data delivery.',
      },
      {
        icon: '⛭',
        title: 'Infrastructure & deployment',
        text: 'Docker Compose, Nginx, Redis, CI builds and production VPS environments — from code to a running service.',
      },
    ],
    projectsTitle: 'Selected Work',
    processTitle: 'How I Work',
    process: [
      {
        num: '01',
        title: 'Discovery',
        text: 'I break down the task, the users and the constraints — and define what “done” means before the first line of code.',
      },
      {
        num: '02',
        title: 'Architecture',
        text: 'Data, modules and APIs are designed up front. Decisions that are expensive to change are made deliberately.',
      },
      {
        num: '03',
        title: 'Development',
        text: 'Iterations with working builds: typed code, reviewing my own decisions and constant checks against real data.',
      },
      {
        num: '04',
        title: 'Polish',
        text: 'Performance, animation, edge cases and interface details — the difference between “works” and “feels right”.',
      },
    ],
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
        id: 'freelancebot',
        title: 'FreelanceBot',
        tagline: 'Telegram bot and freelance marketplace parsers',
        description:
          'An order aggregator for five freelance marketplaces: AngleSharp and Playwright parsers, Telegram delivery, filters, stats and a React admin panel.',
        tech: ['C#', '.NET', 'Telegram.Bot', 'EF Core', 'React', 'TypeScript', 'Docker'],
        year: '2026',
        glow: '#67e8f9',
        caseStudy: {
          challenge:
            'Gather fresh orders from multiple freelance marketplaces in one place and deliver them to the freelancer in Telegram instantly — with filters, favourites and response stats.',
          solution:
            'Modular parsers (FL.ru, Kwork, Upwork, FreelanceHunt, Weblancer) built on AngleSharp and Playwright, a .NET core with EF Core, a Telegram.Bot bot with inline keyboards, a REST API and a React + TypeScript dashboard. A custom SOCKS5 tunnel with a manual TLS handshake keeps the Telegram API reachable through proxies.',
          highlights: [
            'Five marketplace parsers behind a single contract with order deduplication',
            'Inbox, favourites, budget/keyword filters and personal statistics',
            'Custom SOCKS5 / HTTP CONNECT tunnel for the Telegram API',
          ],
        },
      },
      {
        id: 'online-school',
        title: 'Online School',
        tagline: 'Online-learning web platform on ASP.NET Core MVC',
        description:
          'A complete online-school application: course catalog, lessons with theory and practice, a personal dashboard with progress and a student / teacher / admin role model.',
        tech: ['ASP.NET Core MVC', 'C#', 'EF Core', 'SQL Server', 'Identity', 'Bootstrap', 'JavaScript'],
        year: '2025',
        glow: '#34d399',
        caseStudy: {
          challenge:
            'Build a platform where a student goes from enrollment to results — watching lessons, completing assignments and tracking progress — while teachers manage content without a developer.',
          solution:
            'A classic ASP.NET Core MVC architecture: controllers for courses, lessons and the dashboard, EF Core + SQL Server with course → module → lesson relations, ASP.NET Identity with roles (student, teacher, admin), Razor views and step-by-step progress with graded assignments.',
          highlights: [
            'Course catalog with modules, lessons and guided progression',
            'Personal dashboard: progress, assignment results, learning history',
            'Teacher admin panel: create courses and lessons without code changes',
          ],
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
