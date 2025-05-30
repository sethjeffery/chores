import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { analyzer } from "vite-bundle-analyzer";

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": process.env.API_HOST ?? "http://localhost:3000",
    },
  },
  plugins: [
    analyzer(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "icon-64x64.png",
        "icon-128x128.png",
        "pocket-bunnies-head.png",
        "pocket-bunnies-clip.png",
        "src/features/family/assets/avatars/*.png",
      ],
      manifest: {
        name: "Pocket Bunnies",
        short_name: "Bunnies",
        description:
          "A fun app for tracking pocket money and chores with a cute bunny theme!",
        theme_color: "#6366f1",
        background_color: "#6366f1",
        icons: [
          {
            src: "favicon-16x16.png",
            sizes: "16x16",
            type: "image/png",
          },
          {
            src: "favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
          {
            src: "icon-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
