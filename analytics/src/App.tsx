// src/App.tsx
import React, { useState } from "react";
import Dashboard from "./features/link/Dashboard.tsx";
import LinkCreateModal from "./features/link/LinkCreateModal.tsx";

export default function App() {
  const [screen, setScreen] = useState<"intro" | "dashboard">("intro");
  const [initUrl, setInitUrl] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  function enter() {
    if (!initUrl.trim()) return;
    // 시작하기 → 대시보드로만 이동 (모달은 열지 않음)
    setScreen("dashboard");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") enter();
  }

  return (
    <div className="min-h-screen">
      {/* ── INTRO ── */}
      {screen === "intro" && (
        <div
          className="fixed inset-0 grid place-items-center bg-gray-50 dark:bg-gray-900"
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            minHeight: "100vh",
            background: "var(--tw-bg, #f9fafb)",
          }}
        >
          <div
            className="rounded-2xl shadow-2xl border border-black/10 bg-white dark:bg-gray-800 p-12"
            style={{
              width: "min(92vw, 760px)",
              borderRadius: 16,
              background: "white",
            }}
          >
            <h1
              className="text-center mb-12 dark:text-gray-100"
              style={{
                fontWeight: 800,
                lineHeight: 1.1,
                fontSize: "clamp(42px, 8vw, 96px)",
                color: "#0f172a",
                textRendering: "optimizeLegibility",
              }}
            >
              링크보드 시작하기
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <input
                type="url"
                value={initUrl}
                onChange={(e) => setInitUrl(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="원문 링크를 입력하세요 (https://...)"
                style={{
                  width: "100%",
                  height: 64,
                  padding: "0 20px",
                  fontSize: 22,
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#0f172a",
                  outline: "none",
                }}
              />

              <button
                onClick={enter}
                className="btn btn-ghost btn-xs sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl"
                style={{
                  display: "block",
                  width: "100%",
                  height: 64,
                  fontSize: 22,
                  fontWeight: 600,
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  color: "#0f172a",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                }}
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {screen === "dashboard" && (
        <>
          {/* title prop 제거! */}
          <Dashboard onOpenCreate={() => setOpenCreate(true)} />
          {openCreate && (
            <LinkCreateModal
              defaultUrl={initUrl}
              onClose={() => setOpenCreate(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
