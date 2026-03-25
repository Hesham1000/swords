// lib/api/shipment.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export interface Shipment {
  _id?: string;
  destination: "cairo" | "alex";
  cost: number;
  description: string;
  date: string;
  createdAt?: string;
}

export interface ShipmentsResponse {
  success: boolean;
  data: Shipment[];
  message?: string;
}

export interface CreateShipmentResponse {
  success: boolean;
  data: {
    shipment: Shipment;
    balance: number;
  };
  message?: string;
}

/**
 * Fetch all shipments
 */
export async function getShipments(): Promise<ShipmentsResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/shipments`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch shipments");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error fetching shipments:", error);
    throw error;
  }
}

/**
 * Create a shipment (deducts from wallet)
 */
export async function createShipment(shipmentData: {
  destination: string;
  cost: number;
  description?: string;
  date?: string;
}): Promise<CreateShipmentResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/shipments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shipmentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create shipment");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error creating shipment:", error);
    throw error;
  }
}
