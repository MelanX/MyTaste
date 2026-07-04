import React, { useEffect, useRef, useState } from 'react';

const THRESHOLD = 70; // px of pull needed to trigger a refresh
const MAX = 100; // max visual pull distance
const RESISTANCE = 0.5; // finger travel -> indicator travel

/**
 * Lightweight pull-to-refresh for touch devices / installed PWA. Pulling down
 * while scrolled to the very top past the threshold hard-reloads the page (which
 * also picks up a new app / service-worker version). No dependency.
 */
const PullToRefresh: React.FC = () => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    // maxTouchPoints is the reliable touch test — `'ontouchstart' in window` is true
    // on most desktop browsers too.
    if (navigator.maxTouchPoints === 0) return;

    const setP = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      setDragging(true);
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pullRef.current !== 0) setP(0);
        return;
      }
      if (window.scrollY > 0) {
        startY.current = null;
        setP(0);
        return;
      }
      setP(Math.min(MAX, dy * RESISTANCE));
      if (e.cancelable) e.preventDefault(); // suppress native overscroll while engaged
    };

    const onEnd = () => {
      setDragging(false);
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setP(MAX);
        window.location.reload();
      } else {
        setP(0);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const visible = pull > 0 || refreshing;
  const ready = pull >= THRESHOLD;

  return (
    <div
      data-testid="pull-to-refresh"
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-0 z-[9998] flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-[0_2px_8px_var(--color-shadow-soft)]"
      style={{
        transform: `translateX(-50%) translateY(${Math.max(0, pull) - 44}px)`,
        opacity: visible ? 1 : 0,
        transition: dragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      <i
        className={`fa-solid fa-arrow-down text-accent transition-transform ${refreshing ? 'fa-spin' : ''} ${
          ready && !refreshing ? 'rotate-180' : ''
        }`}
      />
    </div>
  );
};

export default PullToRefresh;
