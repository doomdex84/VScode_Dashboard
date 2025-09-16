// src/features/link/Dashboard.tsx
import React from "react";
import AnalyticsDashboard from "../../components/AnalyticsDashboard";
import LinkList from "./LinkList";

type Props = {
  title?: string;
  onOpenCreate: () => void;
};

export default function Dashboard({ title = "링크보드", onOpenCreate }: Props) {
  return (
    <div className="min-h-screen bg-base-200">
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
      </main>
    </div>
  );
}
