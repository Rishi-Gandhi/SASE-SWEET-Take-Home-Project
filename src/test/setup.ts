import '@testing-library/jest-dom/vitest';

// jsdom ships neither of these, and the app treats both as optional. Stubbing
// them keeps the tests exercising the real code paths rather than the guards.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// Universally supported in browsers, absent from jsdom. Unlike matchMedia and
// the Web Animations API, the app is right to assume this one exists.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
