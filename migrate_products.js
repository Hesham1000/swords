const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://Misho:xnWAC4rY2XoiERkw@musica.b2yy0uu.mongodb.net/Musica?retryWrites=true&w=majority";
  const client = new MongoClient(uri);

  const dryRun = process.argv.includes('--dry-run');

  try {
    await client.connect();
    const database = client.db('swords');
    const productsCollection = database.collection('products');

    console.log(`Starting ${dryRun ? 'DRY RUN ' : ''}migration...`);
    const allProducts = await productsCollection.find({}).toArray();
    console.log(`Found ${allProducts.length} products to process.`);

    for (const product of allProducts) {
      const { _id, productType } = product;
      
      // 1. Define shared fields to keep
      const sharedFields = [
        '_id', 'name', 'description', 'price', 'category', 'productType', 
        'brand', 'model', 'quantity', 'images', 'createdAt', 'updatedAt'
      ];

      // 2. Define type-specific fields to keep
      let typeSpecificFields = [];
      if (productType === "lame") {
        typeSpecificFields = ['isKings', 'isMini', 'lameColor', 'material', 'subCategory'];
      } else if (["grip", "guard", "guard_padding"].includes(productType)) {
        typeSpecificFields = ['subCategory', 'hand', 'material', 'isMini'];
      } else if (productType === "socket") {
        typeSpecificFields = ['subCategory'];
      }

      const allowedFields = [...sharedFields, ...typeSpecificFields];

      // 3. Construct cleaned product object
      const cleanedProduct = {};
      let hasChanges = false;
      let removedFields = [];

      // Keep only allowed fields that are not null/undefined/empty string
      Object.keys(product).forEach(key => {
        if (allowedFields.includes(key)) {
          const val = product[key];
          if (val !== null && val !== undefined && val !== "") {
            cleanedProduct[key] = val;
          } else if (sharedFields.includes(key) && (key === 'description' || key === 'model')) {
             // For description and model, keep as empty string if they are missing but required in interface
             cleanedProduct[key] = "";
          }
        } else {
          hasChanges = true;
          removedFields.push(key);
        }
      });

      // Check for missing mandatory fields (very basic check)
      if (cleanedProduct.brand === undefined) cleanedProduct.brand = "pbt";
      if (cleanedProduct.quantity === undefined) cleanedProduct.quantity = 0;

      if (hasChanges || Object.keys(product).length !== Object.keys(cleanedProduct).length) {
        if (dryRun) {
          console.log(`[Dry Run] Would update product ${_id} (${product.name}): Removed ${removedFields.join(', ')}`);
        } else {
          // Use replaceOne to ensure the document only has the cleaned fields
          await productsCollection.replaceOne({ _id: _id }, cleanedProduct);
          console.log(`Updated product ${_id} (${product.name}): Removed ${removedFields.join(', ')}`);
        }
      }
    }

    console.log(`${dryRun ? 'DRY RUN ' : ''}Migration complete.`);

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await client.close();
  }
}

main();
