import { create } from "zustand";
import { Nomenclature, Group } from "../types";
import { api } from "../lib/axios";

interface NomenclatureState {
  items: Nomenclature[];
  groups: Group[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  groupId: string;
  isLoading: boolean;
  fetchGroups: () => Promise<Group[]>;
  fetchItems: (params?: { warehouseId: string; search?: string; groupId?: string; page?: number; pageSize?: number }) => Promise<void>;
  setSearch: (search: string) => void;
  setGroupId: (groupId: string) => void;
  setPage: (page: number) => void;
  createItem: (data: { warehouseId: string; article: string; barcode?: string | null; title: string; shortTitle?: string | null; groupId: string; price?: number }) => Promise<Nomenclature>;
  updateItem: (id: string, data: { article?: string; barcode?: string | null; title?: string; shortTitle?: string | null; groupId?: string; price?: number }) => Promise<Nomenclature>;
  deleteItem: (id: string) => Promise<void>;
  getByBarcode: (warehouseId: string, barcode: string) => Promise<Nomenclature>;
}

export const useNomenclatureStore = create<NomenclatureState>((set, get) => ({
  items: [],
  groups: [],
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  search: "",
  groupId: "all",
  isLoading: false,

  fetchGroups: async () => {
    try {
      const res = await api.get<{ success: boolean; data: Group[] }>("/groups");
      const list = res.data.data || [];
      set({ groups: list });
      return list;
    } catch {
      return [];
    }
  },

  fetchItems: async (params) => {
    set({ isLoading: true });
    try {
      const currentSearch = params?.search !== undefined ? params.search : get().search;
      const currentGroupId = params?.groupId !== undefined ? params.groupId : get().groupId;
      const currentPage = params?.page !== undefined ? params.page : get().page;
      const currentPageSize = params?.pageSize !== undefined ? params.pageSize : get().pageSize;
      const warehouseId = params?.warehouseId;

      if (!warehouseId) {
        set({ items: [], total: 0, isLoading: false });
        return;
      }

      const res = await api.get<{
        success: boolean;
        data: { items: Nomenclature[]; total: number; page: number; pageSize: number; totalPages: number };
      }>("/nomenclature", {
        params: {
          warehouseId,
          search: currentSearch || undefined,
          groupId: currentGroupId !== "all" ? currentGroupId : undefined,
          page: currentPage,
          pageSize: currentPageSize,
        },
      });

      const d = res.data.data;
      set({
        items: d.items,
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

  setSearch: (search: string) => set({ search, page: 1 }),
  setGroupId: (groupId: string) => set({ groupId, page: 1 }),
  setPage: (page: number) => set({ page }),

  createItem: async (data) => {
    const res = await api.post<{ success: boolean; data: Nomenclature }>("/nomenclature", data);
    const created = res.data.data;
    set((state) => ({
      items: [created, ...state.items],
      total: state.total + 1,
    }));
    return created;
  },

  updateItem: async (id, data) => {
    const res = await api.put<{ success: boolean; data: Nomenclature }>(`/nomenclature/${id}`, data);
    const updated = res.data.data;
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? updated : item)),
    }));
    return updated;
  },

  deleteItem: async (id) => {
    await api.delete(`/nomenclature/${id}`);
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      total: Math.max(0, state.total - 1),
    }));
  },

  getByBarcode: async (warehouseId, barcode) => {
    const res = await api.get<{ success: boolean; data: Nomenclature }>(
      `/nomenclature/barcode/${encodeURIComponent(barcode)}`,
      { params: { warehouseId } }
    );
    return res.data.data;
  },
}));
