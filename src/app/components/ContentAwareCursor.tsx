import React, { useEffect, useRef } from 'react';
import { Maximize2, MoveHorizontal, Check } from 'lucide-react';

type CursorMode = 'default' | 'pointer' | 'view' | 'drag' | 'text' | 'action';

export function ContentAwareCursor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const mousePos = useRef({ x: -200, y: -200 });
  const ringPos = useRef({ x: -200, y: -200 });
  const isLoopRunning = useRef(false);
  const isVisible = useRef(false);
  const currentMode = useRef<CursorMode>('default');
  const currentLabel = useRef('');

  useEffect(() => {
    // Only enable on desktop devices with hover & fine pointer capability
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mediaQuery.matches) return;

    const container = containerRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const labelEl = labelRef.current;
    const iconEl = iconRef.current;
    if (!container || !dot || !ring) return;

    container.style.display = 'block';

    let checkPending = false;
    let lastHoverTarget: HTMLElement | null = null;
    let rafId = 0;

    const applyMode = (nextMode: CursorMode, nextLabel: string) => {
      if (currentMode.current === nextMode && currentLabel.current === nextLabel) return;
      currentMode.current = nextMode;
      currentLabel.current = nextLabel;

      ring.setAttribute('data-mode', nextMode);
      dot.setAttribute('data-mode', nextMode);

      if (labelEl) {
        labelEl.textContent = nextLabel;
      }
      if (iconEl) {
        iconEl.style.display = nextMode === 'view' ? 'block' : 'none';
      }
    };

    const evaluateTarget = (target: HTMLElement | null) => {
      let nextMode: CursorMode = 'default';
      let nextLabel = '';

      if (target) {
        const explicitTarget = target.closest('[data-cursor]') as HTMLElement | null;
        if (explicitTarget) {
          const val = explicitTarget.getAttribute('data-cursor') as CursorMode;
          nextLabel = explicitTarget.getAttribute('data-cursor-label') || (val === 'view' ? 'VIEW' : val === 'drag' ? 'DRAG' : '');
          nextMode = val || 'pointer';
        } else if (
          target.tagName === 'IMG' ||
          target.closest('.cursor-zoom-in') ||
          target.closest('.group\\/img') ||
          target.closest('[title*="resolution"]')
        ) {
          nextMode = 'view';
          nextLabel = 'VIEW';
        } else if (target.closest('.touch-scroll') || target.closest('[data-cursor-drag]')) {
          nextMode = 'drag';
          nextLabel = 'DRAG';
        } else if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
          nextMode = 'text';
        } else if (
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.closest('button') ||
          target.closest('a') ||
          target.getAttribute('role') === 'button' ||
          (target.classList && target.classList.contains('cursor-pointer')) ||
          target.closest('.tactile-btn') ||
          target.closest('.cursor-pointer')
        ) {
          if (target.closest('.text-destructive') || target.closest('.bg-destructive') || target.closest('[title*="Delete"]')) {
            nextMode = 'action';
            nextLabel = 'DELETE';
          } else {
            nextMode = 'pointer';
          }
        }
      }

      applyMode(nextMode, nextLabel);
    };

    const render = () => {
      const dx = mousePos.current.x - ringPos.current.x;
      const dy = mousePos.current.y - ringPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.1) {
        // Sleep when ring has caught up to save 100% of idle CPU/GPU cycles
        ringPos.current.x = mousePos.current.x;
        ringPos.current.y = mousePos.current.y;
        ring.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
        isLoopRunning.current = false;
        return;
      }

      if (dist > 350) {
        // Snap immediately if large discontinuity (e.g. window re-entry)
        ringPos.current.x = mousePos.current.x;
        ringPos.current.y = mousePos.current.y;
      } else {
        // Tight, responsive elastic tracking
        const factor = dist > 80 ? 0.48 : 0.40;
        ringPos.current.x += dx * factor;
        ringPos.current.y += dy * factor;
      }

      ring.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      rafId = requestAnimationFrame(render);
    };

    const wakeLoop = () => {
      if (!isLoopRunning.current) {
        isLoopRunning.current = true;
        rafId = requestAnimationFrame(render);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisible.current) {
        isVisible.current = true;
        container.style.opacity = '1';
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
      }

      // Zero-latency instant hardware transform for the center dot
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

      wakeLoop();

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

    const onMouseEnter = (e: MouseEvent) => {
      isVisible.current = true;
      container.style.opacity = '1';
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      ringPos.current.x = e.clientX;
      ringPos.current.y = e.clientY;
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      ring.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };

    const onMouseLeave = () => {
      isVisible.current = false;
      container.style.opacity = '0';
    };

    const onWindowBlur = () => {
      isVisible.current = false;
      container.style.opacity = '0';
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onWindowBlur);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-200 opacity-0 hidden"
      aria-hidden="true"
    >
      {/* Central Instant Hardware Dot */}
      <div
        ref={dotRef}
        data-mode="default"
        className="fixed top-0 left-0 rounded-full transition-[width,height,margin,background-color,opacity,border-radius] duration-150 ease-out will-change-transform
          data-[mode=default]:w-2 data-[mode=default]:h-2 data-[mode=default]:-ml-1 data-[mode=default]:-mt-1 data-[mode=default]:bg-[var(--ink)] dark:data-[mode=default]:bg-white
          data-[mode=pointer]:w-2.5 data-[mode=pointer]:h-2.5 data-[mode=pointer]:-ml-[5px] data-[mode=pointer]:-mt-[5px] data-[mode=pointer]:bg-primary
          data-[mode=view]:opacity-0 data-[mode=view]:w-2 data-[mode=view]:h-2 data-[mode=view]:-ml-1 data-[mode=view]:-mt-1
          data-[mode=drag]:opacity-0 data-[mode=drag]:w-2 data-[mode=drag]:h-2
          data-[mode=text]:w-1 data-[mode=text]:h-4 data-[mode=text]:-ml-0.5 data-[mode=text]:-mt-2 data-[mode=text]:bg-primary data-[mode=text]:rounded-xs
          data-[mode=action]:w-2.5 data-[mode=action]:h-2.5 data-[mode=action]:-ml-[5px] data-[mode=action]:-mt-[5px] data-[mode=action]:bg-destructive"
        style={{ transform: 'translate3d(-200px, -200px, 0)' }}
      />

      {/* Kinetic Fluid Trailing Ring */}
      <div
        ref={ringRef}
        data-mode="default"
        className="fixed top-0 left-0 flex items-center justify-center rounded-full select-none transition-[width,height,margin,background-color,border-color,opacity,box-shadow,border-radius] duration-200 ease-out will-change-transform
          data-[mode=default]:w-8 data-[mode=default]:h-8 data-[mode=default]:-ml-4 data-[mode=default]:-mt-4 data-[mode=default]:border data-[mode=default]:border-[var(--ink)]/30 dark:data-[mode=default]:border-white/30 data-[mode=default]:opacity-80
          data-[mode=pointer]:w-12 data-[mode=pointer]:h-12 data-[mode=pointer]:-ml-6 data-[mode=pointer]:-mt-6 data-[mode=pointer]:bg-primary/10 data-[mode=pointer]:border data-[mode=pointer]:border-primary/50 data-[mode=pointer]:shadow-sm
          data-[mode=view]:w-18 data-[mode=view]:h-18 data-[mode=view]:-ml-9 data-[mode=view]:-mt-9 data-[mode=view]:bg-primary/90 data-[mode=view]:text-white data-[mode=view]:backdrop-blur-md data-[mode=view]:border data-[mode=view]:border-white/30 data-[mode=view]:shadow-xl data-[mode=view]:shadow-primary/25
          data-[mode=drag]:w-16 data-[mode=drag]:h-16 data-[mode=drag]:-ml-8 data-[mode=drag]:-mt-8 data-[mode=drag]:bg-[var(--ink)]/90 data-[mode=drag]:text-[var(--paper)] data-[mode=drag]:backdrop-blur-md data-[mode=drag]:border data-[mode=drag]:border-white/20 data-[mode=drag]:shadow-xl
          data-[mode=text]:w-6 data-[mode=text]:h-6 data-[mode=text]:-ml-3 data-[mode=text]:-mt-3 data-[mode=text]:border data-[mode=text]:border-primary/30 data-[mode=text]:opacity-40
          data-[mode=action]:w-12 data-[mode=action]:h-12 data-[mode=action]:-ml-6 data-[mode=action]:-mt-6 data-[mode=action]:bg-destructive/15 data-[mode=action]:border data-[mode=action]:border-destructive/60 data-[mode=action]:text-destructive"
        style={{ transform: 'translate3d(-200px, -200px, 0)' }}
      >
        <div className="flex flex-col items-center justify-center text-[9px] font-mono font-bold tracking-widest uppercase leading-none pointer-events-none">
          <div ref={iconRef} className="hidden mb-0.5">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
          <span ref={labelRef} />
        </div>
      </div>
    </div>
  );
}
