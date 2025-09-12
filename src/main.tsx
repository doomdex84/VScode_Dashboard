import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

// Tailwind 레이어
import "./tailwind.css";
// 전역 커스텀 스타일 (Vite 기본 다크 배경 제거 등)
import "./index.css";

const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
