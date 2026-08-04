const BLOCK_BOUNDARY_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

const ALWAYS_HIDDEN_TAGS = new Set([
  'head', 'script', 'style', 'template', 'noscript', 'meta', 'link', 'title', 'base', 'source', 'track',
]);

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function assertExactKeys(value, allowedKeys, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...allowedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const unexpected = actual.filter((key) => !expected.includes(key));
    const missing = expected.filter((key) => !actual.includes(key));
    const details = [
      unexpected.length ? `unexpected keys: ${unexpected.join(', ')}` : '',
      missing.length ? `missing keys: ${missing.join(', ')}` : '',
    ].filter(Boolean).join('; ');
    throw new Error(`${label} keys must be exactly ${expected.join(', ')}${details ? ` (${details})` : ''}.`);
  }
}

export function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => safeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => safeCodePoint(Number.parseInt(code, 16)))
    .replace(/&(?:nbsp|NonBreakingSpace);/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function safeCodePoint(code) {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '\uFFFD';
  return String.fromCodePoint(code);
}

export function normalizeTextNfc(value) {
  return decodeHtmlEntities(value).normalize('NFC').replace(/\s+/gu, ' ').trim();
}

export function normalizeTextNfkc(value) {
  return decodeHtmlEntities(value)
    .normalize('NFKC')
    .replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function parseAttributes(tagSource) {
  const attributes = new Map();
  const start = tagSource.match(/^<\/?\s*[^\s/>]+/u)?.[0].length ?? 0;
  const body = tagSource.slice(start, tagSource.endsWith('/>') ? -2 : -1);
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu;
  for (const match of body.matchAll(pattern)) {
    const name = match[1].toLocaleLowerCase('en-US');
    if (attributes.has(name)) throw new Error(`HTML tag contains duplicate attribute ${name}.`);
    attributes.set(name, decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  return attributes;
}

function hasHiddenMetadataClass(attributes) {
  const value = `${attributes.get('class') ?? ''} ${attributes.get('id') ?? ''}`.toLocaleLowerCase('en-US');
  return /(?:^|[\s_-])(?:seo|schema|metadata|machine|jsonld|visually-hidden|sr-only|screen-reader-only)(?:$|[\s_-])/u.test(value);
}

function isHiddenElement(tagName, attributes) {
  if (ALWAYS_HIDDEN_TAGS.has(tagName)) return true;
  if (attributes.has('hidden') || attributes.has('inert')) return true;
  if ((attributes.get('aria-hidden') ?? '').trim().toLocaleLowerCase('en-US') === 'true') return true;
  const style = (attributes.get('style') ?? '').replace(/\s+/gu, '').toLocaleLowerCase('en-US');
  if (/(?:^|;)display:none(?:!important)?(?:;|$)/u.test(style)) return true;
  if (/(?:^|;)visibility:(?:hidden|collapse)(?:!important)?(?:;|$)/u.test(style)) return true;
  if (hasHiddenMetadataClass(attributes)) return true;
  return false;
}

export function visiblePerceivedText(html) {
  const tokens = String(html).match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/gu) ?? [];
  const stack = [];
  const output = [];
  let hiddenDepth = 0;

  for (const token of tokens) {
    if (!token.startsWith('<')) {
      if (hiddenDepth === 0) output.push(decodeHtmlEntities(token));
      continue;
    }
    if (/^<!--|^<!doctype|^<!\[CDATA\[/iu.test(token)) continue;
    const close = token.match(/^<\s*\/\s*([\w:-]+)/u);
    if (close) {
      const tagName = close[1].toLocaleLowerCase('en-US');
      let found = -1;
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].tagName === tagName) { found = index; break; }
      }
      if (found >= 0) {
        for (let index = stack.length - 1; index >= found; index -= 1) {
          if (stack[index].hidden) hiddenDepth -= 1;
        }
        stack.length = found;
      }
      if (BLOCK_BOUNDARY_TAGS.has(tagName) && hiddenDepth === 0) output.push(' ');
      continue;
    }
    const open = token.match(/^<\s*([\w:-]+)/u);
    if (!open) continue;
    const tagName = open[1].toLocaleLowerCase('en-US');
    let attributes;
    try {
      attributes = parseAttributes(token);
    } catch {
      attributes = new Map();
    }
    const hidden = isHiddenElement(tagName, attributes);
    if (BLOCK_BOUNDARY_TAGS.has(tagName) && hiddenDepth === 0) output.push(' ');
    if (!VOID_TAGS.has(tagName) && !/\/\s*>$/u.test(token)) {
      stack.push({ tagName, hidden });
      if (hidden) hiddenDepth += 1;
    }
  }
  return normalizeTextNfc(output.join(''));
}

export function parseJsonStrict(source, label = 'JSON') {
  const text = String(source);
  let index = 0;

  function fail(message) {
    throw new Error(`${label} is not valid strict JSON at offset ${index}: ${message}`);
  }
  function skipWhitespace() {
    while (index < text.length && /\s/u.test(text[index])) index += 1;
  }
  function parseStringToken() {
    if (text[index] !== '"') fail('expected a string');
    const start = index;
    index += 1;
    while (index < text.length) {
      const char = text[index];
      if (char === '"') {
        index += 1;
        try { return JSON.parse(text.slice(start, index)); }
        catch (error) { fail(error instanceof Error ? error.message : String(error)); }
      }
      if (char === '\\') {
        index += 1;
        if (index >= text.length) fail('unterminated escape sequence');
        if (text[index] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(index + 1, index + 5))) fail('invalid Unicode escape');
          index += 5;
          continue;
        }
        if (!/["\\/bfnrt]/u.test(text[index])) fail('invalid escape sequence');
        index += 1;
        continue;
      }
      if (char.charCodeAt(0) < 0x20) fail('unescaped control character');
      index += 1;
    }
    fail('unterminated string');
  }
  function parseValue(path) {
    skipWhitespace();
    if (text[index] === '{') return parseObject(path);
    if (text[index] === '[') return parseArray(path);
    if (text[index] === '"') { parseStringToken(); return; }
    const rest = text.slice(index);
    const primitive = rest.match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u)?.[0];
    if (!primitive) fail('unexpected token');
    index += primitive.length;
  }
  function parseObject(path) {
    index += 1;
    skipWhitespace();
    const keys = new Map();
    if (text[index] === '}') { index += 1; return; }
    while (index < text.length) {
      skipWhitespace();
      const key = parseStringToken();
      const normalized = key.normalize('NFC').toLocaleLowerCase('en-US');
      if (keys.has(normalized)) {
        throw new Error(`${label} contains duplicate JSON key ${JSON.stringify(key)} at ${path}; first spelling was ${JSON.stringify(keys.get(normalized))}.`);
      }
      keys.set(normalized, key);
      skipWhitespace();
      if (text[index] !== ':') fail('expected a colon after an object key');
      index += 1;
      parseValue(`${path}.${key}`);
      skipWhitespace();
      if (text[index] === '}') { index += 1; return; }
      if (text[index] !== ',') fail('expected a comma or closing brace');
      index += 1;
    }
    fail('unterminated object');
  }
  function parseArray(path) {
    index += 1;
    skipWhitespace();
    if (text[index] === ']') { index += 1; return; }
    let item = 0;
    while (index < text.length) {
      parseValue(`${path}[${item}]`);
      item += 1;
      skipWhitespace();
      if (text[index] === ']') { index += 1; return; }
      if (text[index] !== ',') fail('expected a comma or closing bracket');
      index += 1;
    }
    fail('unterminated array');
  }

  parseValue('$');
  skipWhitespace();
  if (index !== text.length) fail('trailing content after the JSON value');
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}

function decodeJavaScriptLiteral(literal) {
  const quote = literal[0];
  const body = literal.slice(1, -1);
  if (quote === '"') {
    try { return JSON.parse(literal); } catch { return body; }
  }
  return body
    .replace(/\\u\{([0-9a-f]+)\}/giu, (_, value) => safeCodePoint(Number.parseInt(value, 16)))
    .replace(/\\u([0-9a-f]{4})/giu, (_, value) => safeCodePoint(Number.parseInt(value, 16)))
    .replace(/\\x([0-9a-f]{2})/giu, (_, value) => safeCodePoint(Number.parseInt(value, 16)))
    .replace(/\\(?:\r\n|\r|\n)/gu, '')
    .replace(/\\n/gu, '\n')
    .replace(/\\r/gu, '\r')
    .replace(/\\t/gu, '\t')
    .replace(/\\b/gu, '\b')
    .replace(/\\f/gu, '\f')
    .replace(/\\v/gu, '\v')
    .replace(/\\0(?!\d)/gu, '\0')
    .replace(/\\([\\'"`])/gu, '$1');
}

export function collectJsonStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) for (const item of value) collectJsonStrings(item, output);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) collectJsonStrings(item, output);
  return output;
}

export function claimTextSurfaces(source, extension, label = 'public content') {
  const text = String(source);
  const surfaces = [text, decodeHtmlEntities(text)];
  const lowerExtension = extension.toLocaleLowerCase('en-US');
  if (lowerExtension === '.html' || lowerExtension === '.svg' || lowerExtension === '.xml') {
    surfaces.push(visiblePerceivedText(text));
    surfaces.push(decodeHtmlEntities(text.replace(/<[^>]+>/gu, '')));
  }
  if (lowerExtension === '.json') {
    try { surfaces.push(...collectJsonStrings(parseJsonStrict(text, label))); } catch { /* syntax is validated elsewhere */ }
  }
  if (['.js', '.jsx', '.ts', '.tsx'].includes(lowerExtension)) {
    const literalPattern = /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/gu;
    for (const match of text.matchAll(literalPattern)) surfaces.push(decodeJavaScriptLiteral(match[0]));
    const concatPattern = /(?:(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)\s*\+\s*)+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/gu;
    for (const match of text.matchAll(concatPattern)) {
      surfaces.push([...match[0].matchAll(literalPattern)].map((item) => decodeJavaScriptLiteral(item[0])).join(''));
    }
  }
  return [...new Set(surfaces.map((value) => normalizeTextNfkc(value)).filter(Boolean))];
}
