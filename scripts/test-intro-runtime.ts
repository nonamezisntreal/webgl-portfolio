import { initIntro } from '../src/ui/intro';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/* The activation module owns the scene's beat and the engagement record only:
   the hero's own arrival is stylesheet work, so no document is stubbed here. */
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

Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { userActivation: { hasBeenActive: false } },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function act(type: string): void {
  for (const listener of listeners.get(type) ?? []) {
    if (typeof listener === 'function') listener(new Event(type));
    else listener.handleEvent(new Event(type));
  }
}

let ignitions = 0;
const delayed = initIntro({ reducedMotion: false });
await sleep(10);
delayed.bindIgnite(() => { ignitions += 1; });
assert(ignitions === 1, 'A scene bound after the ignition beat did not receive exactly one ignition.');
delayed.bindIgnite(() => { ignitions += 10; });
assert(ignitions === 1, 'Binding the scene twice replayed the ignition.');
delayed.dispose();

ignitions = 0;
const skipped = initIntro({ reducedMotion: false });
skipped.skip();
await sleep(10);
skipped.bindIgnite(() => { ignitions += 1; });
assert(ignitions === 0, 'A skipped intro fired a late ignition when the scene bound.');
skipped.dispose();

ignitions = 0;
const reduced = initIntro({ reducedMotion: true });
await sleep(10);
reduced.bindIgnite(() => { ignitions += 1; });
assert(ignitions === 0, 'Reduced motion received the animated ignition.');
reduced.dispose();

ignitions = 0;
const engaged = initIntro({ reducedMotion: false });
assert(!engaged.engaged, 'An untouched page reported the visitor as already engaged.');
act('pointerdown');
assert(engaged.engaged, 'A press did not register as the visitor taking over.');
engaged.bindIgnite(() => { ignitions += 1; });
assert(ignitions === 0, 'A scene arriving after the visitor acted still fired its ignition.');
engaged.dispose();

assert([...listeners.values()].every((group) => group.size === 0), 'Intro teardown left global engagement listeners behind.');
console.log('Intro runtime regression tests passed: delayed binding, skip, engagement and reduced-motion ignition contracts.');