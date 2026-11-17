import { beforeEach } from 'vitest';

if (typeof window.IntersectionObserver !== 'function') {
    class TestIntersectionObserver implements IntersectionObserver {
        readonly root = null;
        readonly rootMargin = '';
        readonly scrollMargin = '';
        readonly thresholds: readonly number[] = [];
        onchange = null;

        disconnect() {}
        observe(_target: Element) {}
        takeRecords(): IntersectionObserverEntry[] {
            return [];
        }
        unobserve(_target: Element) {}
    }

    window.IntersectionObserver = TestIntersectionObserver;
}

if (typeof window.ResizeObserver !== 'function') {
    class TestResizeObserver implements ResizeObserver {
        disconnect() {}
        observe(_target: Element) {}
        unobserve(_target: Element) {}
    }

    window.ResizeObserver = TestResizeObserver;
}

beforeEach(() => {
    if (typeof window.matchMedia !== 'function') {
        window.matchMedia = (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        });
    }

    window.scrollTo = () => {};
});
