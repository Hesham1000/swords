// app/lib/inventory-server.ts
import { db, inventoryLogs } from "./db";

export interface InventoryLogData {
  productId: string;
  productName: string;
  changeAmount: number;
  newQuantity: number;
  reason: string;
  oldPrice?: string | number | null;
  newPrice?: string | number | null;
  referenceId?: string;
  note?: string;
  operator?: string;
}

/**
 * Records an inventory change (stock or price) in the inventory_logs table.
 */
export async function logInventoryChange(data: InventoryLogData) {
  await db.insert(inventoryLogs).values({
    productId: data.productId,
    productName: data.productName,
    changeAmount: data.changeAmount,
    newQuantity: data.newQuantity,
    reason: data.reason,
    oldPrice: data.oldPrice != null ? String(data.oldPrice) : null,
    newPrice: data.newPrice != null ? String(data.newPrice) : null,
    referenceId: data.referenceId,
    note: data.note,
    operator: data.operator,
  });
}
