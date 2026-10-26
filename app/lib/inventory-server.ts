import { desc, eq, sql } from "drizzle-orm";
import { db, inventoryLogs } from "./db";

export type InventoryChangeReason = "Sale" | "Initial Stock" | "Restock" | "Manual Adjustment" | "Return" | "Order Cancelled" | "Price Update";

export interface InventoryLog {
  id: string;
  productId: string;
  changeType: string | null;
  quantityChange: number | null;
  reason: string | null;
  createdAt: Date | null;
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
      changeType: logData.reason,
      quantityChange: logData.changeAmount,
      reason: logData.note ?? logData.reason,
    });

    console.log(`📝 Inventory Log Created: ${logData.productName} (${logData.changeAmount > 0 ? "+" : ""}${logData.changeAmount}) - Reason: ${logData.reason}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to create inventory log:", error);
    return { success: false, error };
  }
}

/**
 * Retrieves paginated inventory logs, optionally filtered by product (Backend Only).
 */
export async function getInventoryLogs(options: {
  productId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { productId, limit = 50, offset = 0 } = options;

  const query = db
    .select()
    .from(inventoryLogs)
    .orderBy(desc(inventoryLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const logs = productId
    ? await db
        .select()
        .from(inventoryLogs)
        .where(eq(inventoryLogs.productId, productId))
        .orderBy(desc(inventoryLogs.createdAt))
        .limit(limit)
        .offset(offset)
    : await query;

  return logs;
}
