import { create } from "zustand";

type ActiveCaseState = {
  caseData: any | null;
  setActiveCase: (caseData: any | null) => void;
};

export const useActiveCaseStore = create<ActiveCaseState>((set) => ({
  caseData: null,
  setActiveCase: (caseData) => set({ caseData }),
}));
