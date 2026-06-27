import { useCallback, useEffect, useState } from "react";
import { fetchRandomCase, type Mode } from "@/lib/game/shared";

export function useCaseLoader(mode: Mode) {
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const c = await fetchRandomCase(mode);
    setCaseData(c);
    setLoading(false);
  }, [mode]);

  useEffect(() => { load(); }, [load, reloadKey]);

  return { caseData, loading, next: () => setReloadKey((k) => k + 1) };
}
