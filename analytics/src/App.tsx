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
    setScreen("dashboard");
    setOpenCreate(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") enter();
  }

  return (
    <div className="min-h-screen">
      {/* ───── 인트로 ───── */}
      {screen === "intro" && (
        <div className="fixed inset-0 grid place-items-center bg-gray-50 dark:bg-gray-900">
          <div className="w-[min(92vw,700px)] rounded-2xl border border-black/10 bg-white dark:bg-gray-800 shadow-2xl p-12">
            {/* 제목 */}
            <h1 className="text-5xl font-extrabold text-center mb-10 text-gray-900 dark:text-gray-100">
              링크보드 시작하기
            </h1>

            {/* 입력 + 버튼 */}
            <div className="flex flex-col gap-6">
              <input
                type="url"
                value={initUrl}
                onChange={(e) => setInitUrl(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="원문 링크를 입력하세요 (https://...)"
                className="w-full h-16 px-5 text-2xl rounded-xl border border-gray-300 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                onClick={enter}
                className="btn btn-ghost w-full h-16 text-2xl font-semibold"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── 대시보드 ───── */}
      {screen === "dashboard" && (
        <>
          <Dashboard title="링크보드" onOpenCreate={() => setOpenCreate(true)} />
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
