import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp('public/icons/logo.png')
    .resize(size, size)
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`✅ icon-${size}x${size}.png`);
}

await sharp('public/icons/logo.png')
  .resize(180, 180)
  .toFile('public/icons/apple-touch-icon.png');
console.log('✅ apple-touch-icon.png');
