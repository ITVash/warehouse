import { create } from 'zustand';
import { UserSession } from '@/types';
import api from '@/lib/axios';

interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  setUser: (user: UserSession | null) => void;
  fetchUser: () => Promise<UserSession | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data) {
        set({ user: res.data.data, isLoading: false });
        return res.data.data;
      } else {
        set({ user: null, isLoading: false });
        return null;
      }
    } catch {
      set({ user: null, isLoading: false });
      return null;
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      set({ user: null });
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
  },
}));

interface WarehouseInfo {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  description?: string | null;
}

interface WarehouseState {
  currentWarehouse: WarehouseInfo | null;
  warehouses: WarehouseInfo[];
  isLoading: boolean;
  setCurrentWarehouse: (warehouse: WarehouseInfo | null) => void;
  fetchWarehouses: () => Promise<void>;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
  currentWarehouse: null,
  warehouses: [],
  isLoading: false,
  setCurrentWarehouse: (warehouse) => {
    set({ currentWarehouse: warehouse });
    if (typeof window !== 'undefined' && warehouse) {
      localStorage.setItem('selected_warehouse_id', warehouse.id);
    }
  },
  fetchWarehouses: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/warehouses');
      if (res.data.success) {
        set({ warehouses: res.data.data, isLoading: false });
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
      set({ isLoading: false });
    }
  },
}));
