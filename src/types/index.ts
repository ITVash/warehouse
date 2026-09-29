export type Role = 'ADMIN' | 'MANAGER' | 'GUEST';
export type DocumentStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type MovementType = 'INCOMING' | 'OUTGOING' | 'ADJUSTMENT';

export interface User {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  role: Role;
  isActive: boolean;
  authDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Nomenclature {
  id: string;
  warehouseId: string;
  article: string;
  barcode: string | null;
  title: string;
  name?: string;
  shortTitle: string | null;
  groupId: string;
  quantity: number;
  currentStock?: number;
  price: number;
  retailPrice?: number;
  purchasePrice?: number;
  unit?: string;
  createdAt: string;
  updatedAt: string;
  group?: Group;
  warehouse?: Warehouse;
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  documentType: string | null;
  documentId: string | null;
  comment: string | null;
  createdById: string | null;
  createdAt: string;
  product?: Nomenclature;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  inn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  inn: string | null;
  phone: string | null;
  email: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  product?: Nomenclature;
}

export interface Order {
  id: string;
  warehouseId: string;
  clientId: string;
  number: string;
  status: DocumentStatus;
  comment: string | null;
  totalAmount: number;
  createdById: string | null;
  updatedById: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  items?: OrderItem[];
  createdBy?: User | null;
  updatedBy?: User | null;
}

export interface IncomingItem {
  id: string;
  incomingId: string;
  productId: string;
  quantity: number;
  purchasePrice: number;
  total: number;
  product?: Nomenclature;
}

export interface Incoming {
  id: string;
  warehouseId: string;
  supplierId: string;
  number: string;
  status: DocumentStatus;
  comment: string | null;
  totalAmount: number;
  createdById: string | null;
  updatedById: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  items?: IncomingItem[];
  createdBy?: User | null;
  updatedBy?: User | null;
}

export interface StockReportItem {
  productId: string;
  title: string;
  article: string;
  barcode: string | null;
  groupName: string;
  groupId: string;
  quantity: number;
  price: number;
  totalValue: number;
  warehouseId: string;
}

export interface StockSummary {
  totalItems: number;
  totalPositions: number;
  zeroStockCount: number;
  totalStockValue: number;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: User | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
