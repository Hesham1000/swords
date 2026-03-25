const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://Misho:xnWAC4rY2XoiERkw@musica.b2yy0uu.mongodb.net/Musica?retryWrites=true&w=majority";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('swords');
    const products = database.collection('products');

    console.log("Fetching all products...");
    const allProducts = await products.find({}).toArray();

    if (allProducts.length === 0) {
      console.log("No products found.");
      return;
    }

    console.log(`Found ${allProducts.length} products.`);

    // Analyze fields
    const fieldCounts = {};
    allProducts.forEach(p => {
      Object.keys(p).forEach(key => {
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      });
    });

    console.log("\nField occurrence counts:");
    console.log(JSON.stringify(fieldCounts, null, 2));

    console.log("\nSample product structure (first product):");
    console.log(JSON.stringify(allProducts[0], null, 2));

    // Identify products with missing or extra fields if possible
    // (Based on the Product interface we saw earlier)
    const expectedFields = [
      'name', 'description', 'price', 'category', 'productType',
      'brand', 'model', 'quantity', 'images', 'createdAt', 'updatedAt'
    ];

    console.log("\nProducts missing expected fields:");
    allProducts.forEach((p, i) => {
      const missing = expectedFields.filter(f => p[f] === undefined);
      if (missing.length > 0) {
        console.log(`Product ${i} (${p.name || 'unnamed'}): Missing ${missing.join(', ')}`);
      }
    });

  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

main();
