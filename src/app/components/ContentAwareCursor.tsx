import React, { useEffect, useState, useRef } from 'react';
import { Maximize2 } from 'lucide-react';

type CursorMode = 'default' | 'pointer' | 'view' | 'text' | 'action';

export function ContentAwareCursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<CursorMode>('default');
  const [label, setLabel] = useState<string>('');

  const modeRef = useRef<CursorMode>('default');
  const labelRef = useRef<string>('');
  const visibleRef = useRef<boolean>(false);

  const mousePos = useRef({ x: -200, y: -200 });
  const ringPos = useRef({ x: -200, y: -200 });
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    // Only enable on desktop devices with hover & fine pointer capability
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mediaQuery.matches) return;
    setEnabled(true);

    let checkPending = false;
    let lastHoverTarget: HTMLElement | null = null;

    const evaluateTarget = (target: HTMLElement | null) => {
      let nextMode: CursorMode = 'default';
      let nextLabel = '';

      if (target) {
        // Explicit data-cursor attributes
        const explicitCursor = target.closest('[data-cursor]')?.getAttribute('data-cursor');
        if (explicitCursor === 'view') {
          nextMode = 'view';
          nextLabel = 'VIEW';
        } else if (explicitCursor === 'pointer') {
          nextMode = 'pointer';
        } else if (target.tagName === 'IMG' || target.closest('.cursor-zoom-in') || target.closest('[title*="resolution"]')) {
          nextMode = 'view';
          nextLabel = 'VIEW';
        } else if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
          nextMode = 'text';
        } else if (
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.closest('button') ||
          target.closest('a') ||
          target.getAttribute('role') === 'button' ||
          target.classList.contains('cursor-pointer') ||
          target.closest('.tactile-btn')
        ) {
          if (target.closest('.text-destructive') || target.closest('.bg-destructive') || target.closest('[title*="Delete"]')) {
            nextMode = 'action';
            nextLabel = 'DELETE';
          } else {
            nextMode = 'pointer';
          }
        }
      }

      // Only trigger React state change if the mode or label actually changed
      if (modeRef.current !== nextMode || labelRef.current !== nextLabel) {
        modeRef.current = nextMode;
        labelRef.current = nextLabel;
        setMode(nextMode);
        setLabel(nextLabel);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
        // Snap ring directly on first move to prevent offscreen flying
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
      }

      // Zero-latency instant hardware transform for the center dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Throttled target inspection using rAF to prevent DOM traversal thrashing
      lastHoverTarget = e.target as HTMLElement | null;
      if (!checkPending) {
        checkPending = true;
        requestAnimationFrame(() => {
          evaluateTarget(lastHoverTarget);
          checkPending = false;
        });
      }
    };

    const onMouseEnter = () => {
      visibleRef.current = true;
      setVisible(true);
    };

    const onMouseLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('mouseleave', onMouseLeave);

    // High-performance elastic kinetic trailing loop
    const render = () => {
      const dx = mousePos.current.x - ringPos.current.x;
      const dy = mousePos.current.y - ringPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Snap immediately if large discontinuity (e.g. window re-entry)
      if (dist > 350) {
        ringPos.current.x = mousePos.current.x;
        ringPos.current.y = mousePos.current.y;
      } else {
        // Tight, responsive elastic tracking (0.42 factor = snappy without lagging)
        const factor = dist > 80 ? 0.48 : 0.40;
        ringPos.current.x += dx * factor;
        ringPos.current.y += dy * factor;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      rafId.current = requestAnimationFrame(render);
    };
    rafId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (!enabled) return null;

  const isPointer = mode === 'pointer';
  const isView = mode === 'view';
  const isText = mode === 'text';
  const isAction = mode === 'action';

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[9998] overflow-hidden transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* Central Instant Hardware Dot (Zero-delay translate3d, only morph dimensions/color) */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 rounded-full transition-[width,height,margin,background-color,opacity] duration-150 ease-out ${
          isText
            ? 'w-1 h-4 -ml-0.5 -mt-2 bg-primary rounded-xs'
            : isView
            ? 'opacity-0 w-2 h-2 -ml-1 -mt-1'
            : isPointer
            ? 'w-2 h-2 -ml-1 -mt-1 bg-primary'
            : isAction
            ? 'w-2 h-2 -ml-1 -mt-1 bg-destructive'
            : 'w-2 h-2 -ml-1 -mt-1 bg-[var(--ink)] dark:bg-white'
        }`}
        style={{ willChange: 'transform', transform: 'translate3d(-200px, -200px, 0)' }}
      />

      {/* Kinetic Fluid Trailing Ring (Transform driven strictly by rAF GPU, morphs driven by CSS) */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 flex items-center justify-center rounded-full select-none transition-[width,height,margin,background-color,border-color,opacity,box-shadow] duration-150 ease-out ${
          isView
            ? 'w-16 h-16 -ml-8 -mt-8 bg-primary/85 text-primary-foreground backdrop-blur-xs border border-primary/40 shadow-lg shadow-primary/20'
            : isPointer
            ? 'w-10 h-10 -ml-5 -mt-5 bg-primary/10 border border-primary/50 shadow-xs'
            : isAction
            ? 'w-11 h-11 -ml-5.5 -mt-5.5 bg-destructive/15 border border-destructive/60 text-destructive'
            : isText
            ? 'w-5 h-5 -ml-2.5 -mt-2.5 border border-primary/30 opacity-40'
            : 'w-7 h-7 -ml-3.5 -mt-3.5 border border-[var(--ink)]/35 dark:border-white/35 opacity-70'
        }`}
        style={{ willChange: 'transform', transform: 'translate3d(-200px, -200px, 0)' }}
      >
        {isView && (
          <div className="flex flex-col items-center justify-center text-[9px] font-mono font-bold tracking-widest uppercase leading-none">
            <Maximize2 className="w-3.5 h-3.5 mb-0.5" />
            <span>{label}</span>
          </div>
        )}
        {isAction && (
          <span className="text-[8.5px] font-mono font-bold tracking-wider">{label}</span>
        )}
      </div>
    </div>
  );
}
