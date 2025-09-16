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
      // 분석/통계 API (프론트 http.ts 기본 BASE=/api와 매칭)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
<<<<<<< HEAD
      // 링크 조회/로그 (/api/links/…)
      "/api": {
=======
      // 링크 생성(POST /links 등): 백엔드에 루트(/links) 엔드포인트가 있으므로 필요
      "/links": {
>>>>>>> d6e706ed3df4374ab3129c0ac26d3311b4b035df
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
      // QR 이미지/페이지
      "/q": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
