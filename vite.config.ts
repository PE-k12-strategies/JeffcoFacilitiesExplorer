import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { facilityDataWatchPlugin } from "./server/dataWatchPlugin.ts";
import { dashboardGatePlugin } from "./server/gatePlugin.ts";

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.DASHBOARD_PASSWORD) {
    process.env.DASHBOARD_PASSWORD = env.DASHBOARD_PASSWORD;
  }

  return {
    base: "./",
    plugins: [
      facilityDataWatchPlugin(),
      dashboardGatePlugin(() => process.env.DASHBOARD_PASSWORD ?? env.DASHBOARD_PASSWORD),
      {
        name: "copy-jeffco-assets",
        buildStart() {
          copyJeffcoLogos();
          copyHomepageImages();
        },
      },
      {
        name: "serve-app-html",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            const path = req.url?.split("?")[0];
            if (path === "/" || path === "/index.html") {
              const query = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
              req.url = `/app.html${query}`;
            }
            next();
          });
        },
      },
      {
        name: "pages-output",
        closeBundle() {
          const routes = {
            version: 1,
            include: ["/*"],
            exclude: [] as string[],
          };
          writeFileSync(join("bundle", "_routes.json"), JSON.stringify(routes, null, 2));
          // assets/app.js keeps a fixed name, so browsers must revalidate or
          // they serve a stale bundle after every deploy.
          writeFileSync(
            join("bundle", "_headers"),
            ["/*", "  Cache-Control: no-cache", ""].join("\n"),
          );
          if (existsSync("bundle/app.html")) {
            copyFileSync("bundle/app.html", "bundle/index.html");
          }
          if (existsSync("bundle/data")) {
            rmSync("bundle/data", { recursive: true, force: true });
          }
          if (existsSync("private/data")) {
            mkdirSync("bundle/__facility", { recursive: true });
            cpSync("private/data", "bundle/__facility", { recursive: true });
            rmSync(join("bundle", "__facility", ".gitkeep"), { force: true });
          }
        },
      },
      react(),
    ],
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      fs: {
        deny: [
          ".env",
          ".env.*",
          ".dev.vars",
          "private/**",
          "Facility Data/**",
          "functions/**",
          "server/**",
        ],
      },
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
  };
});
