import { db } from "./db";
import { inventoryLogs } from "./db/schema";

export type InventoryChangeReason = "Sale" | "Initial Stock" | "Restock" | "Manual Adjustment" | "Return" | "Order Cancelled" | "Price Update";

export interface InventoryLog {
  id?: string;
  productId: string;
  productName: string;
  changeAmount: number; // Positive for additions, negative for deductions
  newQuantity: number;
  reason: InventoryChangeReason;
  oldPrice?: number | null;
  newPrice?: number | null;
  referenceId?: string;
  note?: string;
  operator?: string;
  timestamp: Date;
}

/**
 * Logs a change in product inventory to the audit trail (Backend Only).
 */
export async function logInventoryChange(logData: {
  productId: string;
  productName: string;
  changeAmount: number;
  newQuantity: number;
  reason: InventoryChangeReason;
  oldPrice?: number | null;
  newPrice?: number | null;
  referenceId?: string;
  note?: string;
  operator?: string;
}) {
  try {

    await db.insert(inventoryLogs).values({
      productId: logData.productId,
      productName: logData.productName,
      changeAmount: logData.changeAmount,
      newQuantity: logData.newQuantity,
      reason: logData.reason,
      oldPrice: logData.oldPrice != null ? String(logData.oldPrice) : null,
      newPrice: logData.newPrice != null ? String(logData.newPrice) : null,
      referenceId: logData.referenceId ? String(logData.referenceId) : null,
      note: logData.note,
      operator: logData.operator,
      timestamp: new Date(),
    });
    console.log(`📝 Inventory Log Created: ${logData.productName} (${logData.changeAmount > 0 ? "+" : ""}${logData.changeAmount}) - Reason: ${logData.reason}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to create inventory log:", error);
    return { success: false, error };
  }
}
