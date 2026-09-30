import { spawn } from "node:child_process";
import { join } from "node:path";
import type { Plugin, ViteDevServer } from "vite";

const DEBOUNCE_MS = 600;

function isFacilitySource(file: string): boolean {
  const normalized = file.replaceAll("\\", "/");
  const marker = "/Facility Data/";
  const index = normalized.indexOf(marker);
  if (index === -1) return false;
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (base.startsWith("~$") || base.startsWith(".")) return false;
  return /\.(csv|geojson)$/i.test(base);
}

function rebuildFacilityData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("py", ["-3", "scripts/build-data.py"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `build-data.py exited ${code}`));
    });
  });
}

export function facilityDataWatchPlugin(): Plugin {
  return {
    name: "facility-data-watch",
    apply: "serve",
    configureServer(server) {
      const sourceDir = join(process.cwd(), "Facility Data");
      let timer: ReturnType<typeof setTimeout> | undefined;
      let running = false;
      let queued = false;

      const notify = () => {
        server.ws.send({
          type: "custom",
          event: "facility-data",
          data: { at: Date.now() },
        });
      };

      const run = () => {
        if (running) {
          queued = true;
          return;
        }
        running = true;
        server.config.logger.info("[facility-data] rebuilding from Facility Data");
        rebuildFacilityData()
          .then(() => {
            server.config.logger.info("[facility-data] updated");
            notify();
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : "Rebuild failed";
            server.config.logger.error(`[facility-data] ${message}`);
          })
          .finally(() => {
            running = false;
            if (queued) {
              queued = false;
              run();
            }
          });
      };

      const schedule = (file: string) => {
        if (!isFacilitySource(file)) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          run();
        }, DEBOUNCE_MS);
      };

      const watch = (devServer: ViteDevServer) => {
        devServer.watcher.add(sourceDir);
        devServer.watcher.on("add", schedule);
        devServer.watcher.on("change", schedule);
        devServer.watcher.on("unlink", schedule);
      };

      watch(server);
    },
  };
}
