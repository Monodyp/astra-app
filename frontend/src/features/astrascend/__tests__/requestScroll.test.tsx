import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useContext } from 'react';
import {
  MemoryRouter,
  Route,
  Routes,
  UNSAFE_NavigationContext,
  type Navigator,
} from 'react-router-dom';
import { AstrascendLayout } from '../components/AstrascendLayout';
import { RequestPage } from '../pages/RequestPage';

function open(path = '/astrascend/request?service=makeform') {
  let navigator!: Navigator;
  function ObserveNavigation() {
    navigator = useContext(UNSAFE_NavigationContext).navigator;
    return null;
  }
  render(
    <MemoryRouter initialEntries={[path]}>
      <ObserveNavigation />
      <Routes>
        <Route path="/astrascend" element={<AstrascendLayout />}>
          <Route index element={<section id="services">Services</section>} />
          <Route path="request" element={<RequestPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  return navigator;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('scrollY', 0);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('request scroll behavior', () => {
  it('asks the router to preserve scroll when selecting each service', () => {
    const replace = vi.spyOn(open(), 'replace');
    for (const service of ['upshift', 'linkup', 'reign', 'makeform']) {
      fireEvent.click(
        screen.getByRole('radio', { name: new RegExp(service, 'i') })
      );
      expect(replace).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: `?service=${service}` }),
        undefined,
        { replace: true, preventScrollReset: true }
      );
    }
  });

  it('does not reset the page when switching among all four services', () => {
    open();
    vi.stubGlobal('scrollY', 320);
    vi.mocked(window.scrollTo).mockClear();
    for (const service of ['upshift', 'linkup', 'reign', 'makeform']) {
      const radio = screen.getByRole('radio', {
        name: new RegExp(service, 'i'),
      }) as HTMLInputElement;
      fireEvent.click(radio);
      expect(radio.checked).toBe(true);
      expect(window.scrollTo).not.toHaveBeenCalled();
    }
  });

  it('scrolls to the top on initial entry and when navigating between pages', () => {
    open();
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 });
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'ASTRAscend home' }));
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 });
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'Start a request' }));
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 });
  });

  it('scrolls to a new anchor and preserves position on later query changes', () => {
    const navigator = open();
    const target = document.getElementById('as-main')!;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    vi.mocked(window.scrollTo).mockClear();
    act(() => navigator.push('/astrascend/request?service=makeform#as-main'));
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
      behavior: 'smooth',
      block: 'start',
    });
    scrollIntoView.mockClear();
    act(() => navigator.replace('/astrascend/request?service=upshift#as-main'));
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
