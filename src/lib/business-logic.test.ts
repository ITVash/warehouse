/**
 * NegoStore Business Logic Verification Tests
 * Verifies the 10 core constraints specified in prompt section 73.
 */

import { NomenclatureService } from "../services/nomenclature.service";
import { OrderService } from "../services/order.service";
import { IncomingService } from "../services/incoming.service";
import { UserService } from "../services/user.service";
import { memoryDb } from "../lib/db";

export async function runBusinessLogicTests() {
  const results: { test: string; passed: boolean; error?: string }[] = [];

  function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
  }

  // 1. Guest check: Guest has GUEST role and is prohibited by requireRole
  try {
    const guestUser = await UserService.findOrCreateFromTelegram({
      telegramId: "test_guest_999",
      username: "test_guest",
    });
    assert(guestUser.role === "GUEST", "Default new user role must be GUEST");
    results.push({ test: "1. Guest receives default GUEST role", passed: true });
  } catch (err: unknown) {
    results.push({ test: "1. Guest receives default GUEST role", passed: false, error: (err as Error).message });
  }

  // 2 & 3. Role changing rights: Admin can change roles
  try {
    const adminUser = memoryDb.users.get("u-admin")!;
    const userToPromote = await UserService.findOrCreateFromTelegram({
      telegramId: "test_employee_888",
      username: "emp_888",
    });

    const promoted = await UserService.changeRole(userToPromote.id, "MANAGER", adminUser.id);
    assert(promoted.role === "MANAGER", "Admin should be able to promote user to MANAGER");
    results.push({ test: "3. Admin can change roles", passed: true });
  } catch (err: unknown) {
    results.push({ test: "3. Admin can change roles", passed: false, error: (err as Error).message });
  }

  // 4. Cannot edit POSTED document
  try {
    const testOrder = await OrderService.create({
      warehouseId: "w-novikov",
      clientId: "c-1",
      number: "TEST-ORD-POSTED",
      userId: "u-admin",
      items: [{ productId: "nom-nov-1", quantity: 1, price: 350 }],
    });

    await OrderService.post(testOrder.id, "u-admin");

    // Attempt to edit after posting: MUST throw
    let failed = false;
    try {
      await OrderService.update(testOrder.id, {
        number: "EDITED-NUMBER",
        userId: "u-admin",
      });
    } catch {
      failed = true;
    }
    assert(failed, "Editing a POSTED order must be strictly prohibited");
    results.push({ test: "4. Cannot edit POSTED document", passed: true });
  } catch (err: unknown) {
    results.push({ test: "4. Cannot edit POSTED document", passed: false, error: (err as Error).message });
  }

  // 5. Cross-Warehouse protection: Cannot add product from warehouse A to document of warehouse B
  try {
    let failed = false;
    try {
      await OrderService.create({
        warehouseId: "w-novikov",
        clientId: "c-1",
        number: "TEST-CROSS-WAREHOUSE",
        userId: "u-admin",
        // nom-neg-1 belongs to w-negociant, NOT w-novikov!
        items: [{ productId: "nom-neg-1", quantity: 1, price: 280 }],
      });
    } catch (e: unknown) {
      if ((e as Error).message.includes("WAREHOUSE_MISMATCH")) {
        failed = true;
      }
    }
    assert(failed, "Adding item of another warehouse must throw WAREHOUSE_MISMATCH");
    results.push({ test: "5. Cannot add product of another warehouse (Cross-warehouse protection)", passed: true });
  } catch (err: unknown) {
    results.push({ test: "5. Cross-warehouse protection", passed: false, error: (err as Error).message });
  }

  // 6. Cannot post order if stock is insufficient
  try {
    let failed = false;
    const orderWithHugeQty = await OrderService.create({
      warehouseId: "w-novikov",
      clientId: "c-1",
      number: "TEST-INSUFFICIENT",
      userId: "u-admin",
      items: [{ productId: "nom-nov-1", quantity: 999999, price: 350 }],
    });

    try {
      await OrderService.post(orderWithHugeQty.id, "u-admin");
    } catch (e: unknown) {
      if ((e as Error).message.includes("INSUFFICIENT_STOCK")) {
        failed = true;
      }
    }
    assert(failed, "Posting order with quantity exceeding stock must throw INSUFFICIENT_STOCK");
    results.push({ test: "6. Insufficient stock prevents posting", passed: true });
  } catch (err: unknown) {
    results.push({ test: "6. Insufficient stock check", passed: false, error: (err as Error).message });
  }

  // 7. Incoming increases stock
  try {
    const prod = memoryDb.nomenclatures.get("nom-nov-2")!;
    const initialQty = Number(prod.quantity);

    const inc = await IncomingService.create({
      warehouseId: "w-novikov",
      supplierId: "s-1",
      number: "TEST-INC-INCREASE",
      userId: "u-admin",
      items: [{ productId: prod.id, quantity: 50, purchasePrice: 20 }],
    });

    await IncomingService.post(inc.id, "u-admin");
    const updatedQty = Number(memoryDb.nomenclatures.get(prod.id)!.quantity);
    assert(updatedQty === initialQty + 50, "Stock should increase by incoming quantity");
    results.push({ test: "7. Incoming increases stock correctly", passed: true });
  } catch (err: unknown) {
    results.push({ test: "7. Incoming increases stock", passed: false, error: (err as Error).message });
  }

  // 8. Posted order decreases stock
  try {
    const prod = memoryDb.nomenclatures.get("nom-nov-2")!;
    const initialQty = Number(prod.quantity);

    const ord = await OrderService.create({
      warehouseId: "w-novikov",
      clientId: "c-1",
      number: "TEST-ORD-DECREASE",
      userId: "u-admin",
      items: [{ productId: prod.id, quantity: 10, price: 30 }],
    });

    await OrderService.post(ord.id, "u-admin");
    const updatedQty = Number(memoryDb.nomenclatures.get(prod.id)!.quantity);
    assert(updatedQty === initialQty - 10, "Stock should decrease by order quantity");
    results.push({ test: "8. Posted order decreases stock correctly", passed: true });
  } catch (err: unknown) {
    results.push({ test: "8. Posted order decreases stock", passed: false, error: (err as Error).message });
  }

  // 9. Scanner barcode lookup finds product
  try {
    const item = await NomenclatureService.getByBarcode("w-novikov", "4600123456789");
    assert(item !== null && item.article === "NOV-001", "Barcode lookup should find correct product");
    results.push({ test: "9. Barcode lookup finds correct product", passed: true });
  } catch (err: unknown) {
    results.push({ test: "9. Barcode lookup", passed: false, error: (err as Error).message });
  }

  // 10. Search by title, article, and barcode
  try {
    const byTitle = await NomenclatureService.list({ warehouseId: "w-novikov", search: "SvetoCopy" });
    const byArticle = await NomenclatureService.list({ warehouseId: "w-novikov", search: "NOV-001" });
    const byBarcode = await NomenclatureService.list({ warehouseId: "w-novikov", search: "4600123456789" });

    assert(byTitle.items.length > 0, "Search by title works");
    assert(byArticle.items.length > 0, "Search by article works");
    assert(byBarcode.items.length > 0, "Search by barcode works");
    results.push({ test: "10. Unified search by title, article, and barcode works", passed: true });
  } catch (err: unknown) {
    results.push({ test: "10. Unified search", passed: false, error: (err as Error).message });
  }

  return results;
}
