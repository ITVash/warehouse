export type Role = 'ADMIN' | 'MANAGER' | 'GUEST';

export type DocStatus = 'DRAFT' | 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export type MovementType = 'INCOMING' | 'OUTGOING' | 'ADJUSTMENT';

export interface UserSession {
  id: string;
  telegramId?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isBlocked: boolean;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
  }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}
