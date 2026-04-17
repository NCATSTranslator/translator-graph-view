import '@testing-library/jest-dom/vitest';

// jsdom polyfills for APIs used by @xyflow/react
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  class DOMMatrixReadOnlyMock {
    m22 = 1;
  }
  // @ts-expect-error — minimal polyfill for xyflow
  globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyMock;
}

if (!Object.prototype.hasOwnProperty.call(Element.prototype, 'scrollTo')) {
  Element.prototype.scrollTo = () => {};
}
