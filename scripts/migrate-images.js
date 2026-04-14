const { MongoClient } = require("mongodb");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

/**
 * MIGRATION SCRIPT: Local Filesystem to Cloudinary
 * 
 * Execution: node --env-file=.env scripts/migrate-images.js
 */

// Configuration from environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "swords";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrate() {
  console.log("🚀 Starting migration to Cloudinary...");
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db(MONGODB_DB_NAME);
    const productsCollection = db.collection("products");
    
    // Find products that have local image paths
    const products = await productsCollection.find({
      images: { $regex: /^\/uploads\// }
    }).toArray();
    
    console.log(`🔍 Found ${products.length} products with local images.`);
    
    let totalMigrated = 0;
    
    for (const product of products) {
      console.log(`\n📦 Processing product: ${product.name} (${product._id})`);
      
      const updatedImages = [];
      let productChanged = false;
      
      for (const imgPath of product.images) {
        if (imgPath.startsWith("/uploads/")) {
          // Resolve local file path
          // Note: Assumes script is run from project root
          const fullLocalPath = path.join(process.cwd(), "public", imgPath);
          
          if (fs.existsSync(fullLocalPath)) {
            console.log(`  📤 Uploading: ${imgPath}...`);
            
            try {
              const result = await cloudinary.uploader.upload(fullLocalPath, {
                folder: "products",
                resource_type: "auto",
              });
              
              // Extract the relative part (v123/products/xyz.jpg)
              const relativePath = result.secure_url.split("/upload/")[1];
              updatedImages.push(relativePath);
              productChanged = true;
              totalMigrated++;
              
              console.log(`  ✅ Success: ${relativePath}`);
            } catch (err) {
              console.error(`  ❌ Failed to upload ${imgPath}:`, err.message);
              updatedImages.push(imgPath); // Keep original if upload fails
            }
          } else {
            console.warn(`  ⚠️ File not found: ${fullLocalPath}`);
            updatedImages.push(imgPath);
          }
        } else {
          updatedImages.push(imgPath);
        }
      }
      
      if (productChanged) {
        await productsCollection.updateOne(
          { _id: product._id },
          { $set: { images: updatedImages, updatedAt: new Date().toISOString() } }
        );
        console.log(`  💾 Database updated.`);
      }
    }
    
    console.log(`\n✨ Migration complete!`);
    console.log(`📈 Images migrated: ${totalMigrated}`);
    
  } catch (err) {
    console.error("💥 Fatal error during migration:", err);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed.");
  }
}

migrate();
