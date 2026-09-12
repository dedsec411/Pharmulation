import { create } from "zustand";
import { persist } from "zustand/middleware";

type Settings = {
  soundEnabled: boolean;
  mentorTipsEnabled: boolean;
  timerWarningsEnabled: boolean;
  /**
   * Expand every short form on screen into words.
   *
   * Off by default: the abbreviations are what a pharmacist meets at work, and
   * a screen reading "First Expired, First Out dispatch" is worse for them.
   * On, for anybody who has not met them yet - which was the demo jury's
   * objection.
   */
  plainEnglish: boolean;
  setSound: (v: boolean) => void;
  setMentorTips: (v: boolean) => void;
  setTimerWarnings: (v: boolean) => void;
  setPlainEnglish: (v: boolean) => void;
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      soundEnabled: true,
      mentorTipsEnabled: true,
      timerWarningsEnabled: true,
      plainEnglish: false,
      setSound: (v) => set({ soundEnabled: v }),
      setMentorTips: (v) => set({ mentorTipsEnabled: v }),
      setTimerWarnings: (v) => set({ timerWarningsEnabled: v }),
      setPlainEnglish: (v) => set({ plainEnglish: v }),
    }),
    { name: "pharmaverse-settings" },
  ),
);
