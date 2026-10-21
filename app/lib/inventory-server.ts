import { query } from "./db";

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
    const now = new Date();
    await query(
      `INSERT INTO inventory_logs
        (product_id, product_name, change, change_amount, new_quantity, reason, old_price, new_price, reference_id, note, operator, "timestamp", created_at)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
      [
        logData.productId,
        logData.productName,
        logData.changeAmount,
        logData.newQuantity,
        logData.reason,
        logData.oldPrice ?? null,
        logData.newPrice ?? null,
        logData.referenceId ?? null,
        logData.note ?? null,
        logData.operator ?? null,
        now,
      ]
    );
    console.log(`📝 Inventory Log Created: ${logData.productName} (${logData.changeAmount > 0 ? "+" : ""}${logData.changeAmount}) - Reason: ${logData.reason}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to create inventory log:", error);
    return { success: false, error };
  }
}
