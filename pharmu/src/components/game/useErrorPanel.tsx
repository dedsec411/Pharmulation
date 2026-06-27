import { useCallback, useRef, useState } from "react";
import { ErrorExplanationPanel, type ErrorEntry } from "./ErrorExplanationPanel";

type Options = {
  mode: string;
  difficulty?: string | null;
  mentorTip?: string | null;
  setExternalPaused: (b: boolean) => void;
};

export type LogErrorInput = Omit<ErrorEntry, "timestamp" | "mode" | "difficulty"> & {
  difficulty?: string;
};

export function useErrorPanel({ mode, difficulty, mentorTip, setExternalPaused }: Options) {
  const [current, setCurrent] = useState<ErrorEntry | null>(null);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const pausedRef = useRef(false);

  const logError = useCallback(
    (input: LogErrorInput) => {
      const entry: ErrorEntry = {
        timestamp: Date.now(),
        mode,
        difficulty: input.difficulty ?? (difficulty ?? "medium"),
        ...input,
      };
      setErrors((arr) => [...arr, entry]);
      setCurrent(entry);
      if (!pausedRef.current) {
        pausedRef.current = true;
        setExternalPaused(true);
      }
    },
    [mode, difficulty, setExternalPaused]
  );

  const dismiss = useCallback(() => {
    setCurrent(null);
    if (pausedRef.current) {
      pausedRef.current = false;
      setExternalPaused(false);
    }
  }, [setExternalPaused]);

  const reset = useCallback(() => {
    setErrors([]);
    setCurrent(null);
    if (pausedRef.current) {
      pausedRef.current = false;
      setExternalPaused(false);
    }
  }, [setExternalPaused]);

  const panel = <ErrorExplanationPanel entry={current} mentorTip={mentorTip ?? undefined} onDismiss={dismiss} />;

  return { logError, errors, panel, reset };
}
