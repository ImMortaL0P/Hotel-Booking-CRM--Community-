import { useEffect, useRef, useState } from 'react';

/**
 * Render long tables progressively: the first `initial` rows immediately, then
 * `step` more whenever the sentinel row scrolls near view. Rendering all ~3,000
 * booking rows at once took ~4s; the first screenful is what matters.
 *
 * `resetKey` (e.g. the active filters) scrolls the window back to the start;
 * background data refreshes don't, so the list never jumps while scrolling.
 */
export function useProgressiveList<T>(items: T[], resetKey: unknown, initial = 60, step = 150) {
  const [limit, setLimit] = useState(initial);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => { setLimit(initial); }, [resetKey, initial]);

  const hasMore = limit < items.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setLimit(l => l + step);
      },
      // Observe within the table's own scroll container (not the viewport),
      // and start loading well before the user reaches the end.
      { root: scrollParent(el), rootMargin: '800px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, limit, step]);

  return {
    visible: hasMore ? items.slice(0, limit) : items,
    hasMore,
    remaining: Math.max(0, items.length - limit),
    sentinelRef
  };
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === 'auto' || overflowY === 'scroll') return p;
  }
  return null;
}
