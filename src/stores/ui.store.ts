import { create } from "zustand";

export type WorkspaceTab =
  | "orders"
  | "nomenclature"
  | "stock"
  | "incomings"
  | "reports"
  | "users"
  | "counterparties";

export interface ScannerTarget {
  title: string;
  onScan: (barcode: string) => void;
}

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface UiState {
  activeTab: WorkspaceTab;
  mobileMenuOpen: boolean;
  scannerOpen: boolean;
  scannerTarget: ScannerTarget | null;
  toasts: ToastItem[];
  setActiveTab: (tab: WorkspaceTab) => void;
  setMobileMenuOpen: (open: boolean) => void;
  openScanner: (target: ScannerTarget) => void;
  closeScanner: () => void;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: "orders",
  mobileMenuOpen: false,
  scannerOpen: false,
  scannerTarget: null,
  toasts: [],

  setActiveTab: (tab) => set({ activeTab: tab, mobileMenuOpen: false }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  openScanner: (target) => set({ scannerOpen: true, scannerTarget: target }),
  closeScanner: () => set({ scannerOpen: false, scannerTarget: null }),

  addToast: (type, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
