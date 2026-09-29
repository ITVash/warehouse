import { create } from "zustand";
import { StockReportItem, StockSummary } from "../types";
import { api } from "../lib/axios";

interface StockState {
  items: StockReportItem[];
  summary: StockSummary | null;
  groupId: string;
  search: string;
  stockStatus: "ALL" | "IN_STOCK" | "ZERO_STOCK";
  isLoading: boolean;
  fetchStock: (params: { warehouseId: string; groupId?: string; search?: string; stockStatus?: "ALL" | "IN_STOCK" | "ZERO_STOCK" }) => Promise<void>;
  setGroupId: (groupId: string) => void;
  setSearch: (search: string) => void;
  setStockStatus: (status: "ALL" | "IN_STOCK" | "ZERO_STOCK") => void;
  exportCsv: (warehouseId: string) => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  items: [],
  summary: null,
  groupId: "all",
  search: "",
  stockStatus: "ALL",
  isLoading: false,

  fetchStock: async (params) => {
    set({ isLoading: true });
    try {
      const { warehouseId } = params;
      const currentGroupId = params.groupId !== undefined ? params.groupId : get().groupId;
      const currentSearch = params.search !== undefined ? params.search : get().search;
      const currentStatus = params.stockStatus !== undefined ? params.stockStatus : get().stockStatus;

      const res = await api.get<{
        success: boolean;
        data: { items: StockReportItem[]; summary: StockSummary };
      }>("/stock", {
        params: {
          warehouseId,
          groupId: currentGroupId !== "all" ? currentGroupId : undefined,
          search: currentSearch || undefined,
          stockStatus: currentStatus,
        },
      });

      set({
        items: res.data.data.items,
        summary: res.data.data.summary,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  setGroupId: (groupId) => set({ groupId }),
  setSearch: (search) => set({ search }),
  setStockStatus: (stockStatus) => set({ stockStatus }),

  exportCsv: (warehouseId: string) => {
    const { groupId, search, stockStatus } = get();
    const query = new URLSearchParams({
      warehouseId,
      groupId: groupId !== "all" ? groupId : "",
      search,
      stockStatus,
    }).toString();
    window.location.href = `/api/stock/export?${query}`;
  },
}));
