// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "./features/link/Dashboard.tsx";
import LinkCreateModal from "./features/link/LinkCreateModal.tsx";

/** 쿼리스트링에서 screen을 읽어오기 */
function getScreenFromQuery(): "intro" | "dashboard" | null {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("screen");
    if (v === "intro" || v === "dashboard") return v;
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  // ✅ 초기값: 1) URL ?screen=... 2) sessionStorage 3) fallback "intro"
  const initialScreen = useMemo<"intro" | "dashboard">(() => {
    const fromQuery = getScreenFromQuery();
    if (fromQuery) return fromQuery;
    const saved = sessionStorage.getItem("screen");
    return saved === "dashboard" ? "dashboard" : "intro";
  }, []);

  const [screen, setScreen] = useState<"intro" | "dashboard">(initialScreen);
  const [initUrl] = useState(""); // 입력칸 제거로 현재는 사용 안 함
  const [openCreate, setOpenCreate] = useState(false);

  /** ✅ 화면 상태를 sessionStorage에 저장 (새로고침 복원용) */
  useEffect(() => {
    sessionStorage.setItem("screen", screen);
  }, [screen]);

  /** 시작하기 → 대시보드로 이동 (+ URL에도 반영해서 공유 가능) */
  function enter() {
    setScreen("dashboard");
    const sp = new URLSearchParams(window.location.search);
    sp.set("screen", "dashboard");
    const next = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState({}, "", next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
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
              className="text-center mb-10 dark:text-gray-100"
              style={{
                fontWeight: 800,
                lineHeight: 1.1,
                fontSize: "clamp(42px, 8vw, 96px)",
                color: "#0f172a",
                textRendering: "optimizeLegibility",
                textShadow: "2px 2px 6px rgba(0,0,0,0.25)",
              }}
            >
              <span className="text-blue-600">L</span>ING
              <span className="text-blue-600">B</span>O
            </h1>

            <button
              onClick={enter}
              onKeyDown={onKeyDown}
              className="btn w-full h-16 text-xl font-semibold border border-gray-300 bg-white hover:bg-gray-50"
              style={{
                borderRadius: 14,
                boxShadow: "0 4px 8px rgba(0,0,0,0.25)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {screen === "dashboard" && (
        <>
          {/* 상단 헤더 */}
          <div className="w-full bg-base-100 shadow-sm">
            <div className="mx-auto max-w-screen-2xl flex items-center justify-between px-4 py-3">
              {/* 왼쪽: 아이콘 + 타이틀 */}
              <div className="flex items-center gap-2 min-w-0">
                {/* public/lingbo-logo.png 여야 함 */}
                <img
                  src="/lingbo-logo.png"
                  alt="Lingbo Logo"
                  className="h-8 w-8 md:h-9 md:w-9 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    console.warn("logo not found: /lingbo-logo.png");
                  }}
                />
                <span className="text-lg font-semibold truncate">링크보드</span>
              </div>

              {/* 오른쪽: 링크 생성 버튼 */}
              <button
                className="btn btn-primary shrink-0"
                onClick={() => setOpenCreate(true)}
              >
                링크 생성
              </button>
            </div>
          </div>

          {/* 본문 */}
          <Dashboard />

          {/* 링크 생성 모달 */}
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
