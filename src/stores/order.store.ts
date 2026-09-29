import { create } from "zustand";
import { Order, DocumentStatus, Client } from "../types";
import { api } from "../lib/axios";

interface OrderState {
  orders: Order[];
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusFilter: DocumentStatus | "ALL";
  search: string;
  isLoading: boolean;
  fetchClients: () => Promise<Client[]>;
  fetchOrders: (params?: { warehouseId: string; status?: DocumentStatus | "ALL"; search?: string; page?: number; pageSize?: number }) => Promise<void>;
  setStatusFilter: (status: DocumentStatus | "ALL") => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  createOrder: (data: { warehouseId: string; clientId: string; number: string; comment?: string | null; items: { productId: string; quantity: number; price: number }[] }) => Promise<Order>;
  updateOrder: (id: string, data: { clientId?: string; number?: string; comment?: string | null; items?: { productId: string; quantity: number; price: number }[] }) => Promise<Order>;
  postOrder: (id: string) => Promise<Order>;
  deleteOrder: (id: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  clients: [],
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  statusFilter: "ALL",
  search: "",
  isLoading: false,

  fetchClients: async () => {
    try {
      const res = await api.get<{ success: boolean; data: Client[] }>("/clients");
      const list = res.data.data || [];
      set({ clients: list });
      return list;
    } catch {
      return [];
    }
  },

  fetchOrders: async (params) => {
    set({ isLoading: true });
    try {
      const warehouseId = params?.warehouseId;
      if (!warehouseId) {
        set({ orders: [], total: 0, isLoading: false });
        return;
      }

      const currentStatus = params?.status !== undefined ? params.status : get().statusFilter;
      const currentSearch = params?.search !== undefined ? params.search : get().search;
      const currentPage = params?.page !== undefined ? params.page : get().page;
      const currentPageSize = params?.pageSize !== undefined ? params.pageSize : get().pageSize;

      const res = await api.get<{
        success: boolean;
        data: { items: Order[]; total: number; page: number; pageSize: number; totalPages: number };
      }>("/orders", {
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
        orders: d.items,
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

  createOrder: async (data) => {
    const res = await api.post<{ success: boolean; data: Order }>("/orders", data);
    const created = res.data.data;
    set((state) => ({
      orders: [created, ...state.orders],
      total: state.total + 1,
    }));
    return created;
  },

  updateOrder: async (id, data) => {
    const res = await api.put<{ success: boolean; data: Order }>(`/orders/${id}`, data);
    const updated = res.data.data;
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? updated : o)),
    }));
    return updated;
  },

  postOrder: async (id) => {
    const res = await api.post<{ success: boolean; data: Order }>(`/orders/${id}/post`);
    const posted = res.data.data;
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? posted : o)),
    }));
    return posted;
  },

  deleteOrder: async (id) => {
    await api.delete(`/orders/${id}`);
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
      total: Math.max(0, state.total - 1),
    }));
  },
}));
