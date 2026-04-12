import { getInventoryLogsCollection } from "./mongoDB";
import { ObjectId } from "mongodb";

export type InventoryChangeReason = "Sale" | "Initial Stock" | "Restock" | "Manual Adjustment" | "Return" | "Order Cancelled" | "Price Update";

export interface InventoryLog {
  _id?: ObjectId;
  productId: string;
  productName: string;
  changeAmount: number; // Positive for additions, negative for deductions
  newQuantity: number;
  reason: InventoryChangeReason;
  oldPrice?: number | null;
  newPrice?: number | null;
  referenceId?: string | ObjectId;
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
  referenceId?: string | ObjectId;
  note?: string;
  operator?: string;
}) {
  try {
    const logsCollection = await getInventoryLogsCollection();
    const log: InventoryLog = {
      ...logData,
      timestamp: new Date(),
    };
    
    await logsCollection.insertOne(log);
    console.log(`📝 Inventory Log Created: ${logData.productName} (${logData.changeAmount > 0 ? "+" : ""}${logData.changeAmount}) - Reason: ${logData.reason}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to create inventory log:", error);
    return { success: false, error };
  }
}
