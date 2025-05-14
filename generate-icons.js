import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateIcons() {
  try {
    const publicDir = join(__dirname, "public");
    const sourceImage = join(publicDir, "pocket-bunnies.png");
    const transparentImage = join(publicDir, "pocket-bunnies-transparent.png");
    const headImage = join(publicDir, "pocket-bunnies-head.png");

    // Make sure our source images exist
    if (!fs.existsSync(sourceImage)) {
      throw new Error(`Source image not found: ${sourceImage}`);
    }
    if (!fs.existsSync(transparentImage)) {
      throw new Error(`Transparent image not found: ${transparentImage}`);
    }
    if (!fs.existsSync(headImage)) {
      throw new Error(`Head image not found: ${headImage}`);
    }

    // Generate PWA icons (use non-transparent version for better cross-platform compatibility)
    await sharp(sourceImage)
      .resize(192, 192)
      .toFile(join(publicDir, "pwa-192x192.png"));
    console.log("Created pwa-192x192.png");

    await sharp(sourceImage)
      .resize(512, 512)
      .toFile(join(publicDir, "pwa-512x512.png"));
    console.log("Created pwa-512x512.png");

    // Generate maskable icon specifically for Android
    await sharp(sourceImage)
      .resize(512, 512)
      .toFile(join(publicDir, "maskable-512x512.png"));
    console.log("Created maskable-512x512.png");

    // Generate Apple touch icon (180x180)
    await sharp(sourceImage)
      .resize(180, 180)
      .toFile(join(publicDir, "apple-touch-icon.png"));
    console.log("Created apple-touch-icon.png");

    // Generate smaller favicons using the head image (can be transparent for browser favicons)
    await sharp(headImage)
      .resize(32, 32)
      .toFile(join(publicDir, "favicon-32x32.png"));
    console.log("Created favicon-32x32.png");

    await sharp(headImage)
      .resize(16, 16)
      .toFile(join(publicDir, "favicon-16x16.png"));
    console.log("Created favicon-16x16.png");

    // Generate a 128x128 icon for app stores and other uses
    await sharp(sourceImage)
      .resize(128, 128)
      .toFile(join(publicDir, "icon-128x128.png"));
    console.log("Created icon-128x128.png");

    // Generate a 64x64 icon using the head image
    await sharp(headImage)
      .resize(64, 64)
      .toFile(join(publicDir, "icon-64x64.png"));
    console.log("Created icon-64x64.png");

    console.log("All icons generated successfully!");
  } catch (error) {
    console.error("Error generating icons:", error);
  }
}

generateIcons();
