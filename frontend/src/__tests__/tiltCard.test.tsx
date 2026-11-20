import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TiltCard } from '../components/id/tilt-wrapper';

const REST = 'perspective(700px) rotateX(20deg) rotateY(12deg) rotateZ(-20deg)';

function setDesktop(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === '(min-width: 1024px)' ? matches : false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList
  );
}

function renderCard(desktopInteractionOnly = false) {
  render(
    <TiltCard desktopInteractionOnly={desktopInteractionOnly}>
      <p>Card face</p>
    </TiltCard>
  );
  const face = screen.getByText('Card face');
  const tilt = face.parentElement!.parentElement as HTMLElement;
  const hoverArea = tilt.parentElement as HTMLElement;
  vi.spyOn(hoverArea, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
  } as DOMRect);
  return { tilt, hoverArea };
}

function moveTo(target: HTMLElement, x: number, y: number) {
  fireEvent.pointerMove(target, {
    pointerType: 'mouse',
    clientX: x,
    clientY: y,
  });
}

beforeAll(() => {
  if ('PointerEvent' in window) return;
  class TestPointerEvent extends MouseEvent {
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? '';
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: TestPointerEvent,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tilt card', () => {
  it('rests at the angled pose with perspective in the transform', () => {
    setDesktop(true);
    const { tilt } = renderCard();
    expect(tilt.style.getPropertyValue('--tilt-transform')).toBe(REST);
    expect(tilt.style.getPropertyValue('--tilt-rest-transform')).toBe(REST);
  });

  it('follows the pointer and returns to rest when the pointer leaves', () => {
    setDesktop(true);
    const { tilt, hoverArea } = renderCard();
    moveTo(hoverArea, 200, 50);
    expect(tilt.style.getPropertyValue('--tilt-transform')).toBe(
      'perspective(700px) rotateX(20deg) rotateY(21deg) rotateZ(-20deg)'
    );
    fireEvent.pointerLeave(hoverArea, { relatedTarget: tilt });
    expect(tilt.style.getPropertyValue('--tilt-transform')).not.toBe(REST);
    fireEvent.pointerLeave(hoverArea, { relatedTarget: document.body });
    expect(tilt.style.getPropertyValue('--tilt-transform')).toBe(REST);
  });

  it('eases small pointer movements', () => {
    setDesktop(true);
    const { tilt, hoverArea } = renderCard();
    moveTo(hoverArea, 150, 50);
    const rotateY = Number(
      /rotateY\(([\d.]+)deg\)/.exec(
        tilt.style.getPropertyValue('--tilt-transform')
      )![1]
    );
    expect(rotateY).toBeCloseTo(12 + 0.5 ** 1.5 * 9);
  });

  it('keeps the resting pose below the desktop breakpoint for a preview card', () => {
    setDesktop(false);
    const { tilt, hoverArea } = renderCard(true);
    moveTo(hoverArea, 200, 100);
    expect(tilt.style.getPropertyValue('--tilt-transform')).toBe(REST);
    expect(tilt.className).toContain('[transform:var(--tilt-rest-transform)]');
    expect(tilt.className).toContain('lg:[transform:var(--tilt-transform)]');
  });
});
