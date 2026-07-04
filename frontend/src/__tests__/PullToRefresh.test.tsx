import { cleanup, render } from '@testing-library/react';
import PullToRefresh from '../components/PullToRefresh';

function touch(type: string, clientY: number) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  (e as unknown as { touches: { clientY: number }[] }).touches = [{ clientY }];
  window.dispatchEvent(e);
}

let reload: ReturnType<typeof vi.fn>;
const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  reload = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { reload } });
});

afterEach(() => {
  cleanup(); // unmount so the component's window listeners are removed between tests
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation });
});

describe('PullToRefresh', () => {
  it('reloads after pulling down past the threshold from the top', () => {
    render(<PullToRefresh />);
    touch('touchstart', 100);
    touch('touchmove', 400); // dy=300 -> 150*0.5 clamped to 100 (>= threshold 70)
    touch('touchend', 400);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload for a short pull below the threshold', () => {
    render(<PullToRefresh />);
    touch('touchstart', 100);
    touch('touchmove', 160); // dy=60 -> 30px pull (< threshold)
    touch('touchend', 160);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when the page is scrolled down', () => {
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true, writable: true });
    render(<PullToRefresh />);
    touch('touchstart', 100);
    touch('touchmove', 400);
    touch('touchend', 400);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing on non-touch devices', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    render(<PullToRefresh />);
    touch('touchstart', 100);
    touch('touchmove', 400);
    touch('touchend', 400);
    expect(reload).not.toHaveBeenCalled();
  });
});
