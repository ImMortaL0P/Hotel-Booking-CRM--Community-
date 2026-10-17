import React, { useState, useEffect } from 'react';
import logoUrl from '../../assets/logo.png';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface PreloaderProps {
  onComplete?: () => void;
  minDuration?: number; // default ~1100ms for smooth cinematic entry without lag
}

const STATUS_MESSAGES = [
  "Connecting to Sacred Desk...",
  "Verifying Step-Free Suites...",
  "Calibrating Temple Distance (500m)...",
  "Welcome to Sharda Palace"
];

export function Preloader({ onComplete, minDuration = 1000 }: PreloaderProps) {
  const [alreadyLoaded] = useState(() => {
    try {
      return sessionStorage.getItem('sharda_preloader_seen') === 'true';
    } catch {
      return false;
    }
  });

  const duration = alreadyLoaded ? 380 : minDuration;
  const [progress, setProgress] = useState(alreadyLoaded ? 50 : 15);
  const [messageIdx, setMessageIdx] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Smooth progress interpolation
    const start = performance.now();
    let frameId: number;

    const update = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 35) setMessageIdx(0);
      else if (pct < 70) setMessageIdx(1);
      else if (pct < 95) setMessageIdx(2);
      else setMessageIdx(3);

      if (elapsed < duration) {
        frameId = requestAnimationFrame(update);
      } else {
        setProgress(100);
        try {
          sessionStorage.setItem('sharda_preloader_seen', 'true');
        } catch {}
        setTimeout(() => {
          setIsDone(true);
          onComplete?.();
        }, 180);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--paper)] text-[var(--ink)] select-none overflow-hidden"
          style={{ willChange: 'opacity, transform' }}
        >
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent pointer-events-none opacity-80" />

          {/* Central Architectural Shield */}
          <div className="relative flex flex-col items-center text-center px-6 z-10">
            {/* Concentric Rotating Rings & Emblem */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              {/* Outer Slow Orbit */}
              <div className="absolute inset-0 rounded-full border border-primary/25 border-dashed animate-[spin_18s_linear_infinite]" />
              
              {/* Inner Pulse Ring */}
              <div className="absolute inset-2 rounded-full border border-primary/15 animate-ping opacity-30" />
              
              {/* Core Emblem Pod */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-20 h-20 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-lg shadow-primary/10 p-2 flex items-center justify-center"
              >
                <img
                  src={logoUrl}
                  alt="Hotel Sharda Palace"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </motion.div>
            </div>

            {/* Brand Title */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.32em] text-[var(--reg)] font-bold">
                <Sparkles className="w-3 h-3 text-[var(--reg)]" />
                <span>Hotel Sharda Palace</span>
              </div>
              <h2 className="font-serif italic text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
                Deoghar · Baidyanath Dham
              </h2>
            </motion.div>

            {/* Minimalist Progress Track */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="w-56 sm:w-64 mt-8 flex flex-col items-center gap-2.5"
            >
              <div className="w-full h-1 bg-[var(--line)] rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-[var(--reg)] rounded-full"
                  style={{ width: `${progress}%`, transition: 'width 0.12s linear' }}
                />
              </div>

              <div className="w-full flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="truncate max-w-[190px]">{STATUS_MESSAGES[messageIdx]}</span>
                <span className="font-bold text-[var(--ink)] tabular-nums">{progress}%</span>
              </div>
            </motion.div>
          </div>

          {/* Micro Footer Citation */}
          <div className="absolute bottom-6 font-mono text-[10px] text-muted-foreground tracking-wider uppercase opacity-60">
            500m Walk to Baba Baidyanath Mandir · Ground Floor Suites
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
