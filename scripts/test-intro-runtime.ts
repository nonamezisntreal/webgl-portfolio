import { initIntro } from '../src/ui/intro';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

interface FakeRoot {
  dataset: Record<string, string>;
  classList: {
    add(...names: string[]): void;
    remove(...names: string[]): void;
    contains(name: string): boolean;
  };
}

const classes = new Set<string>();
const root: FakeRoot = {
  dataset: {},
  classList: {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
  },
};

const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
const fakeWindow = {
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const group = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    group.add(listener);
    listeners.set(type, group);
  },
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    listeners.get(type)?.delete(listener);
  },
};

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: root } });
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { userActivation: { hasBeenActive: false } },
});
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let ignitions = 0;
const delayed = initIntro({ reducedMotion: false });
await sleep(10);
delayed.bindIgnite(() => { ignitions += 1; });
assert(ignitions === 1, 'A scene bound after the ignition beat did not receive exactly one ignition.');
delayed.bindIgnite(() => { ignitions += 10; });
assert(ignitions === 1, 'Binding the scene twice replayed the ignition.');
delayed.dispose();

classes.clear();
storage.clear();
ignitions = 0;
const skipped = initIntro({ reducedMotion: false });
skipped.skip();
await sleep(10);
skipped.bindIgnite(() => { ignitions += 1; });
assert(ignitions === 0, 'A skipped intro fired a late ignition when the scene bound.');
skipped.dispose();

classes.clear();
storage.clear();
ignitions = 0;
const reduced = initIntro({ reducedMotion: true });
await sleep(10);
reduced.bindIgnite(() => { ignitions += 1; });
assert(ignitions === 0, 'Reduced motion received the animated ignition.');
reduced.dispose();

assert([...listeners.values()].every((group) => group.size === 0), 'Intro teardown left global engagement listeners behind.');
console.log('Intro runtime regression tests passed: delayed binding, skip and reduced-motion ignition contracts.');