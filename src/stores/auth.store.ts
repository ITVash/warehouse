import { create } from "zustand";
import { User, Role } from "../types";
import { api } from "../lib/axios";

interface AuthState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  checkAuth: () => Promise<User | null>;
  fetchMe: () => Promise<User | null>;
  loginTelegram: (data: Record<string, unknown>) => Promise<User>;
  devSwitchRole: (role: Role) => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<{ success: boolean; data: User }>("/auth/me");
      if (res.data.success && res.data.data) {
        set({
          user: res.data.data,
          role: res.data.data.role,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
        return res.data.data;
      }
      set({ user: null, role: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      return null;
    } catch {
      set({ user: null, role: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      return null;
    }
  },

  fetchMe: async () => {
    return get().checkAuth();
  },

  loginTelegram: async (data: Record<string, unknown>) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: User }>("/auth/telegram", data);
      const user = res.data.data;
      set({
        user,
        role: user.role,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  devSwitchRole: async (role: Role) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: User }>("/auth/dev-switch", { role });
      const user = res.data.data;
      set({
        user,
        role: user.role,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      set({ user: null, role: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
