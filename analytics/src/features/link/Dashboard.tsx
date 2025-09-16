// src/features/link/Dashboard.tsx
import React from "react";
import LinkList from "./LinkList.tsx";

type Props = {
  title: string;
  onOpenCreate: () => void;
};

function BoardCard({ title }: { title: string }) {
  return (
    <div
      className="
        rounded-2xl bg-sky-50/90
        border border-sky-100
        shadow-[inset_8px_8px_16px_rgba(13,89,148,0.08),inset_-8px_-8px_16px_rgba(255,255,255,0.9),0_8px_24px_rgba(13,89,148,0.08)]
        min-h-[220px] p-5
        hover:shadow-[inset_8px_8px_16px_rgba(13,89,148,0.07),inset_-8px_-8px_16px_rgba(255,255,255,0.95),0_12px_30px_rgba(13,89,148,0.12)]
        transition-shadow
      "
    >
      <h3 className="font-semibold text-sky-900/90 mb-2">{title}</h3>
      {/* 내용 채우는 자리 */}
    </div>
  );
}

export default function Dashboard({ title, onOpenCreate }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* 상단바 */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-md bg-sky-500 text-white font-bold shadow-sm">
              L
            </div>
            <span className="font-semibold">{title}</span>
          </div>
          <button
            onClick={onOpenCreate}
            className="h-10 px-4 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            링크생성
          </button>
        </div>
      </header>

      {/* 4분할 */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BoardCard title="보드 #1" />
          <BoardCard title="보드 #2" />
          <BoardCard title="보드 #3" />
          <BoardCard title="보드 #4" />
        </section>

        {/* 목록(기존 기능 유지) */}
        <LinkList />
      </main>
    </div>
  );
}
