import { z } from "zod";

export const roleEnum = z.enum(["ADMIN", "MANAGER", "GUEST"]);
export const documentStatusEnum = z.enum(["DRAFT", "POSTED", "CANCELLED"]);
export const movementTypeEnum = z.enum(["INCOMING", "OUTGOING", "ADJUSTMENT"]);

export const createNomenclatureSchema = z.object({
  warehouseId: z.string().min(1, "Склад обязателен"),
  article: z.string().min(1, "Артикул обязателен"),
  barcode: z.string().optional().nullable(),
  title: z.string().min(1, "Название обязательно"),
  shortTitle: z.string().optional().nullable(),
  groupId: z.string().min(1, "Группа обязательна"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной").default(0),
});

export const updateNomenclatureSchema = z.object({
  article: z.string().min(1, "Артикул обязателен").optional(),
  barcode: z.string().optional().nullable(),
  title: z.string().min(1, "Название обязательно").optional(),
  shortTitle: z.string().optional().nullable(),
  groupId: z.string().min(1, "Группа обязательна").optional(),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной").optional(),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Товар обязателен"),
  quantity: z.coerce.number().positive("Количество должно быть больше 0"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
});

export const createOrderSchema = z.object({
  warehouseId: z.string().min(1, "Склад обязателен"),
  clientId: z.string().min(1, "Клиент обязателен"),
  number: z.string().min(1, "Номер счёта обязателен"),
  comment: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "В счёте должен быть минимум один товар"),
});

export const updateOrderSchema = z.object({
  clientId: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  comment: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1).optional(),
});

export const incomingItemSchema = z.object({
  productId: z.string().min(1, "Товар обязателен"),
  quantity: z.coerce.number().positive("Количество должно быть больше 0"),
  purchasePrice: z.coerce.number().min(0, "Закупочная цена не может быть отрицательной"),
});

export const createIncomingSchema = z.object({
  warehouseId: z.string().min(1, "Склад обязателен"),
  supplierId: z.string().min(1, "Поставщик обязателен"),
  number: z.string().min(1, "Номер прихода обязателен"),
  comment: z.string().optional().nullable(),
  items: z.array(incomingItemSchema).min(1, "В приходе должен быть минимум один товар"),
});

export const updateIncomingSchema = z.object({
  supplierId: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  comment: z.string().optional().nullable(),
  items: z.array(incomingItemSchema).min(1).optional(),
});

export const changeRoleSchema = z.object({
  role: roleEnum,
});

export const changeUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const clientSchema = z.object({
  name: z.string().min(1, "Имя клиента обязательно"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Некорректный email").optional().nullable().or(z.literal("")),
  inn: z.string().optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Наименование поставщика обязательно"),
  inn: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Некорректный email").optional().nullable().or(z.literal("")),
  comments: z.string().optional().nullable(),
});
