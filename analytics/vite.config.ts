// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // ✅ "@/..." → "/src/..." 로 인식 (프로젝트 루트 기준)
    alias: {
      "@": "/src",
    },
  },
  server: {
    proxy: {
      // 링크 생성
      "/links": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // 링크 조회/로그 (/api/links/…)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // 단축 링크 리다이렉트
      "/r": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
