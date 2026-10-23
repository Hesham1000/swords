import { db } from "./db";
import { inventoryLogs } from "./db/schema";

export type InventoryChangeReason = "Sale" | "Initial Stock" | "Restock" | "Manual Adjustment" | "Return" | "Order Cancelled" | "Price Update";

export interface InventoryLog {
  id?: string;
  productId: string;
  productName?: string;
  changeAmount: number; // Positive for additions, negative for deductions
  newQuantity?: number;
  reason: InventoryChangeReason;
  oldPrice?: number | null;
  newPrice?: number | null;
  referenceId?: string;
  note?: string;
  operator?: string;
  createdAt: Date;
}

/**
 * Logs a change in product inventory to the audit trail (Backend Only).
 */
export async function logInventoryChange(logData: {
  productId: string;
  productName?: string;
  changeAmount: number;
  newQuantity?: number;
  reason: InventoryChangeReason;
  oldPrice?: number | null;
  newPrice?: number | null;
  referenceId?: string;
  note?: string;
  operator?: string;
}) {
  try {
    const log: InventoryLog = {
      ...logData,
      createdAt: new Date(),
    };

    await db.insert(inventoryLogs).values({
      productId: logData.productId,
      change: logData.changeAmount,
      reason: logData.reason,
      createdAt: log.createdAt,
    });

    console.log(`📝 Inventory Log Created: ${logData.productName ?? logData.productId} (${logData.changeAmount > 0 ? "+" : ""}${logData.changeAmount}) - Reason: ${logData.reason}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to create inventory log:", error);
    return { success: false, error };
  }
}
