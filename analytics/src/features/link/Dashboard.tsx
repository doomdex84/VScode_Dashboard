// src/features/link/Dashboard.tsx
import React from "react";
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
        {/* 왼쪽: 링크 생성 버튼 */}
        <div className="flex-1">
          <button
            className="btn btn-ghost normal-case text-lg"
            onClick={onOpenCreate}
          >
            링크 생성
          </button>
        </div>

        {/* 가운데: 로고/타이틀 */}
        <div className="flex-none">
          <a className="btn btn-ghost text-xl">{title}</a>
        </div>
      </div>

      {/* 본문: 링크 목록 */}
      <main className="p-6">
        <LinkList />
      </main>
    </div>
  );
}
