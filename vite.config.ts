import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function copyJeffcoLogos() {
  try {
    mkdirSync("public/logos", { recursive: true });
    if (existsSync("Logos")) {
      cpSync("Logos", "public/logos", { recursive: true, force: true });
    }
    const wordmark = "FWL - PE_Wordmark_01_White_RGB_mr.png";
    const fromImages = join("Images", wordmark);
    if (existsSync(fromImages)) {
      copyFileSync(fromImages, join("public/logos", wordmark));
    }
  } catch (error) {
    console.warn("[copy-jeffco-logos] skipped:", (error as Error).message);
  }
}

const HOMEPAGE_IMAGES: Array<[string, string]> = [
  ["GHS Grads 2025-44-8.jpg", "hero-students.jpg"],
  ["Ms.Reyes.Lumberg.ES.2024-1.jpg", "card-learning.jpg"],
  ["Marshdale.Students.2022-1.jpg", "card-community.jpg"],
  ["Marshdale.Student.Walkthrough.041522-29.jpg", "card-schools.jpg"],
];

function copyHomepageImages() {
  try {
    if (!existsSync("Images")) return;
    mkdirSync("public/images", { recursive: true });
    for (const [from, to] of HOMEPAGE_IMAGES) {
      copyFileSync(join("Images", from), join("public/images", to));
    }
  } catch (error) {
    console.warn("[copy-homepage-images] skipped:", (error as Error).message);
  }
}

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "copy-jeffco-assets",
      buildStart() {
        copyJeffcoLogos();
        copyHomepageImages();
      },
    },
    react(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    watch: {
      ignored: [
        "**/Logos/**",
        "**/public/logos/**",
        "**/Images/**",
        "**/public/images/**",
        "**/bundle/**",
      ],
    },
  },
  build: {
    outDir: "bundle",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: "app.html",
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";
          if (name.endsWith(".css")) return "assets/app.css";
          return "assets/[name][extname]";
        },
      },
    },
  },
  optimizeDeps: {
    include: ["mapbox-gl"],
  },
});
