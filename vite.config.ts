import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
const host = process.env.TAURI_DEV_HOST;

// 读取 tauri.conf.json
const tauriConfPath = path.resolve(__dirname, 'src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));

// 获取软件名和版本号（tauri.conf.json 中可能位于 package.productName 或直接 productName，不同版本有差异）
const appName = tauriConf.package?.productName || tauriConf.productName || 'memoria';
const appVersion = tauriConf.package?.version || tauriConf.version || '0.0.0';
const releasePageUrl = tauriConf.plugins?.myConfig?.releasePageUrl || '';
// 注入构建时间
const buildTime = new Date().toISOString().slice(0, 10); // 格式: YYYY-MM-DD

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss()
  ],
  define: {
    'import.meta.env.VITE_APP_NAME': JSON.stringify(appName),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
    'import.meta.env.VITE_RELEASE_PAGE_URL': JSON.stringify(releasePageUrl),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 5174,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  optimizeDeps: {
    exclude: ['src-tauri'], // 不要预扫描 src-tauri 目录
  },
}));
