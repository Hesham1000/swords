// lib/api/wallet.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export type Currency = "EGP" | "USD" | "EUR";

export interface WalletBalances {
  balanceEGP: number;
  balanceUSD: number;
  balanceEUR: number;
}

export interface WalletTransaction {
  _id?: string;
  type: "deposit" | "withdraw" | "invoice" | "shipment";
  amount: number;
  currency?: Currency;
  note: string;
  date: string;
  createdAt?: string;
  referenceId?: string;
}

export interface WalletBalanceResponse {
  success: boolean;
  data: WalletBalances;
  message?: string;
}

export interface WalletTransactionsResponse {
  success: boolean;
  data: WalletTransaction[];
  message?: string;
}

/**
 * Fetch wallet balances (all currencies)
 */
export async function getWalletBalance(): Promise<WalletBalanceResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/wallet`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch wallet balance");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    throw error;
  }
}

/**
 * Deposit or withdraw from the wallet
 */
export async function walletTransaction(
  amount: number,
  type: "deposit" | "withdraw",
  currency: Currency = "EGP",
  note?: string
): Promise<WalletBalanceResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, type, currency, note }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${type}`);
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error(`Error processing ${type}:`, error);
    throw error;
  }
}

/**
 * Shorthand: Deposit cash into the wallet
 */
export async function depositToWallet(amount: number, note?: string, currency: Currency = "EGP"): Promise<WalletBalanceResponse> {
  return walletTransaction(amount, "deposit", currency, note);
}

/**
 * Shorthand: Withdraw cash from the wallet
 */
export async function withdrawFromWallet(amount: number, note?: string, currency: Currency = "EGP"): Promise<WalletBalanceResponse> {
  return walletTransaction(amount, "withdraw", currency, note);
}

/**
 * Fetch wallet transaction history
 */
export async function getWalletTransactions(): Promise<WalletTransactionsResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/wallet/transactions`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch wallet transactions");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    throw error;
  }
}
