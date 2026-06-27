import { create } from "zustand";
import { persist } from "zustand/middleware";

type Settings = {
  soundEnabled: boolean;
  mentorTipsEnabled: boolean;
  timerWarningsEnabled: boolean;
  setSound: (v: boolean) => void;
  setMentorTips: (v: boolean) => void;
  setTimerWarnings: (v: boolean) => void;
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      soundEnabled: true,
      mentorTipsEnabled: true,
      timerWarningsEnabled: true,
      setSound: (v) => set({ soundEnabled: v }),
      setMentorTips: (v) => set({ mentorTipsEnabled: v }),
      setTimerWarnings: (v) => set({ timerWarningsEnabled: v }),
    }),
    { name: "pharmaverse-settings" },
  ),
);
