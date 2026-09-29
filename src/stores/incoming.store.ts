import { create } from "zustand";
import { Incoming, DocumentStatus, Supplier } from "../types";
import { api } from "../lib/axios";

interface IncomingState {
  incomings: Incoming[];
  suppliers: Supplier[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusFilter: DocumentStatus | "ALL";
  search: string;
  isLoading: boolean;
  fetchSuppliers: () => Promise<Supplier[]>;
  fetchIncomings: (params?: { warehouseId: string; status?: DocumentStatus | "ALL"; search?: string; page?: number; pageSize?: number }) => Promise<void>;
  setStatusFilter: (status: DocumentStatus | "ALL") => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  createIncoming: (data: { warehouseId: string; supplierId: string; number: string; comment?: string | null; items: { productId: string; quantity: number; purchasePrice: number }[] }) => Promise<Incoming>;
  updateIncoming: (id: string, data: { supplierId?: string; number?: string; comment?: string | null; items?: { productId: string; quantity: number; purchasePrice: number }[] }) => Promise<Incoming>;
  postIncoming: (id: string) => Promise<Incoming>;
  deleteIncoming: (id: string) => Promise<void>;
}

export const useIncomingStore = create<IncomingState>((set, get) => ({
  incomings: [],
  suppliers: [],
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  statusFilter: "ALL",
  search: "",
  isLoading: false,

  fetchSuppliers: async () => {
    try {
      const res = await api.get<{ success: boolean; data: Supplier[] }>("/suppliers");
      const list = res.data.data || [];
      set({ suppliers: list });
      return list;
    } catch {
      return [];
    }
  },

  fetchIncomings: async (params) => {
    set({ isLoading: true });
    try {
      const warehouseId = params?.warehouseId;
      if (!warehouseId) {
        set({ incomings: [], total: 0, isLoading: false });
        return;
      }

      const currentStatus = params?.status !== undefined ? params.status : get().statusFilter;
      const currentSearch = params?.search !== undefined ? params.search : get().search;
      const currentPage = params?.page !== undefined ? params.page : get().page;
      const currentPageSize = params?.pageSize !== undefined ? params.pageSize : get().pageSize;

      const res = await api.get<{
        success: boolean;
        data: { items: Incoming[]; total: number; page: number; pageSize: number; totalPages: number };
      }>("/incomings", {
        params: {
          warehouseId,
          status: currentStatus !== "ALL" ? currentStatus : undefined,
          search: currentSearch || undefined,
          page: currentPage,
          pageSize: currentPageSize,
        },
      });

      const d = res.data.data;
      set({
        incomings: d.items,
        total: d.total,
        page: d.page,
        pageSize: d.pageSize,
        totalPages: d.totalPages,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),

  createIncoming: async (data) => {
    const res = await api.post<{ success: boolean; data: Incoming }>("/incomings", data);
    const created = res.data.data;
    set((state) => ({
      incomings: [created, ...state.incomings],
      total: state.total + 1,
    }));
    return created;
  },

  updateIncoming: async (id, data) => {
    const res = await api.put<{ success: boolean; data: Incoming }>(`/incomings/${id}`, data);
    const updated = res.data.data;
    set((state) => ({
      incomings: state.incomings.map((inc) => (inc.id === id ? updated : inc)),
    }));
    return updated;
  },

  postIncoming: async (id) => {
    const res = await api.post<{ success: boolean; data: Incoming }>(`/incomings/${id}/post`);
    const posted = res.data.data;
    set((state) => ({
      incomings: state.incomings.map((inc) => (inc.id === id ? posted : inc)),
    }));
    return posted;
  },

  deleteIncoming: async (id) => {
    await api.delete(`/incomings/${id}`);
    set((state) => ({
      incomings: state.incomings.filter((inc) => inc.id !== id),
      total: Math.max(0, state.total - 1),
    }));
  },
}));
