import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// Activity counters behind the Rizz Score screen. Held in memory for the
// session — there is no backend yet, so nothing here is persisted.
interface ScoreContextValue {
  generated: number;
  copied: number;
  streak: number;
  bestStreak: number;
  registerGenerate: () => void;
  registerCopy: () => void;
}

const ScoreContext = createContext<ScoreContextValue>({
  generated: 0,
  copied: 0,
  streak: 0,
  bestStreak: 0,
  registerGenerate: () => {},
  registerCopy: () => {},
});

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export const ScoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [generated, setGenerated] = useState(0);
  const [copied, setCopied] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const lastActive = useRef<string | null>(null);
  const streakRef = useRef(0);

  // Called on every generate/copy: the first action of a new day either
  // extends yesterday's streak or starts a fresh one.
  const markActive = useCallback(() => {
    const today = dayKey(new Date());
    if (lastActive.current === today) return;
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    const next = lastActive.current === yesterday ? streakRef.current + 1 : 1;
    lastActive.current = today;
    streakRef.current = next;
    setStreak(next);
    setBestStreak((best) => Math.max(best, next));
  }, []);

  const registerGenerate = useCallback(() => {
    setGenerated((count) => count + 1);
    markActive();
  }, [markActive]);

  const registerCopy = useCallback(() => {
    setCopied((count) => count + 1);
    markActive();
  }, [markActive]);

  const value = useMemo<ScoreContextValue>(
    () => ({ generated, copied, streak, bestStreak, registerGenerate, registerCopy }),
    [generated, copied, streak, bestStreak, registerGenerate, registerCopy]
  );

  return <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>;
};

export const useScore = () => useContext(ScoreContext);
