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
      const waiters = this.waiters.get(message.method) ?? [];
      this.waiters.delete(message.method);
      for (const waiter of waiters) waiter.resolve(message.params ?? {});
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
      canvasHidden: document.getElementById('gl')?.getAttribute('aria-hidden'),
      englishHref: document.getElementById('lang-toggle')?.getAttribute('href'),
      contactStatusRole: document.getElementById('contact-sent')?.getAttribute('role'),
      webglFallback: document.documentElement.classList.contains('webgl-fallback'),
    };
  })()`);
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
}

async function runPrimary(origin, results) {
  const browser = await launchChrome();
  const { cdp } = browser;
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
    assert(desktop.canvasHidden === 'true', 'Decorative canvas is exposed to assistive technology.');
    assert(desktop.englishHref === `${basePath}en/`, 'No-JS English navigation target is incorrect.');
    assert(desktop.contactStatusRole === 'status', 'Contact feedback is not a live status region.');
    await cdp.screenshot(resolve(artifactDir, 'desktop-1440x900.png'));
    results.push({ id: 'BROWSER-DESKTOP', status: 'PASS', details: desktop });

    for (const viewport of [
      { id: 'BROWSER-TABLET', width: 768, height: 1024, mobile: true, screenshot: 'tablet-768x1024.png' },
      { id: 'BROWSER-MOBILE', width: 390, height: 844, mobile: true, screenshot: 'mobile-390x844.png' },
      { id: 'BROWSER-LANDSCAPE', width: 844, height: 390, mobile: true, screenshot: 'landscape-844x390.png' },
    ]) {
      await setViewport(cdp, viewport.width, viewport.height, viewport.mobile);
      await cdp.navigate(`${origin}${basePath}`);
      const contract = await pageContract(cdp);
      const languageTarget = await cdp.evaluate(`(() => { const r=document.getElementById('lang-toggle')?.getBoundingClientRect(); return r ? {width:r.width,height:r.height}:null; })()`);
      assert(contract.horizontalOverflow <= 1, `${viewport.id} has horizontal overflow.`);
      assert(contract.ready && contract.mainTextLength > 1000, `${viewport.id} did not render primary content.`);
      assert(languageTarget && languageTarget.height >= 44, `${viewport.id} language target is below 44px.`);
      await cdp.screenshot(resolve(artifactDir, viewport.screenshot));
      results.push({ id: viewport.id, status: 'PASS', details: { ...contract, languageTarget } });
    }

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

    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await cdp.navigate(`${origin}${basePath}`);
    const reduced = await cdp.evaluate(`(() => ({
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      ready: document.body.classList.contains('is-ready'),
      revealOpacity: getComputedStyle(document.querySelector('.reveal')).opacity,
      animationDuration: getComputedStyle(document.querySelector('.loader__ring') || document.body).animationDuration,
    }))()`);
    assert(reduced.matches && reduced.ready && reduced.revealOpacity === '1', 'Reduced-motion contract failed.');
    await cdp.screenshot(resolve(artifactDir, 'reduced-motion.png'));
    results.push({ id: 'BROWSER-REDUCED-MOTION', status: 'PASS', details: reduced });
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
    await cdp.navigate(`${origin}${basePath}en/`);
    await cdp.evaluate('history.back()');
    await sleep(800);
    const historyPath = await cdp.evaluate('location.pathname');
    assert(historyPath === basePath, 'Back navigation did not restore the homepage path.');
    results.push({ id: 'BROWSER-HISTORY', status: 'PASS', details: { historyPath } });
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
      loaderNonBlockingCss: rootHtml.includes('pointer-events:none'),
    };
    assert(noJs.langRu && noJs.hasH1 && noJs.hasMain && noJs.englishHref && noJs.loaderNonBlockingCss, 'Homepage no-JS fallback contract failed.');
    await browser.cdp.screenshot(resolve(artifactDir, 'no-js-homepage.png'));

    await browser.cdp.navigate(`${origin}${basePath}en/services/webgl-interfaces/`);
    const deepHtml = await domHtml(browser.cdp);
    const deepNoJs = {
      langEn: /<html\b[^>]*\blang=["']en["']/iu.test(deepHtml),
      hasH1: /<h1\b/iu.test(deepHtml),
      hasMain: /<main\b/iu.test(deepHtml),
      hasSourceEntry: /\/src\/main\.ts/iu.test(deepHtml),
    };
    assert(deepNoJs.langEn && deepNoJs.hasH1 && deepNoJs.hasMain && !deepNoJs.hasSourceEntry, 'Static deep route fails without JavaScript.');
    results.push({ id: 'BROWSER-NO-JS', status: 'PASS', details: { root: noJs, deep: deepNoJs } });
  } finally {
    await browser.close();
  }
}

await mkdir(artifactDir, { recursive: true });
const { server, origin } = await startSiteServer();
const results = [];
let failure;
try {
  await runPrimary(origin, results);
  await runFallback(origin, results);
  await runNoJs(origin, results);
} catch (error) {
  failure = error instanceof Error ? error.stack ?? error.message : String(error);
  results.push({ id: 'BROWSER-HARNESS', status: 'FAIL', details: failure });
} finally {
  await new Promise((resolvePromise) => server.close(resolvePromise));
}

const report = {
  schemaVersion: 1,
  subject: 'WEBGL-PORTFOLIO-REMEDIATION-03-BROWSER-SMOKE',
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
