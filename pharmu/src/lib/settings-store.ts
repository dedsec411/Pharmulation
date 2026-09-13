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
  /**
   * Let the guide fly over by itself the first time a screen appears.
   *
   * On by default, because the people who most need it are the ones who would
   * never think to ask. Off for somebody who knows the app and finds a guide
   * arriving uninvited an interruption; he still comes when tapped.
   */
  guideCoaching: boolean;
  setSound: (v: boolean) => void;
  setMentorTips: (v: boolean) => void;
  setTimerWarnings: (v: boolean) => void;
  setPlainEnglish: (v: boolean) => void;
  setGuideCoaching: (v: boolean) => void;
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      soundEnabled: true,
      mentorTipsEnabled: true,
      timerWarningsEnabled: true,
      plainEnglish: false,
      guideCoaching: true,
      setSound: (v) => set({ soundEnabled: v }),
      setMentorTips: (v) => set({ mentorTipsEnabled: v }),
      setTimerWarnings: (v) => set({ timerWarningsEnabled: v }),
      setPlainEnglish: (v) => set({ plainEnglish: v }),
      setGuideCoaching: (v) => set({ guideCoaching: v }),
    }),
    { name: "pharmaverse-settings" },
  ),
);
