import { useCallback, useEffect, useState } from "react";
import { fetchRandomCase, type Difficulty, type Mode } from "@/lib/game/shared";

export function useCaseLoader(mode: Mode, difficulty?: Difficulty | null) {
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(!!difficulty);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!difficulty) {
      setCaseData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const c = await fetchRandomCase(mode, difficulty);
    setCaseData(c);
    setLoading(false);
  }, [mode, difficulty]);

  useEffect(() => { load(); }, [load, reloadKey]);

  return { caseData, loading, next: () => setReloadKey((k) => k + 1) };
}
