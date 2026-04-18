import { create } from "zustand";

interface MobileMenuState {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

export const useMobileMenu = create<MobileMenuState>((set) => ({
  isOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),
}));
