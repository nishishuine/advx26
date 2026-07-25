import { create } from "zustand";

type ExplorerState = {
  focusMode: boolean;
  setFocusMode: (focusMode: boolean) => void;
  reset: () => void;
};

export const useExplorerStore = create<ExplorerState>((set) => ({
  focusMode: false,
  setFocusMode: (focusMode) => set({ focusMode }),
  reset: () => set({ focusMode: false }),
}));
