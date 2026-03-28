const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(
  'C:', 'Users', 'Lenovo', '.gemini', 'antigravity', 'brain',
  'a634ccb2-c250-47e6-bbeb-d61590d57027',
  'kings_logo_no_marketplace_1774677976811.png'
);

const outputPath = path.join(
  'C:', 'Users', 'Lenovo', '.gemini', 'antigravity', 'brain',
  'a634ccb2-c250-47e6-bbeb-d61590d57027',
  'kings_final_transparent.png'
);

async function removeBackground() {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    console.log('Input:', metadata.width, 'x', metadata.height);

    const { data, info } = await image
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const threshold = 65;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r < threshold && g < threshold && b < threshold + 20) {
        data[i + 3] = 0;
      }
    }

    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);

    console.log('Done! Saved to:', outputPath);
  } catch (err) {
    console.error('Error:', err);
  }
}

removeBackground();
