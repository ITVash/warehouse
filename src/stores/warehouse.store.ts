import { create } from "zustand";
import { Warehouse } from "../types";
import { api } from "../lib/axios";

interface WarehouseState {
  warehouses: Warehouse[];
  currentWarehouseId: string | null;
  currentWarehouse: Warehouse | null;
  isLoading: boolean;
  fetchWarehouses: () => Promise<Warehouse[]>;
  setWarehouse: (warehouseId: string) => void;
  clearWarehouse: () => void;
}

const STORAGE_KEY = "negostore_current_warehouse_id";

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  warehouses: [],
  currentWarehouseId: typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  currentWarehouse: null,
  isLoading: false,

  fetchWarehouses: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<{ success: boolean; data: Warehouse[] }>("/warehouses");
      const list = res.data.data || [];
      set({ warehouses: list, isLoading: false });

      const currentId = get().currentWarehouseId;
      if (currentId) {
        const found = list.find((w) => w.id === currentId);
        if (found) {
          set({ currentWarehouse: found });
        } else if (list.length > 0) {
          set({ currentWarehouseId: null, currentWarehouse: null });
          if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
        }
      }

      return list;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  setWarehouse: (warehouseId: string) => {
    const list = get().warehouses;
    const found = list.find((w) => w.id === warehouseId) || null;
    set({ currentWarehouseId: warehouseId, currentWarehouse: found });
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, warehouseId);
    }
  },

  clearWarehouse: () => {
    set({ currentWarehouseId: null, currentWarehouse: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
}));
