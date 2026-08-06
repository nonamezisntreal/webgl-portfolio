import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';

const root = process.cwd();
const dist = resolve(root, process.env.DIST_DIR ?? 'dist');
const basePath = '/webgl-portfolio/';
const artifactDir = resolve(process.env.BROWSER_ARTIFACT_DIR ?? resolve(tmpdir(), 'webgl-portfolio-browser-smoke'));
const chromePath = process.env.CHROME_EXE
  ?? (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/google-chrome');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mime(path) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
  })[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

function startSiteServer() {
  const server = createServer((request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (!url.pathname.startsWith(basePath)) {
        response.writeHead(302, { location: basePath });
        response.end();
        return;
      }
      const decoded = decodeURIComponent(url.pathname.slice(basePath.length));
      if (decoded.includes('\\') || decoded.split('/').some((segment) => segment === '..')) {
        response.writeHead(400);
        response.end('Bad request');
        return;
      }
      let relative = decoded;
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      let file = resolve(dist, relative);
      if (!(file === dist || file.startsWith(`${dist}${sep}`)) || !existsSync(file)) {
        file = resolve(dist, '404.html');
        response.writeHead(404, { 'content-type': mime(file), 'cache-control': 'no-store' });
      } else {
        response.writeHead(200, { 'content-type': mime(file), 'cache-control': 'no-store' });
      }
      createReadStream(file).pipe(response);
    } catch (error) {
      response.writeHead(500);
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert(address && typeof address === 'object', 'Site server failed to bind.');
      resolvePromise({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function freePort() {
  const server = createNetServer();
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert(address && typeof address === 'object', 'Unable to allocate a debugging port.');
      const port = address.port;
      server.close(() => resolvePromise(port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      const params = message.params ?? {};
      const waiters = this.waiters.get(message.method) ?? [];
      this.waiters.delete(message.method);
      for (const waiter of waiters) waiter.resolve(params);
      for (const listener of this.listeners.get(message.method) ?? []) listener(params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  event(method, timeoutMs = 15000) {
    return new Promise((resolvePromise, reject) => {
      const waiter = { resolve: resolvePromise, reject };
      const current = this.waiters.get(method) ?? [];
      current.push(waiter);
      this.waiters.set(method, current);
      const timer = setTimeout(() => {
        const active = this.waiters.get(method) ?? [];
        this.waiters.set(method, active.filter((item) => item !== waiter));
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMs);
      waiter.resolve = (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      };
    });
  }

  on(method, listener) {
    const current = this.listeners.get(method) ?? [];
    current.push(listener);
    this.listeners.set(method, current);
    return () => this.listeners.set(method, (this.listeners.get(method) ?? []).filter((item) => item !== listener));
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Browser evaluation failed.');
    return result.result?.value;
  }

  async navigate(url) {
    const loaded = this.event('Page.loadEventFired');
    const result = await this.send('Page.navigate', { url });
    assert(!result.errorText, `Navigation failed: ${result.errorText}`);
    await loaded;
    await sleep(1600);
  }

  async reload(ignoreCache = true) {
    const loaded = this.event('Page.loadEventFired');
    await this.send('Page.reload', { ignoreCache });
    await loaded;
    await sleep(1600);
  }

  async key(key, code, modifiers = 0) {
    const keyCode = key === 'Tab' ? 9 : key === 'Enter' ? 13 : key === 'Escape' ? 27 : 0;
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await sleep(120);
  }

  async screenshot(path) {
    const result = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    await writeFile(path, Buffer.from(result.data, 'base64'));
  }

  close() {
    this.socket.close();
  }
}

async function launchChrome(extraFlags = []) {
  assert(existsSync(chromePath), `Chrome executable is missing: ${chromePath}`);
  const port = await freePort();
  const profile = await mkdtemp(resolve(tmpdir(), 'webgl-chrome-'));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--hide-scrollbars',
    '--window-size=1440,900',
    ...extraFlags,
    'about:blank',
  ];
  const processHandle = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  let stderr = '';
  processHandle.stderr.on('data', (chunk) => { stderr += String(chunk); });

  let version;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) { version = await response.json(); break; }
    } catch { /* retry */ }
    await sleep(100);
  }
  assert(version, `Chrome debugging endpoint did not start. ${stderr}`);
  const tabResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  assert(tabResponse.ok, 'Unable to create Chrome test tab.');
  const tab = await tabResponse.json();
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const cdp = new Cdp(socket);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  return {
    cdp,
    browserVersion: version.Browser,
    async close() {
      cdp.close();
      const exited = new Promise((resolvePromise) => processHandle.once('exit', resolvePromise));
      processHandle.kill();
      await Promise.race([exited, sleep(2500)]);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          await rm(profile, { recursive: true, force: true });
          break;
        } catch (error) {
          if (attempt === 7) console.warn(`Chrome profile cleanup deferred: ${error instanceof Error ? error.message : String(error)}`);
          else await sleep(250);
        }
      }
    },
  };
}

async function pageContract(cdp) {
  return cdp.evaluate(`(() => {
    const visible = (element) => Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    const controls = [...document.querySelectorAll('a,button,input,textarea,[tabindex]')].filter(visible);
    const nameless = controls.filter((element) => !((element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || '').trim())).map((element) => element.outerHTML.slice(0, 180));
    const imagesWithoutAlt = [...document.images].filter((image) => !image.hasAttribute('alt')).map((image) => image.src);
    const headingLevels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((heading) => Number(heading.tagName.slice(1)));
    const headingSkips = headingLevels.slice(1).filter((level, index) => level - headingLevels[index] > 1);
    const wrapper = document.getElementById('lang-toggle');
    const active = document.querySelector('[data-lang-pill][aria-current="page"]');
    const inactive = document.querySelector('[data-lang-link]');
    const inactiveRect = inactive?.getBoundingClientRect();
    const sceneGuide = document.querySelector('.scene-guide');
    const sceneGuideStyle = sceneGuide ? getComputedStyle(sceneGuide) : null;
    const sceneGuidePointer = document.querySelector('.scene-guide__instruction--pointer');
    const sceneGuideTouch = document.querySelector('.scene-guide__instruction--touch');
    return {
      title: document.title,
      lang: document.documentElement.lang,
      ready: document.body.classList.contains('is-ready'),
      loaderPresent: Boolean(document.getElementById('loader')),
      mainTextLength: (document.querySelector('main')?.innerText || '').trim().length,
      h1Count: document.querySelectorAll('h1').length,
      landmarks: { header: document.querySelectorAll('header').length, nav: document.querySelectorAll('nav').length, main: document.querySelectorAll('main').length, footer: document.querySelectorAll('footer').length },
      nameless,
      imagesWithoutAlt,
      headingSkips,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      canvasExists: Boolean(document.getElementById('gl')),
      canvasHidden: document.getElementById('gl')?.getAttribute('aria-hidden'),
      wrapperRole: wrapper?.getAttribute('role'),
      wrapperHref: wrapper?.getAttribute('href'),
      activeLocale: active?.getAttribute('data-lang-pill'),
      activeTag: active?.tagName.toLowerCase(),
      activeHref: active?.getAttribute('href'),
      activeTabIndex: active?.getAttribute('tabindex'),
      activeAriaCurrent: active?.getAttribute('aria-current'),
      inactiveLocale: inactive?.getAttribute('data-lang-pill'),
      inactiveTag: inactive?.tagName.toLowerCase(),
      inactiveHref: inactive?.getAttribute('href'),
      inactiveHreflang: inactive?.getAttribute('hreflang'),
      inactiveTarget: inactiveRect ? { width: inactiveRect.width, height: inactiveRect.height } : null,
      moduleCount: document.querySelectorAll('script[type="module"][src]').length,
      heroEyebrow: document.getElementById('hero-eyebrow')?.textContent?.trim(),
      navigationLabel: document.querySelector('.header__nav')?.getAttribute('aria-label'),
      closeLabel: document.getElementById('case-close')?.getAttribute('aria-label'),
      contactStatusRole: document.getElementById('contact-sent')?.getAttribute('role'),
      webglFallback: document.documentElement.classList.contains('webgl-fallback'),
      sceneGuide: {
        exists: Boolean(sceneGuide),
        visible: Boolean(sceneGuideStyle && sceneGuideStyle.visibility !== 'hidden' && Number(sceneGuideStyle.opacity) > 0.5),
        title: document.querySelector('.scene-guide__title')?.textContent?.trim(),
        pointer: sceneGuidePointer?.textContent?.trim(),
        touch: sceneGuideTouch?.textContent?.trim(),
        action: document.querySelector('.scene-guide__action')?.textContent?.trim(),
        pointerDisplay: sceneGuidePointer ? getComputedStyle(sceneGuidePointer).display : null,
        touchDisplay: sceneGuideTouch ? getComputedStyle(sceneGuideTouch).display : null,
      },
    };
  })()`);
}

async function activeLocaleClickKeepsPath(cdp) {
  const before = await cdp.evaluate('location.pathname');
  await cdp.evaluate(`document.querySelector('[data-lang-pill][aria-current="page"]')?.click()`);
  await sleep(120);
  const after = await cdp.evaluate('location.pathname');
  return { before, after };
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 1 });
}

async function movePointer(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, pointerType: 'mouse' });
}

async function discoverSceneNodes(cdp, width, height, expectedLabels) {
  const expected = new Set(expectedLabels);
  const found = new Map();
  for (const step of [28, 18]) {
    for (let y = 56; y <= height - 24 && found.size < expected.size; y += step) {
      for (let x = 12; x <= width - 12 && found.size < expected.size; x += step) {
        await movePointer(cdp, x, y);
        await sleep(20);
        const hit = await cdp.evaluate(`(() => {
          const tip = document.querySelector('.scene-tip');
          if (!tip?.classList.contains('scene-tip--visible')) return null;
          const label = tip.textContent?.trim();
          const match = tip.style.transform.match(/translate\\((-?\\d+)px, (-?\\d+)px\\)/);
          if (!label || !match) return null;
          return { label, x: Number(match[1]) + tip.offsetWidth / 2, y: Number(match[2]) };
        })()`);
        if (hit && expected.has(hit.label) && !found.has(hit.label)) found.set(hit.label, { x: hit.x, y: hit.y });
      }
    }
    if (found.size === expected.size) break;
  }
  return Object.fromEntries(found);
}

async function dispatchTouch(cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((point, index) => ({
      x: point.x,
      y: point.y,
      radiusX: 4,
      radiusY: 4,
      force: 1,
      id: index + 1,
    })),
  });
}

const drawCounterSource = `(() => {
  let draws = 0;
  Object.defineProperty(window, '__sceneDrawCalls', { configurable: true, get: () => draws });
  const wrap = (prototype, name) => {
    if (!prototype) return;
    const original = prototype[name];
    if (typeof original !== 'function' || original.__sceneCounted) return;
    const counted = function (...args) {
      draws += 1;
      return original.apply(this, args);
    };
    Object.defineProperty(counted, '__sceneCounted', { value: true });
    prototype[name] = counted;
  };
  for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
    wrap(globalThis.WebGLRenderingContext?.prototype, name);
    wrap(globalThis.WebGL2RenderingContext?.prototype, name);
  }
})();`;

async function waitForIdleHint(cdp, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hint = await cdp.evaluate(`(() => ({
      visible: document.querySelector('.scene-tip--hint')?.classList.contains('scene-tip--visible') ?? false,
      label: document.querySelector('.scene-tip--hint')?.textContent?.trim() ?? null,
      linked: document.querySelectorAll('.is-scene-linked').length,
      guideActive: document.querySelector('.scene-guide')?.classList.contains('scene-guide--active') ?? false,
    }))()`);
    if (hint.visible) return hint;
    await sleep(100);
  }
  return null;
}

async function runIdleRegression(origin, results) {
  const browser = await launchChrome();
  const { cdp } = browser;
  try {
    await setViewport(cdp, 1440, 900);
    await cdp.navigate(`${origin}${basePath}`);
    const before = await waitForIdleHint(cdp);
    assert(before?.visible && before.linked === 1 && before.guideActive, 'Idle demonstration did not reach its complete visible state.');

    const after = await cdp.evaluate(`(() => {
      const button = document.getElementById('hero-primary');
      const rect = button.getBoundingClientRect();
      button.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }));
      return {
        hintVisible: document.querySelector('.scene-tip--hint')?.classList.contains('scene-tip--visible') ?? false,
        tipVisible: document.querySelector('.scene-tip')?.classList.contains('scene-tip--visible') ?? false,
        linked: document.querySelectorAll('.is-scene-linked').length,
        guideActive: document.querySelector('.scene-guide')?.classList.contains('scene-guide--active') ?? false,
      };
    })()`);
    assert(!after.hintVisible && !after.tipVisible && after.linked === 0 && !after.guideActive,
      'A normal CTA press left part of the idle demonstration active.');
    results.push({ id: 'BROWSER-IDLE-CANCEL', status: 'PASS', details: { before, after } });
  } finally {
    await browser.close();
  }
}

function collectDiagnostics(cdp, origin) {
  const consoleErrors = [];
  const networkFailures = [];
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => consoleErrors.push(exceptionDetails?.text ?? 'Runtime exception'));
  cdp.on('Log.entryAdded', ({ entry }) => {
    if (entry?.level === 'error') consoleErrors.push(entry.text ?? 'Console error');
  });
  cdp.on('Network.loadingFailed', ({ requestId, errorText, canceled }) => {
    if (!canceled) networkFailures.push({ requestId, errorText });
  });
  cdp.on('Network.responseReceived', ({ response }) => {
    if (response?.url?.startsWith(origin) && response.status >= 400) networkFailures.push({ url: response.url, status: response.status });
  });
  return {
    snapshotAndReset() {
      const snapshot = { consoleErrors: [...consoleErrors], networkFailures: [...networkFailures] };
      consoleErrors.length = 0;
      networkFailures.length = 0;
      return snapshot;
    },
  };
}

async function runPrimary(origin, results) {
  const browser = await launchChrome();
  const { cdp } = browser;
  const diagnostics = collectDiagnostics(cdp, origin);
  try {
    await setViewport(cdp, 1440, 900);
    await cdp.navigate(`${origin}${basePath}`);
    const desktop = await pageContract(cdp);
    assert(desktop.lang === 'ru', 'Desktop homepage language is not Russian.');
    assert(desktop.ready && !desktop.loaderPresent, 'Homepage loader did not settle.');
    assert(desktop.mainTextLength > 1000 && desktop.h1Count === 1, 'Homepage primary content is incomplete.');
    assert(desktop.nameless.length === 0 && desktop.imagesWithoutAlt.length === 0, 'Visible controls or images lack accessible names.');
    assert(desktop.headingSkips.length === 0, 'Visible heading hierarchy skips levels.');
    assert(desktop.horizontalOverflow <= 1, 'Desktop page has horizontal overflow.');
    assert(desktop.canvasExists && desktop.canvasHidden === 'true' && desktop.moduleCount === 1, 'Russian homepage shared application runtime is incomplete.');
    assert(desktop.heroEyebrow === 'доступен для проектов', 'Russian homepage primary shell is not localized.');
    assert(desktop.sceneGuide.exists && desktop.sceneGuide.visible, 'Russian scene onboarding guide is not visible.');
    assert(desktop.sceneGuide.title === 'Интерактивный фон' && desktop.sceneGuide.pointer === 'Наведи на светящийся ромб и нажми', 'Russian scene onboarding guide is not localized.');
    assert(desktop.sceneGuide.pointerDisplay !== 'none' && desktop.sceneGuide.touchDisplay === 'none', 'Desktop scene onboarding shows the wrong input instruction.');
    assert(desktop.wrapperRole === 'group' && desktop.wrapperHref === null, 'Russian language switcher wrapper is not semantic.');
    assert(desktop.activeLocale === 'ru' && desktop.activeTag === 'span' && desktop.activeHref === null && desktop.activeTabIndex === null && desktop.activeAriaCurrent === 'page', 'Russian homepage active locale must be an inert span.');
    assert(desktop.inactiveLocale === 'en' && desktop.inactiveTag === 'a' && desktop.inactiveHref === `${basePath}en/` && desktop.inactiveHreflang === 'en', 'Russian homepage inactive EN link is incorrect.');
    const activeRuClick = await activeLocaleClickKeepsPath(cdp);
    assert(activeRuClick.before === basePath && activeRuClick.after === basePath, 'Clicking active RU unexpectedly changed the URL.');
    assert(desktop.contactStatusRole === 'status', 'Contact feedback is not a live status region.');
    const ruDiagnostics = diagnostics.snapshotAndReset();
    assert(ruDiagnostics.consoleErrors.length === 0 && ruDiagnostics.networkFailures.length === 0, 'Russian direct load produced Console or Network failures.');
    await cdp.screenshot(resolve(artifactDir, 'desktop-1440x900.png'));
    results.push({ id: 'BROWSER-DESKTOP', status: 'PASS', details: { ...desktop, diagnostics: ruDiagnostics } });

    await cdp.navigate(`${origin}${basePath}en/`);
    const english = await pageContract(cdp);
    assert(english.lang === 'en', 'English homepage language is incorrect.');
    assert(english.ready && !english.loaderPresent, 'English homepage loader did not settle.');
    assert(english.mainTextLength > 1000 && english.h1Count === 1, 'English homepage primary content is incomplete.');
    assert(english.canvasExists && english.canvasHidden === 'true' && english.moduleCount === 1, 'English homepage is missing the shared application runtime.');
    assert(english.heroEyebrow === 'available for projects' && english.navigationLabel === 'Primary navigation' && english.closeLabel === 'Close project details', 'English homepage primary shell or accessible labels are not localized.');
    assert(english.sceneGuide.exists && english.sceneGuide.visible, 'English scene onboarding guide is not visible.');
    assert(english.sceneGuide.title === 'Interactive background' && english.sceneGuide.pointer === 'Hover a glowing diamond and click', 'English scene onboarding guide is not localized.');
    assert(english.sceneGuide.pointerDisplay !== 'none' && english.sceneGuide.touchDisplay === 'none', 'English desktop onboarding shows the wrong input instruction.');
    assert(english.wrapperRole === 'group' && english.wrapperHref === null, 'English language switcher wrapper is not semantic.');
    assert(english.activeLocale === 'en' && english.activeTag === 'span' && english.activeHref === null && english.activeTabIndex === null && english.activeAriaCurrent === 'page', 'English homepage active locale must be an inert span.');
    assert(english.inactiveLocale === 'ru' && english.inactiveTag === 'a' && english.inactiveHref === basePath && english.inactiveHreflang === 'ru', 'English homepage inactive RU link is incorrect.');
    const activeEnClick = await activeLocaleClickKeepsPath(cdp);
    assert(activeEnClick.before === `${basePath}en/` && activeEnClick.after === `${basePath}en/`, 'Clicking active EN unexpectedly changed the URL.');
    const enDiagnostics = diagnostics.snapshotAndReset();
    assert(enDiagnostics.consoleErrors.length === 0 && enDiagnostics.networkFailures.length === 0, 'English direct load produced Console or Network failures.');
    await cdp.screenshot(resolve(artifactDir, 'english-1440x900.png'));
    results.push({ id: 'BROWSER-ENGLISH-HOMEPAGE', status: 'PASS', details: { ...english, diagnostics: enDiagnostics } });

    await cdp.reload(true);
    const englishReload = await pageContract(cdp);
    const reloadDiagnostics = diagnostics.snapshotAndReset();
    assert(englishReload.lang === 'en' && englishReload.ready && englishReload.canvasExists && englishReload.activeLocale === 'en', 'English hard reload did not preserve the interactive locale contract.');
    assert(reloadDiagnostics.consoleErrors.length === 0 && reloadDiagnostics.networkFailures.length === 0, 'English hard reload produced Console or Network failures.');
    results.push({ id: 'BROWSER-ENGLISH-HARD-RELOAD', status: 'PASS', details: { ...englishReload, diagnostics: reloadDiagnostics } });

    await setViewport(cdp, 1728, 864);
    await cdp.navigate(`${origin}${basePath}`);
    await cdp.screenshot(resolve(artifactDir, 'hero-1728x864-1s.png'));
    await sleep(3400);
    await cdp.screenshot(resolve(artifactDir, 'hero-1728x864-5s.png'));
    await sleep(5000);
    await cdp.screenshot(resolve(artifactDir, 'hero-1728x864-10s.png'));
    const timelineContract = await pageContract(cdp);
    const timelineDiagnostics = diagnostics.snapshotAndReset();
    assert(timelineContract.ready && timelineContract.canvasExists && timelineContract.horizontalOverflow <= 1, '1728×864 hero timeline did not remain stable.');
    assert(timelineDiagnostics.consoleErrors.length === 0 && timelineDiagnostics.networkFailures.length === 0, 'Hero timeline produced Console or Network failures.');
    results.push({ id: 'BROWSER-HERO-TIMELINE', status: 'PASS', details: { ...timelineContract, diagnostics: timelineDiagnostics, captures: ['hero-1728x864-1s.png', 'hero-1728x864-5s.png', 'hero-1728x864-10s.png'] } });

    for (const viewport of [
      { id: 'BROWSER-TABLET', width: 768, height: 1024, mobile: true, screenshot: 'tablet-768x1024.png' },
      { id: 'BROWSER-MOBILE', width: 390, height: 844, mobile: true, screenshot: 'mobile-390x844.png' },
      { id: 'BROWSER-LANDSCAPE', width: 844, height: 390, mobile: true, screenshot: 'landscape-844x390.png' },
    ]) {
      await setViewport(cdp, viewport.width, viewport.height, viewport.mobile);
      await cdp.navigate(`${origin}${basePath}`);
      const contract = await pageContract(cdp);
      assert(contract.horizontalOverflow <= 1, `${viewport.id} has horizontal overflow.`);
      assert(contract.ready && contract.mainTextLength > 1000, `${viewport.id} did not render primary content.`);
      assert(contract.inactiveTarget && contract.inactiveTarget.width >= 44 && contract.inactiveTarget.height >= 44, `${viewport.id} inactive locale touch target is below 44×44px.`);
      assert(contract.sceneGuide.visible && contract.sceneGuide.title === 'Интерактивный фон', `${viewport.id} scene onboarding guide is missing.`);
      assert(contract.sceneGuide.pointerDisplay === 'none' && contract.sceneGuide.touchDisplay !== 'none', `${viewport.id} does not show the touch-specific scene instruction.`);
      await cdp.screenshot(resolve(artifactDir, viewport.screenshot));
      results.push({ id: viewport.id, status: 'PASS', details: contract });
    }

    await setViewport(cdp, 390, 844, true);
    await cdp.navigate(`${origin}${basePath}`);
    const expectedStackLabels = await cdp.evaluate(`[
      ...document.querySelectorAll('[data-scene-target^="stack-"]'),
    ].map((element) => element.textContent?.trim()).filter(Boolean)`);
    const mobileNodes = await discoverSceneNodes(cdp, 390, 844, expectedStackLabels);
    assert(Object.keys(mobileNodes).length === expectedStackLabels.length, `Mobile scene exposed ${Object.keys(mobileNodes).length}/${expectedStackLabels.length} stack nodes.`);

    const swipeLabel = expectedStackLabels.find((label) => mobileNodes[label]);
    assert(swipeLabel, 'No mobile scene node was available for the gesture regression test.');
    const swipePoint = mobileNodes[swipeLabel];
    const swipeDelta = swipePoint.y < 700 ? 96 : -96;
    await dispatchTouch(cdp, 'touchStart', [swipePoint]);
    await dispatchTouch(cdp, 'touchMove', [{ x: swipePoint.x, y: swipePoint.y + swipeDelta }]);
    await dispatchTouch(cdp, 'touchEnd', []);
    await sleep(400);
    const afterSwipe = await cdp.evaluate(`(() => ({
      highlighted: document.querySelectorAll('.is-scene-target').length,
      caseOpen: document.getElementById('case')?.classList.contains('case--open'),
    }))()`);
    assert(afterSwipe.highlighted === 0 && !afterSwipe.caseOpen, 'A swipe gesture activated a scene node.');

    await cdp.navigate(`${origin}${basePath}`);
    const tapNode = await discoverSceneNodes(cdp, 390, 844, [swipeLabel]);
    const tapPoint = tapNode[swipeLabel];
    assert(tapPoint, 'The mobile scene node disappeared before the tap regression test.');
    await movePointer(cdp, tapPoint.x, tapPoint.y);
    await sleep(80);
    const guideHover = await cdp.evaluate(`(() => ({
      active: document.querySelector('.scene-guide')?.classList.contains('scene-guide--active'),
      action: document.querySelector('.scene-guide__action')?.textContent?.trim(),
    }))()`);
    assert(guideHover.active && guideHover.action?.includes(swipeLabel), 'Scene onboarding did not identify the hovered node and its action.');
    await dispatchTouch(cdp, 'touchStart', [tapPoint]);
    await dispatchTouch(cdp, 'touchEnd', []);
    await sleep(760);
    const afterTap = await cdp.evaluate(`(() => ({
      highlighted: document.querySelectorAll('.is-scene-target').length,
      scrollY: window.scrollY,
    }))()`);
    assert(afterTap.highlighted === 1 && afterTap.scrollY > 0,
      `A valid tap did not complete scene navigation: ${JSON.stringify(afterTap)}`);
    results.push({ id: 'BROWSER-MOBILE-SCENE-GESTURES', status: 'PASS', details: { expected: expectedStackLabels.length, discovered: Object.keys(mobileNodes).length, swipeLabel, afterSwipe, afterTap } });

    await setViewport(cdp, 1440, 900);
    await cdp.navigate(`${origin}${basePath}`);
    await cdp.evaluate('document.body.focus()');
    await cdp.key('Tab', 'Tab');
    const firstFocus = await cdp.evaluate('document.activeElement?.className');
    assert(String(firstFocus).includes('skip-link'), 'First keyboard focus is not the skip link.');
    const focusOutline = await cdp.evaluate(`(() => { const s=getComputedStyle(document.activeElement); return {style:s.outlineStyle,width:s.outlineWidth}; })()`);
    assert(focusOutline.style !== 'none' && Number.parseFloat(focusOutline.width) >= 2, 'Visible focus outline is missing.');
    await cdp.key('Enter', 'Enter');
    const skipHash = await cdp.evaluate('location.hash');
    assert(skipHash === '#content', 'Skip link did not target main content.');

    await cdp.evaluate(`document.querySelector('[data-project]')?.focus()`);
    await cdp.key('Enter', 'Enter');
    const dialogOpen = await cdp.evaluate(`(() => ({
      open: document.getElementById('case')?.getAttribute('aria-hidden') === 'false',
      focus: document.activeElement?.id,
      mainInert: document.getElementById('content')?.inert,
      labelledBy: document.getElementById('case-panel')?.getAttribute('aria-labelledby'),
    }))()`);
    assert(dialogOpen.open && dialogOpen.focus === 'case-close' && dialogOpen.mainInert && dialogOpen.labelledBy === 'case-title', 'Dialog focus/inert/name contract failed.');
    await cdp.key('Escape', 'Escape');
    const dialogClosed = await cdp.evaluate(`(() => ({ closed: document.getElementById('case')?.getAttribute('aria-hidden') === 'true', restored: document.activeElement?.hasAttribute('data-project'), mainInert: document.getElementById('content')?.inert }))()`);
    assert(dialogClosed.closed && dialogClosed.restored && !dialogClosed.mainInert, 'Dialog close did not restore focus/background state.');
    results.push({ id: 'BROWSER-KEYBOARD-DIALOG', status: 'PASS', details: { firstFocus, focusOutline, dialogOpen, dialogClosed } });

    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: drawCounterSource });
    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await cdp.navigate(`${origin}${basePath}`);
    const reduced = await cdp.evaluate(`(() => ({
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      ready: document.body.classList.contains('is-ready'),
      revealOpacity: getComputedStyle(document.querySelector('.reveal')).opacity,
      bodyAnimationDuration: getComputedStyle(document.body).animationDuration,
      drawCalls: window.__sceneDrawCalls,
    }))()`);
    assert(reduced.matches && reduced.ready && reduced.revealOpacity === '1', 'Reduced-motion contract failed.');
    assert(reduced.drawCalls > 0, 'Reduced-motion draw-call instrumentation did not observe the static render.');

    const reducedLabel = await cdp.evaluate(`document.querySelector('[data-scene-target^="stack-"]')?.textContent?.trim()`);
    const reducedNode = await discoverSceneNodes(cdp, 1440, 900, [reducedLabel]);
    const reducedPoint = reducedNode[reducedLabel];
    assert(reducedPoint, 'Reduced-motion scene node was not pickable in its static final formation.');
    await movePointer(cdp, reducedPoint.x, reducedPoint.y);
    await sleep(80);
    const drawsBeforeRepeatedMove = await cdp.evaluate('window.__sceneDrawCalls');
    for (let index = 0; index < 20; index += 1) {
      await movePointer(cdp, reducedPoint.x + (index % 2), reducedPoint.y);
    }
    await sleep(80);
    const repeatedMove = await cdp.evaluate(`(() => ({
      drawCalls: window.__sceneDrawCalls,
      label: document.querySelector('.scene-tip--visible')?.textContent?.trim(),
    }))()`);
    assert(repeatedMove.label === reducedLabel, 'Reduced-motion hover did not remain on the same node.');
    assert(repeatedMove.drawCalls === drawsBeforeRepeatedMove, 'Reduced-motion rendered a full WebGL frame for unchanged hover pointer moves.');

    await cdp.screenshot(resolve(artifactDir, 'reduced-motion.png'));
    results.push({ id: 'BROWSER-REDUCED-MOTION', status: 'PASS', details: { ...reduced, reducedLabel, drawsBeforeRepeatedMove, repeatedMove } });
    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [] });

    await cdp.navigate(`${origin}${basePath}`);
    const contextLoss = await cdp.evaluate(`(async () => {
      const canvas=document.getElementById('gl');
      const gl=canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const extension=gl?.getExtension('WEBGL_lose_context');
      if (!extension) return {supported:false, content:(document.querySelector('main')?.innerText||'').length};
      extension.loseContext();
      await new Promise((resolve) => setTimeout(resolve, 250));
      extension.restoreContext();
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {supported:true, content:(document.querySelector('main')?.innerText||'').length, ready:document.body.classList.contains('is-ready')};
    })()`);
    assert(contextLoss.content > 1000 && (!contextLoss.supported || contextLoss.ready), 'WebGL context loss damaged primary content.');
    results.push({ id: 'BROWSER-WEBGL-CONTEXT', status: 'PASS', details: contextLoss });

    await cdp.navigate(`${origin}${basePath}en/services/webgl-interfaces/`);
    const deep = await pageContract(cdp);
    assert(deep.lang === 'en' && deep.h1Count === 1 && deep.mainTextLength > 400, 'English deep route failed.');
    results.push({ id: 'BROWSER-DEEP-ROUTE', status: 'PASS', details: deep });

    await cdp.navigate(`${origin}${basePath}missing-route/`);
    const notFound = await cdp.evaluate(`(() => ({title:document.title,h1:document.querySelector('h1')?.textContent,home:[...document.links].some((a)=>a.getAttribute('href')==='${basePath}')}))()`);
    assert(notFound.h1 && notFound.home, '404 route lacks recovery navigation.');
    results.push({ id: 'BROWSER-404', status: 'PASS', details: notFound });

    await cdp.navigate(`${origin}${basePath}`);
    await cdp.evaluate(`document.querySelector('[data-lang-link]')?.focus()`);
    await cdp.key('Enter', 'Enter');
    await sleep(1800);
    const keyboardEnglish = await pageContract(cdp);
    assert(await cdp.evaluate('location.pathname') === `${basePath}en/` && keyboardEnglish.lang === 'en' && keyboardEnglish.activeLocale === 'en', 'Keyboard activation of EN did not open the English interactive homepage.');
    await cdp.evaluate(`document.querySelector('[data-lang-link]')?.focus()`);
    await cdp.key('Enter', 'Enter');
    await sleep(1800);
    const keyboardRussian = await pageContract(cdp);
    assert(await cdp.evaluate('location.pathname') === basePath && keyboardRussian.lang === 'ru' && keyboardRussian.activeLocale === 'ru', 'Keyboard activation of RU did not open the Russian interactive homepage.');
    results.push({ id: 'BROWSER-KEYBOARD-LOCALE-NAVIGATION', status: 'PASS', details: { keyboardEnglish, keyboardRussian } });

    await cdp.navigate(`${origin}${basePath}`);
    await cdp.navigate(`${origin}${basePath}en/`);
    await cdp.evaluate('history.back()');
    await sleep(1000);
    const backPath = await cdp.evaluate('location.pathname');
    await cdp.evaluate('history.forward()');
    await sleep(1000);
    const forwardPath = await cdp.evaluate('location.pathname');
    assert(backPath === basePath && forwardPath === `${basePath}en/`, 'Back/Forward navigation did not preserve localized physical routes.');
    results.push({ id: 'BROWSER-HISTORY', status: 'PASS', details: { backPath, forwardPath } });
  } finally {
    await browser.close();
  }
}

async function runFallback(origin, results) {
  const browser = await launchChrome(['--disable-webgl', '--disable-software-rasterizer']);
  try {
    await browser.cdp.navigate(`${origin}${basePath}`);
    const fallback = await pageContract(browser.cdp);
    assert(fallback.ready && !fallback.loaderPresent && fallback.mainTextLength > 1000, 'WebGL-disabled fallback did not expose primary content.');
    assert(fallback.webglFallback || fallback.canvasHidden === 'true', 'WebGL-disabled page did not enter a valid fallback state.');
    await browser.cdp.screenshot(resolve(artifactDir, 'webgl-disabled-fallback.png'));
    results.push({ id: 'BROWSER-WEBGL-DISABLED', status: 'PASS', details: fallback });
  } finally {
    await browser.close();
  }
}

/**
 * The hero belongs to the document, not to the bundle. With the runtime blocked
 * — a slow network, a failed asset — the page must still open its own name and
 * offer a call to action that can actually be pressed.
 */
async function runHeroWithoutRuntime(origin, results) {
  const browser = await launchChrome();
  const { cdp } = browser;
  try {
    await setViewport(cdp, 1440, 900);
    await cdp.send('Network.setBlockedURLs', { urls: ['*/assets/*.js'] });
    await cdp.navigate(`${origin}${basePath}`);
    await sleep(1600);
    const hero = await cdp.evaluate(`(() => {
      const read = (selector, property) => getComputedStyle(document.querySelector(selector))[property];
      const box = document.getElementById('hero-primary').getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        runtimeRan: document.body.classList.contains('is-ready'),
        headingLength: document.querySelector('h1').textContent.trim().length,
        lineOpacity: Number(read('.hero__line', 'opacity')),
        lineClip: read('.hero__line', 'clipPath'),
        taglineOpacity: Number(read('.hero__tagline', 'opacity')),
        actionsOpacity: Number(read('.hero__actions', 'opacity')),
        ctaReachable: hit !== null && hit.closest('#hero-primary') !== null,
      };
    })()`);
    assert(!hero.runtimeRan, 'The runtime was expected to stay blocked for this contract.');
    assert(hero.headingLength > 0 && hero.lineOpacity === 1 && !hero.lineClip.includes('100%')
      && hero.taglineOpacity === 1 && hero.actionsOpacity === 1 && hero.ctaReachable,
      `The hero did not open on its own without the runtime: ${JSON.stringify(hero)}`);
    await cdp.screenshot(resolve(artifactDir, 'hero-without-runtime.png'));
    results.push({ id: 'BROWSER-HERO-WITHOUT-RUNTIME', status: 'PASS', details: hero });
  } finally {
    await browser.close();
  }
}

async function domHtml(cdp) {
  const document = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const result = await cdp.send('DOM.getOuterHTML', { nodeId: document.root.nodeId });
  return result.outerHTML;
}

async function runNoJs(origin, results) {
  const browser = await launchChrome(['--disable-javascript']);
  try {
    await browser.cdp.navigate(`${origin}${basePath}`);
    const rootHtml = await domHtml(browser.cdp);
    const noJs = {
      langRu: /<html\b[^>]*\blang=["']ru["']/iu.test(rootHtml),
      hasH1: /<h1\b/iu.test(rootHtml),
      hasMain: /<main\b[^>]*\bid=["']content["']/iu.test(rootHtml),
      englishHref: rootHtml.includes(`href="${basePath}en/"`),
      loaderAbsent: !/<[^>]+\bid=["']loader["']/iu.test(rootHtml),
    };
    assert(noJs.langRu && noJs.hasH1 && noJs.hasMain && noJs.englishHref && noJs.loaderAbsent, 'Homepage no-JS fallback contract failed.');
    await browser.cdp.screenshot(resolve(artifactDir, 'no-js-homepage.png'));

    await browser.cdp.navigate(`${origin}${basePath}en/`);
    const englishHomeHtml = await domHtml(browser.cdp);
    const englishNoJs = {
      langEn: /<html\b[^>]*\blang=["']en["'][^>]*\bdata-locale=["']en["']/iu.test(englishHomeHtml),
      hasH1: /<h1\b/iu.test(englishHomeHtml),
      hasCanvas: /<canvas\b[^>]*\bid=["']gl["']/iu.test(englishHomeHtml),
      hasModule: /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=/iu.test(englishHomeHtml),
      localizedShell: englishHomeHtml.includes('available for projects') && englishHomeHtml.includes('Language selection'),
      activeEnInert: /<span\b[^>]*data-lang-pill=["']en["'][^>]*aria-current=["']page["'][^>]*>EN<\/span>/iu.test(englishHomeHtml),
      russianHref: englishHomeHtml.includes(`href="${basePath}"`),
      loaderAbsent: !/<[^>]+\bid=["']loader["']/iu.test(englishHomeHtml),
    };
    assert(Object.values(englishNoJs).every(Boolean), 'English homepage no-JS localized shell contract failed.');
    await browser.cdp.screenshot(resolve(artifactDir, 'no-js-english-homepage.png'));

    await browser.cdp.navigate(`${origin}${basePath}en/services/webgl-interfaces/`);
    const deepHtml = await domHtml(browser.cdp);
    const deepNoJs = {
      langEn: /<html\b[^>]*\blang=["']en["']/iu.test(deepHtml),
      hasH1: /<h1\b/iu.test(deepHtml),
      hasMain: /<main\b/iu.test(deepHtml),
      hasSourceEntry: /\/src\/main\.ts/iu.test(deepHtml),
    };
    assert(deepNoJs.langEn && deepNoJs.hasH1 && deepNoJs.hasMain && !deepNoJs.hasSourceEntry, 'Static deep route fails without JavaScript.');
    results.push({ id: 'BROWSER-NO-JS', status: 'PASS', details: { root: noJs, englishHome: englishNoJs, deep: deepNoJs } });
  } finally {
    await browser.close();
  }
}

await mkdir(artifactDir, { recursive: true });
const configuredOrigin = process.env.BROWSER_BASE_ORIGIN?.replace(/\/$/u, '');
const localSite = configuredOrigin ? null : await startSiteServer();
const origin = configuredOrigin ?? localSite.origin;
const results = [];
let failure;
try {
  await runIdleRegression(origin, results);
  await runPrimary(origin, results);
  await runHeroWithoutRuntime(origin, results);
  await runFallback(origin, results);
  await runNoJs(origin, results);
} catch (error) {
  failure = error instanceof Error ? error.stack ?? error.message : String(error);
  results.push({ id: 'BROWSER-HARNESS', status: 'FAIL', details: failure });
} finally {
  if (localSite) await new Promise((resolvePromise) => localSite.server.close(resolvePromise));
}

const report = {
  schemaVersion: 1,
  subject: 'WEBGL-PORTFOLIO-INTERACTIVE-EN-AND-HERO-ARTIFACT-REMEDIATION-08-BROWSER-SMOKE',
  chromePath,
  origin,
  artifactDir,
  total: results.length,
  passed: results.filter((result) => result.status === 'PASS').length,
  failed: results.filter((result) => result.status === 'FAIL').length,
  results,
};
await writeFile(resolve(artifactDir, 'browser-smoke.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (failure) throw new Error(`Browser smoke failed. See ${resolve(artifactDir, 'browser-smoke.json')}\n${failure}`);
console.log(`Browser smoke passed: ${report.passed}/${report.total}. Artifacts: ${artifactDir}`);
