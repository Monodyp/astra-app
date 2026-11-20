// jsdom lacks these browser APIs; Embla carousel and layout hooks need them.

if (!window.matchMedia) {
  // Plain functions (not vi.fn) so mock resets in individual tests cannot strip them.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }),
  });
}
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
for (const name of ['ResizeObserver', 'IntersectionObserver'] as const) {
  if (!(name in window)) {
    (window as unknown as Record<string, unknown>)[name] = NoopObserver;
    (globalThis as unknown as Record<string, unknown>)[name] = NoopObserver;
  }
}
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
