import mongoose, { Connection, ConnectOptions } from "mongoose";

declare global {
  var _mongooseConnection: Connection | null;
}

/**
 * Database connection function using Mongoose
 * Implements connection caching for development and production environments
 */
const dbConnection = async (): Promise<Connection> => {
  console.log("🔄 Attempting database connection...");

  // Check if DB_URL environment variable is set
  if (!process.env.MONGODB_URI) {
    console.error("❌ DB_URL environment variable is not defined");
    throw new Error("Please define the DB_URL environment variable");
  }

  // Use cached connection in development to prevent multiple connections
  if (process.env.NODE_ENV === "development") {
    if (global._mongooseConnection) {
      console.log("✅ Using cached database connection (development)");
      return global._mongooseConnection;
    }
  }

  try {
    const options: ConnectOptions = {
      // no need for useNewUrlParser or useUnifiedTopology anymore
      dbName: process.env.MONGODB_DB_NAME,
    };

    console.log("🔗 Connecting to MongoDB with Mongoose...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string, options);

    console.log("✅ Successful database connection");
    console.log(`📊 Connected to database: ${mongoose.connection.name}`);
    console.log(`🌐 Connection host: ${mongoose.connection.host}`);
    console.log(`🔌 Connection port: ${mongoose.connection.port}`);

    // Cache the connection in development
    if (process.env.NODE_ENV === "development") {
      global._mongooseConnection = mongoose.connection;
      console.log("💾 Database connection cached for development");
    }

    // Set up connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("🟢 Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err: Error) => {
      console.error("🔴 Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("🟡 Mongoose disconnected from MongoDB");
    });

    // Graceful shutdown handling
    if (typeof process !== "undefined" && typeof process.on === "function") {
      process.on("SIGINT", async () => {
        console.log("⚠️  Received SIGINT, closing MongoDB connection...");
        await mongoose.connection.close();
        console.log("🔐 MongoDB connection closed.");
        process.exit(0);
      });
    }

    return mongoose.connection;
  } catch (err: any) {
    console.error("❌ Database connection error:", err.message);
    console.error("📋 Full error details:", err);

    // Exit process on connection failure
    if (typeof process !== "undefined" && typeof process.exit === "function") {
      process.exit(1);
    }
    throw err;
  }
};

export const getConnection = async (): Promise<Connection> => {
  console.log("🔍 Checking database connection status...");

  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    console.log("✅ Database already connected");
    return mongoose.connection;
  }

  // Check if connecting
  if (mongoose.connection.readyState === 2) {
    console.log("⏳ Database connection in progress, waiting...");
    await new Promise((resolve) => {
      mongoose.connection.once("connected", resolve);
    });
    return mongoose.connection;
  }

  // Not connected, establish connection
  console.log("🔄 No active connection, establishing new connection...");
  return await dbConnection();
};

export const getUserCollection = async () => {
  console.log("📁 Accessing users collection...");
  try {
    const connection = await getConnection();
    const collection = connection.collection("users");
    console.log("✅ Users collection accessed successfully");
    return collection;
  } catch (error) {
    console.error("❌ Error accessing users collection:", error);
    throw error;
  }
};


export const getBlacklistCollection = async () => {
  console.log("📁 Accessing users collection...");

  try {
    const connection = await getConnection();
    const collection = connection.collection("blacklist_tokens");
    console.log("✅ blacklist_tokens collection accessed successfully");
    return collection;
  } catch (error) {
    console.error("❌ Error accessing blacklist_tokens collection:", error);
    throw error;
  }
};




export const getProductsCollection = async () => {
  console.log("📁 Accessing products collection...");
  try {
    const connection = await getConnection();
    const collection = connection.collection("products");
    console.log("✅ Products collection accessed successfully");
    return collection;
  } catch (error) {
    console.error("❌ Error accessing products collection:", error);
    throw error;
  }
};

export const getInvoicesCollection = async () => {
  console.log("📁 Accessing invoices collection...");
  try {
    const connection = await getConnection();
    const collection = connection.collection("invoices");
    console.log("✅ Invoices collection accessed successfully");
    return collection;
  } catch (error) {
    console.error("❌ Error accessing invoices collection:", error);
    throw error;
  }
};

export const getWalletCollection = async () => {
  console.log("📁 Accessing wallet collection...");
  try {
    const connection = await getConnection();
    const collection = connection.collection("wallet");
    console.log("✅ Wallet collection accessed successfully");
    return collection;
  } catch (error) {
    console.error("❌ Error accessing wallet collection:", error);
    throw error;
  }
};

export const getWalletTransactionsCollection = async () => {
  console.log("📁 Accessing wallet_transactions collection...");
  try {
    const connection = await getConnection();
    const collection = connection.collection("wallet_transactions");
    console.log("✅ Wallet transactions collection accessed successfully");
    return collection;
  } catch (error) {
    console.error("❌ Error accessing wallet_transactions collection:", error);
    throw error;
  }
};

export const getShipmentsCollection = async () => {
  console.log("📁 Accessing shipments collection...");
  try {
    const connection = await getConnection();
    const collection = connection.collection("shipments");
    console.log("✅ Shipments collection accessed successfully");
    return collection;
  } catch (error) {
    console.error("❌ Error accessing shipments collection:", error);
    throw error;
  }
};
