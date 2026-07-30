import type { Locale } from './content';

export type LocalizedText = Record<Locale, string>;

export interface ContentSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LocalizedPageContent {
  title: string;
  description: string;
  directAnswer: string;
  sections: ContentSection[];
  faq?: Array<{ question: string; answer: string }>;
}

export interface ServicePageDescriptor {
  id: string;
  slug: string;
  serviceIndex?: number;
  customSummary?: LocalizedText;
  capabilities: string[];
  relatedCaseIds: string[];
  content: Record<Locale, LocalizedPageContent>;
}

export interface CasePageDescriptor {
  id: string;
  slug: string;
  capabilities: string[];
  relatedServiceIds: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface InsightPageDescriptor {
  id: string;
  slug: string;
  relatedServiceId: string;
  relatedCaseIds: string[];
  publishedAt: string;
  updatedAt: string;
  content: Record<Locale, LocalizedPageContent>;
}

export const siteConfig = {
  origin: 'https://nonamezisntreal.github.io',
  basePath: '/webgl-portfolio/',
  publicName: 'Hazard',
  portfolioUrl: 'https://nonamezisntreal.github.io/webgl-portfolio/',
  githubUrl: 'https://github.com/nonamezisntreal',
  telegramUrl: 'https://t.me/JustNikitafornow',
  email: 'nikita04tar@gmail.com',
} as const;

export const servicePages: ServicePageDescriptor[] = [
  {
    id: 'aspnet-core-development',
    slug: 'aspnet-core-development',
    serviceIndex: 0,
    capabilities: ['aspnet-core', 'dotnet', 'api', 'mvc', 'ef-core', 'sql', 'docker'],
    relatedCaseIds: ['nooslib', 'online-school'],
    content: {
      ru: {
        title: 'Разработка приложений на ASP.NET Core',
        description: 'Проектирование и разработка ASP.NET Core MVC/API-приложений: данные, авторизация, фоновые процессы, кэширование и production deployment.',
        directAnswer: 'Разрабатываю ASP.NET Core приложения от доменной модели и базы данных до API, интерфейса, фоновых задач и развёртывания. Основной приоритет — предсказуемое состояние, проверяемые контракты и возможность безопасно развивать продукт после первой версии.',
        sections: [
          { title: 'Подходящие задачи', items: ['Внутренние кабинеты и CRM', 'B2B и B2C веб-приложения', 'REST API и интеграционные сервисы', 'Модернизация существующих .NET-систем', 'Административные панели и фоновые процессы'] },
          { title: 'Что входит в работу', items: ['Проектирование модели данных и границ модулей', 'ASP.NET Core MVC или API', 'EF Core и миграции', 'Identity, роли и политики доступа', 'Кэширование и фоновые workers', 'Docker, reverse proxy и health checks'] },
          { title: 'Надёжность', paragraphs: ['Критические операции проектируются с учётом повторной доставки, конкуренции и частичных сбоев. Миграции и внешние интеграции получают явные проверки, а ошибки не маскируются успешным ответом.'] },
          { title: 'Результат', paragraphs: ['Вы получаете работающую сборку, документированные границы системы, воспроизводимый deployment и понятный список проверок перед выпуском.'] },
        ],
        faq: [
          { question: 'Можно доработать существующий проект?', answer: 'Да. Сначала фиксируются текущее состояние, ограничения и регрессии, затем изменения выполняются небольшими проверяемыми этапами.' },
          { question: 'Можно развернуть приложение на VPS?', answer: 'Да. Для статических частей возможен GitHub Pages, для ASP.NET Core обычно используется Docker на VPS или другой подходящий runtime.' },
        ],
      },
      en: {
        title: 'ASP.NET Core application development',
        description: 'Design and development of ASP.NET Core MVC/API applications: data, authentication, background processing, caching and production deployment.',
        directAnswer: 'I build ASP.NET Core applications from domain and data design through APIs, interfaces, background jobs and deployment. The priority is predictable state, verifiable contracts and a codebase that can evolve safely after the first release.',
        sections: [
          { title: 'Best-fit work', items: ['Internal tools and CRM systems', 'B2B and B2C web applications', 'REST APIs and integration services', 'Modernising existing .NET systems', 'Admin panels and background processing'] },
          { title: 'Delivery scope', items: ['Data model and module boundaries', 'ASP.NET Core MVC or API', 'EF Core and migrations', 'Identity, roles and access policies', 'Caching and background workers', 'Docker, reverse proxy and health checks'] },
          { title: 'Reliability', paragraphs: ['Critical operations are designed for retries, concurrency and partial failure. Migrations and external integrations have explicit checks, while failures are never hidden behind successful responses.'] },
          { title: 'Outcome', paragraphs: ['You receive a working build, documented system boundaries, reproducible deployment and a concrete verification checklist.'] },
        ],
        faq: [
          { question: 'Can you improve an existing codebase?', answer: 'Yes. I first capture the current state, constraints and regressions, then deliver changes in small verifiable increments.' },
          { question: 'Can the application be deployed to a VPS?', answer: 'Yes. Static parts can use GitHub Pages; ASP.NET Core normally runs in Docker on a VPS or another suitable runtime.' },
        ],
      },
    },
  },
  {
    id: 'telegram-bots-automation',
    slug: 'telegram-bots-automation',
    serviceIndex: 2,
    capabilities: ['telegram', 'bots', 'automation', 'parsers', 'queues', 'notifications', 'integrations'],
    relatedCaseIds: ['freelancebot'],
    content: {
      ru: {
        title: 'Telegram-боты и автоматизация',
        description: 'Telegram-боты, парсеры и интеграции с базами данных, CRM, AI-сервисами, очередями и внутренними процессами.',
        directAnswer: 'Разрабатываю Telegram-ботов как часть бизнес-системы: с надёжной обработкой входящих событий, базой данных, очередями, интеграциями, уведомлениями и операторским контролем. Бот не ограничивается командами — он становится интерфейсом к реальному процессу.',
        sections: [
          { title: 'Типовые задачи', items: ['Сбор и квалификация заявок', 'Уведомления и операторские действия', 'Интеграция с CRM и внутренними API', 'Парсинг источников и дедупликация', 'AI-классификация и подготовка черновиков', 'Запланированные напоминания и follow-up'] },
          { title: 'Архитектура', items: ['Webhook или polling по условиям инфраструктуры', 'Идемпотентная обработка обновлений', 'Очередь задач и повторные попытки', 'Хранилище состояния и аудит', 'Rate limits и защита от повторной отправки', 'Ручное подтверждение рискованных действий'] },
          { title: 'Безопасность', paragraphs: ['Токены не попадают в клиентский код или логи. Внешний текст считается недоверенным вводом, а действия с отправкой, оплатой или изменением данных проходят отдельную политику доступа.'] },
          { title: 'Эксплуатация', paragraphs: ['Для production предусматриваются health checks, структурированные логи, восстановление после перезапуска и понятный режим деградации при недоступности внешнего API.'] },
        ],
        faq: [
          { question: 'Webhook или long polling?', answer: 'Webhook удобен при стабильном публичном HTTPS endpoint. Polling проще для локального запуска и некоторых закрытых окружений. Выбор зависит от deployment и требований к задержке.' },
          { question: 'Можно подключить AI?', answer: 'Да, но модель не должна самостоятельно придумывать факты, URL или выполнять необратимые действия без валидации.' },
        ],
      },
      en: {
        title: 'Telegram bots and automation',
        description: 'Telegram bots, parsers and integrations with databases, CRM systems, AI services, queues and internal workflows.',
        directAnswer: 'I build Telegram bots as part of a business system, with reliable event handling, persistence, queues, integrations, notifications and operator controls. The bot is not limited to commands: it becomes an interface to a real workflow.',
        sections: [
          { title: 'Typical use cases', items: ['Lead collection and qualification', 'Notifications and operator actions', 'CRM and internal API integration', 'Source parsing and deduplication', 'AI classification and draft generation', 'Scheduled reminders and follow-up'] },
          { title: 'Architecture', items: ['Webhook or polling based on infrastructure', 'Idempotent update processing', 'Task queues and retries', 'State storage and audit trail', 'Rate limits and duplicate-send protection', 'Human approval for risky actions'] },
          { title: 'Security', paragraphs: ['Tokens never enter client code or logs. External text is treated as untrusted input, while sending, payment and data mutation actions use separate access policies.'] },
          { title: 'Operations', paragraphs: ['Production delivery includes health checks, structured logs, restart recovery and an explicit degraded mode when an external API is unavailable.'] },
        ],
        faq: [
          { question: 'Webhook or long polling?', answer: 'Webhook is a good fit with a stable public HTTPS endpoint. Polling is simpler for local development and some private environments. The choice depends on deployment and latency requirements.' },
          { question: 'Can AI be integrated?', answer: 'Yes, but the model must not invent facts or URLs, or perform irreversible actions without validation.' },
        ],
      },
    },
  },
  {
    id: 'business-process-automation',
    slug: 'business-process-automation',
    customSummary: {
      ru: 'Автоматизация повторяющихся операций: сбор данных, классификация, очереди, согласование, уведомления и контроль результата.',
      en: 'Automation of repeatable operations: data collection, classification, queues, approval, notifications and outcome control.',
    },
    capabilities: ['automation', 'workflow', 'integration', 'parsing', 'ai-classification', 'audit'],
    relatedCaseIds: ['freelancebot', 'nooslib'],
    content: {
      ru: {
        title: 'Автоматизация бизнес-процессов',
        description: 'Проектирование систем, которые собирают данные, принимают проверяемые решения, создают задачи и ведут процесс до результата.',
        directAnswer: 'Автоматизирую процессы, в которых люди тратят время на повторяющийся сбор данных, перенос информации, первичную классификацию, напоминания и контроль статусов. Система сохраняет ручные gate-ы там, где ошибка дороже экономии времени.',
        sections: [
          { title: 'Что можно автоматизировать', items: ['Мониторинг источников и сбор новых событий', 'Нормализация и дедупликация данных', 'Классификация и приоритизация', 'Создание задач и напоминаний', 'Подготовка документов и черновиков', 'Контроль SLA и просроченных действий'] },
          { title: 'Принципы', items: ['Одна каноническая модель состояния', 'Явные переходы и audit trail', 'Повторяемые операции без дублей', 'Human-in-the-loop для рискованных шагов', 'Метрики от события до бизнес-результата'] },
          { title: 'Интеграции', paragraphs: ['Система может связывать Telegram, email, CRM, календарь, внешние API, парсеры и AI-провайдеров. Каждая интеграция имеет собственные ограничения, retries и режим отказа.'] },
        ],
      },
      en: {
        title: 'Business process automation',
        description: 'Systems that collect data, make verifiable decisions, create tasks and drive a workflow to a measurable outcome.',
        directAnswer: 'I automate workflows where people spend time on repetitive collection, data transfer, initial classification, reminders and status tracking. Human gates remain in place whenever an error costs more than the saved time.',
        sections: [
          { title: 'Automation opportunities', items: ['Monitoring sources and collecting events', 'Normalisation and deduplication', 'Classification and prioritisation', 'Task and reminder creation', 'Document and draft preparation', 'SLA and overdue-action tracking'] },
          { title: 'Principles', items: ['One canonical state model', 'Explicit transitions and audit trail', 'Retry-safe operations without duplicates', 'Human-in-the-loop for risky steps', 'Metrics from event to business outcome'] },
          { title: 'Integrations', paragraphs: ['The system can connect Telegram, email, CRM, calendars, external APIs, parsers and AI providers. Every integration has explicit limits, retries and failure behaviour.'] },
        ],
      },
    },
  },
  {
    id: 'webgl-interfaces',
    slug: 'webgl-interfaces',
    serviceIndex: 1,
    capabilities: ['webgl', 'threejs', 'glsl', 'interactive-ui', 'performance', 'accessibility'],
    relatedCaseIds: ['webgl-portfolio'],
    content: {
      ru: {
        title: 'Интерактивные WebGL-интерфейсы',
        description: 'Three.js и GLSL-интерфейсы с progressive enhancement, мобильными ограничениями и измеримой производительностью.',
        directAnswer: 'Создаю WebGL-интерфейсы, в которых визуальный эффект усиливает продукт, но не блокирует контент, навигацию и конверсию. DOM и render layer разделяются, тяжёлые модули загружаются лениво, а для слабых устройств предусмотрена деградация.',
        sections: [
          { title: 'Форматы', items: ['Интерактивные landing pages', 'Продуктовые конфигураторы', '3D-визуализация данных', 'Scroll-driven storytelling', 'Шейдерные эффекты и creative coding'] },
          { title: 'Производительность', items: ['Lazy loading Three.js', 'DPR и particle budgets', 'Остановка render loop в фоне', 'Статический fallback', 'prefers-reduced-motion', 'Профилирование реального устройства'] },
          { title: 'Доступность', paragraphs: ['Все важные тексты, ссылки и CTA остаются обычным HTML. WebGL можно отключить без потери основного сценария, а клавиатурная навигация не зависит от canvas.'] },
        ],
      },
      en: {
        title: 'Interactive WebGL interfaces',
        description: 'Three.js and GLSL interfaces with progressive enhancement, mobile constraints and measurable performance.',
        directAnswer: 'I create WebGL interfaces where the visual layer strengthens the product without blocking content, navigation or conversion. DOM and rendering are separated, heavy modules load lazily and lower-end devices receive a controlled fallback.',
        sections: [
          { title: 'Formats', items: ['Interactive landing pages', 'Product configurators', '3D data visualisation', 'Scroll-driven storytelling', 'Shader effects and creative coding'] },
          { title: 'Performance', items: ['Lazy-loaded Three.js', 'DPR and particle budgets', 'Paused background render loop', 'Static fallback', 'prefers-reduced-motion support', 'Profiling on real devices'] },
          { title: 'Accessibility', paragraphs: ['Important text, links and calls to action remain standard HTML. WebGL can fail or be disabled without losing the core journey, and keyboard navigation never depends on the canvas.'] },
        ],
      },
    },
  },
  {
    id: 'infrastructure-deployment',
    slug: 'infrastructure-deployment',
    serviceIndex: 3,
    capabilities: ['docker', 'vps', 'nginx', 'ci', 'deployment', 'monitoring'],
    relatedCaseIds: ['nooslib', 'webgl-portfolio'],
    content: {
      ru: {
        title: 'Инфраструктура и deployment',
        description: 'Воспроизводимые CI-сборки, Docker-окружения, reverse proxy, health checks, backups и rollback.',
        directAnswer: 'Настраиваю путь от репозитория до работающего сервиса: проверяемую сборку, контейнеры, конфигурацию окружений, HTTPS, health checks, резервные копии и понятный rollback. Инфраструктура остаётся соразмерной проекту и не превращается в отдельный продукт без необходимости.',
        sections: [
          { title: 'Для статических сайтов', items: ['GitHub Actions', 'GitHub Pages', 'Корректный base path', 'Sitemap и robots', 'Artifact validation'] },
          { title: 'Для backend-систем', items: ['Docker Compose', 'Nginx или Caddy', 'Persistent volumes', 'Secrets вне репозитория', 'Health checks и restart policy', 'Backup и restore drill'] },
          { title: 'Граница решения', paragraphs: ['Для одного или нескольких проектов обычно достаточно single-host или internal multi-project platform. Создание публичного коммерческого PaaS не входит в обычный scope deployment.'] },
        ],
      },
      en: {
        title: 'Infrastructure and deployment',
        description: 'Reproducible CI builds, Docker environments, reverse proxy, health checks, backups and rollback.',
        directAnswer: 'I build the path from repository to running service: verified builds, containers, environment configuration, HTTPS, health checks, backups and a clear rollback. Infrastructure stays proportional to the project instead of becoming a separate platform without a reason.',
        sections: [
          { title: 'For static sites', items: ['GitHub Actions', 'GitHub Pages', 'Correct base path', 'Sitemap and robots', 'Artifact validation'] },
          { title: 'For backend systems', items: ['Docker Compose', 'Nginx or Caddy', 'Persistent volumes', 'Secrets outside the repository', 'Health checks and restart policy', 'Backup and restore drill'] },
          { title: 'Solution boundary', paragraphs: ['A single-host or internal multi-project platform is normally enough for one or several applications. Building a public commercial PaaS is outside normal deployment scope.'] },
        ],
      },
    },
  },
];

export const casePages: CasePageDescriptor[] = [
  { id: 'nooslib', slug: 'nooslib', capabilities: ['aspnet-core', 'djvu', 'caching', 'seo', 'docker'], relatedServiceIds: ['aspnet-core-development', 'infrastructure-deployment'], publishedAt: '2026-07-30', updatedAt: '2026-07-30' },
  { id: 'freelancebot', slug: 'freelancebot', capabilities: ['telegram', 'parsers', 'automation', 'react', 'docker'], relatedServiceIds: ['telegram-bots-automation', 'business-process-automation'], publishedAt: '2026-07-30', updatedAt: '2026-07-30' },
  { id: 'online-school', slug: 'online-school', capabilities: ['aspnet-core', 'mvc', 'identity', 'education'], relatedServiceIds: ['aspnet-core-development'], publishedAt: '2026-07-30', updatedAt: '2026-07-30' },
  { id: 'webgl-portfolio', slug: 'webgl-portfolio', capabilities: ['webgl', 'threejs', 'glsl', 'github-pages'], relatedServiceIds: ['webgl-interfaces', 'infrastructure-deployment'], publishedAt: '2026-07-30', updatedAt: '2026-07-30' },
];

export const insightPages: InsightPageDescriptor[] = [
  {
    id: 'telegram-bot-webhook-or-polling',
    slug: 'telegram-bot-webhook-or-polling',
    relatedServiceId: 'telegram-bots-automation',
    relatedCaseIds: ['freelancebot'],
    publishedAt: '2026-07-30',
    updatedAt: '2026-07-30',
    content: {
      ru: {
        title: 'Webhook или long polling для Telegram-бота',
        description: 'Практическое сравнение webhook и long polling по deployment, задержке, восстановлению и сложности эксплуатации.',
        directAnswer: 'Webhook лучше подходит для постоянно доступного HTTPS-сервиса и низкой задержки. Long polling проще для локальной разработки, desktop-сценариев и закрытых окружений. Надёжность определяется не способом получения обновлений, а идемпотентной обработкой, хранением offset и корректным восстановлением.',
        sections: [
          { title: 'Когда выбирать webhook', items: ['Есть публичный HTTPS endpoint', 'Нужна минимальная задержка', 'Runtime работает постоянно', 'Настроены health checks и повторная доставка'] },
          { title: 'Когда выбирать polling', items: ['Локальный или закрытый runtime', 'Нет стабильного входящего endpoint', 'Нужен простой контролируемый запуск', 'Допустима небольшая задержка'] },
          { title: 'Что важнее транспорта', paragraphs: ['Update ID должен обрабатываться идемпотентно. Побочные эффекты нельзя повторять при retry, а состояние обработки должно переживать перезапуск процесса.'] },
        ],
      },
      en: {
        title: 'Webhook or long polling for a Telegram bot',
        description: 'A practical comparison of webhook and long polling across deployment, latency, recovery and operational complexity.',
        directAnswer: 'Webhook is a better fit for an always-on HTTPS service and low latency. Long polling is simpler for local development, desktop scenarios and private environments. Reliability comes from idempotent processing, offset storage and recovery, not from the transport alone.',
        sections: [
          { title: 'Choose webhook when', items: ['A public HTTPS endpoint exists', 'Minimum latency matters', 'The runtime is always on', 'Health checks and retries are configured'] },
          { title: 'Choose polling when', items: ['The runtime is local or private', 'There is no stable inbound endpoint', 'A simple controlled start is preferred', 'A small delay is acceptable'] },
          { title: 'What matters more than transport', paragraphs: ['Update IDs must be processed idempotently. Side effects cannot repeat on retry, and processing state must survive a process restart.'] },
        ],
      },
    },
  },
  {
    id: 'telegram-bot-database',
    slug: 'telegram-bot-database',
    relatedServiceId: 'telegram-bots-automation',
    relatedCaseIds: ['freelancebot'],
    publishedAt: '2026-07-30',
    updatedAt: '2026-07-30',
    content: {
      ru: {
        title: 'Когда Telegram-боту нужна база данных',
        description: 'Критерии, по которым хранение состояния в памяти перестаёт быть безопасным для Telegram-бота.',
        directAnswer: 'База данных нужна, когда бот должен помнить состояние после перезапуска, предотвращать повторные действия, поддерживать несколько процессов, вести историю или связывать сообщения с бизнес-сущностями. Для одноразовых команд без состояния она может быть избыточна.',
        sections: [
          { title: 'Явные признаки', items: ['Диалоги из нескольких шагов', 'Платежи, заявки или сделки', 'Напоминания и scheduled jobs', 'Дедупликация событий', 'Аудит операторских действий', 'Несколько экземпляров приложения'] },
          { title: 'Что хранить', items: ['Пользовательский и бизнес-контекст', 'Идентификаторы обработанных событий', 'Состояние workflow', 'Время следующего действия', 'Результат внешней операции'] },
          { title: 'Чего избегать', paragraphs: ['Не следует хранить токены в открытом виде, использовать один JSON-файл как конкурентную базу или считать in-memory cache каноническим состоянием.'] },
        ],
      },
      en: {
        title: 'When a Telegram bot needs a database',
        description: 'The point at which in-memory state is no longer safe for a Telegram bot.',
        directAnswer: 'A database is needed when the bot must preserve state across restarts, prevent duplicate actions, support multiple processes, keep history or connect messages to business entities. It may be unnecessary for stateless one-off commands.',
        sections: [
          { title: 'Clear signals', items: ['Multi-step conversations', 'Payments, leads or deals', 'Reminders and scheduled jobs', 'Event deduplication', 'Operator audit trail', 'Multiple application instances'] },
          { title: 'What to store', items: ['User and business context', 'Processed event identifiers', 'Workflow state', 'Next-action time', 'External operation result'] },
          { title: 'What to avoid', paragraphs: ['Do not store tokens in plaintext, use one JSON file as a concurrent database, or treat an in-memory cache as canonical state.'] },
        ],
      },
    },
  },
  {
    id: 'reliable-message-delivery',
    slug: 'reliable-message-delivery',
    relatedServiceId: 'business-process-automation',
    relatedCaseIds: ['freelancebot'],
    publishedAt: '2026-07-30',
    updatedAt: '2026-07-30',
    content: {
      ru: {
        title: 'Как не потерять сообщение при сбое',
        description: 'Надёжная обработка входящих сообщений: durable state, retries, idempotency и unknown-outcome recovery.',
        directAnswer: 'Надёжная доставка требует сначала сохранить событие или намерение обработки, а уже затем выполнять внешний побочный эффект. Повторная попытка должна быть безопасной, а неизвестный результат — проверяемым, а не автоматически считаться успехом или ошибкой.',
        sections: [
          { title: 'Минимальный контур', items: ['Durable inbox', 'Уникальный event ID', 'Статус обработки', 'Retry policy', 'Dead-letter или quarantine', 'Наблюдаемая ошибка'] },
          { title: 'Идемпотентность', paragraphs: ['Одинаковое событие может прийти повторно. Обработчик должен распознать дубль и не отправить второе письмо, сообщение или платёж.'] },
          { title: 'Неизвестный результат', paragraphs: ['Если соединение оборвалось после отправки запроса, нельзя слепо повторять операцию. Сначала проверяется состояние у внешнего провайдера или используется idempotency key.'] },
        ],
      },
      en: {
        title: 'How not to lose a message during failure',
        description: 'Reliable inbound processing with durable state, retries, idempotency and unknown-outcome recovery.',
        directAnswer: 'Reliable delivery means persisting the event or processing intent before executing an external side effect. A retry must be safe, and an unknown result must be verified instead of being treated automatically as success or failure.',
        sections: [
          { title: 'Minimum control loop', items: ['Durable inbox', 'Unique event ID', 'Processing status', 'Retry policy', 'Dead letter or quarantine', 'Observable failure'] },
          { title: 'Idempotency', paragraphs: ['The same event may arrive more than once. The handler must identify the duplicate and avoid sending a second message, email or payment.'] },
          { title: 'Unknown outcomes', paragraphs: ['If the connection drops after a request is sent, the operation must not be repeated blindly. First query the provider state or use an idempotency key.'] },
        ],
      },
    },
  },
  {
    id: 'webgl-core-web-vitals',
    slug: 'webgl-core-web-vitals',
    relatedServiceId: 'webgl-interfaces',
    relatedCaseIds: ['webgl-portfolio'],
    publishedAt: '2026-07-30',
    updatedAt: '2026-07-30',
    content: {
      ru: {
        title: 'Как WebGL влияет на Core Web Vitals',
        description: 'Как сохранить интерактивную Three.js-сцену и не сделать canvas причиной медленного LCP и нестабильного интерфейса.',
        directAnswer: 'WebGL не обязан ухудшать Core Web Vitals, если основной HTML отображается сразу, canvas не является LCP-элементом, Three.js загружается лениво, размеры интерфейса заранее известны, а render loop адаптируется к устройству и видимости вкладки.',
        sections: [
          { title: 'LCP', items: ['Показывать H1 и CTA до загрузки Three.js', 'Не закрывать страницу полноэкранным loader', 'Не делать тяжёлый canvas главным контентом', 'Лениво загружать render layer'] },
          { title: 'INP', items: ['Не выполнять тяжёлую инициализацию в одном long task', 'Ограничивать pixel ratio', 'Снижать частицы на мобильных', 'Не блокировать main thread обработчиками pointermove'] },
          { title: 'CLS и доступность', items: ['Фиксировать размеры блоков', 'Оставлять DOM-навигацию', 'Поддерживать reduced motion', 'Иметь статический fallback'] },
        ],
      },
      en: {
        title: 'How WebGL affects Core Web Vitals',
        description: 'Keeping an interactive Three.js scene without making the canvas the cause of slow LCP and unstable interaction.',
        directAnswer: 'WebGL does not have to damage Core Web Vitals when primary HTML appears immediately, the canvas is not the LCP element, Three.js loads lazily, layout dimensions are known and the render loop adapts to device capability and tab visibility.',
        sections: [
          { title: 'LCP', items: ['Show the H1 and CTA before Three.js loads', 'Avoid a full-screen blocking loader', 'Do not make the heavy canvas the primary content', 'Lazy-load the rendering layer'] },
          { title: 'INP', items: ['Avoid one long initialisation task', 'Cap pixel ratio', 'Reduce particles on mobile', 'Keep pointer handlers lightweight'] },
          { title: 'CLS and accessibility', items: ['Reserve layout space', 'Keep DOM navigation', 'Support reduced motion', 'Provide a static fallback'] },
        ],
      },
    },
  },
];
