// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

import "./tailwind.css"; // ⬅️ 반드시 먼저
import "./index.css";    // ⬅️ 그다음 (커스텀 토큰/컴포넌트)


const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
