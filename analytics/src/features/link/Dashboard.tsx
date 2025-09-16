// src/features/link/Dashboard.tsx
import React from "react";
import AnalyticsDashboard from "../../components/AnalyticsDashboard";
import LinkList from "./LinkList";

type Props = { onOpenCreate: () => void };

export default function Dashboard({ onOpenCreate }: Props) {
  return (
    <div className="min-h-screen bg-base-200">
<<<<<<< HEAD
      <header className="sticky top-0 z-40 bg-base-100 shadow-sm">
        <div className="navbar max-w-6xl mx-auto px-4">
          {/* 왼쪽: 로고 */}
          <div className="navbar-start">
            <a className="btn btn-ghost px-2" href="/" aria-label="LINGBO 홈">
              {/* public 폴더에 두었으므로 import 없이 절대경로로 */}
              <img src="/lingbo-logo.png" alt="LINGBO" className="h-8 w-auto" draggable={false} />
            </a>
          </div>

          <div className="navbar-center hidden md:flex" />

          {/* 오른쪽: 링크 생성 버튼 */}
          <div className="navbar-end">
            <button className="btn btn-primary btn-sm md:btn-md" onClick={onOpenCreate}>
              링크 생성
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <LinkList />
        </div>
=======
      {/* 상단 네비게이션 바 */}
      <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <button className="btn btn-ghost normal-case text-lg" onClick={onOpenCreate}>
            링크 생성
          </button>
        </div>
        <div className="flex-none">
          <a className="btn btn-ghost text-xl">{title}</a>
        </div>
      </div>

      {/* 본문: ↑통계 / ↓링크목록 (분리) */}
      <main className="p-6 space-y-8">
        {/* 통계 섹션 (2×2 그래프) */}
        <AnalyticsDashboard />

        {/* 링크 목록 섹션 */}
        <section className="bg-base-100 rounded-2xl p-6 md:p-8 shadow border border-base-200">
          <LinkList />
        </section>
>>>>>>> d6e706ed3df4374ab3129c0ac26d3311b4b035df
      </main>
    </div>
  );
}
