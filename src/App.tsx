import React, { useState } from "react";
import LinkCreator from "./features/link/LinkCreator";
import TimeSeriesHybrid from "./components/TimeSeriesHybrid";
import DistPieAnimated from "./components/DistPieAnimated";

// 샘플 데이터 (스프링 API 연결 전 임시)
const SAMPLE_DAILY = [
  { date: "2025-09-01", clicks: 120 },
  { date: "2025-09-02", clicks: 150 },
  { date: "2025-09-03", clicks: 90 },
  { date: "2025-10-01", clicks: 210 },
];

const SAMPLE_DEVICE = [
  { name: "desktop", count: 58 },
  { name: "mobile", count: 36 },
  { name: "tablet", count: 6 },
];

type View = "links" | "dashboard";

export default function App() {
  const [view, setView] = useState<View>("links"); // 기본: 링크 생성

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 상단 네비 (간단 탭) */}
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Project</h1>
            <p className="text-sm text-gray-500">
              Link Creator + Analytics (React + Tailwind)
            </p>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setView("links")}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                view === "links"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-800 hover:bg-gray-50 border-gray-300"
              }`}
              aria-current={view === "links" ? "page" : undefined}
            >
              링크 생성
            </button>
            <button
              onClick={() => setView("dashboard")}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                view === "dashboard"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-800 hover:bg-gray-50 border-gray-300"
              }`}
              aria-current={view === "dashboard" ? "page" : undefined}
            >
              대시보드
            </button>
          </nav>
        </header>

        {/* 본문 */}
        {view === "links" ? (
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">링크 생성</h2>
            <LinkCreator />
          </section>
        ) : (
          <>
            {/* 시계열 */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">시계열 통계</h2>
              <TimeSeriesHybrid daily={SAMPLE_DAILY} />
            </section>

            {/* 파이 */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">기기 분포 (파이)</h2>
              <DistPieAnimated data={SAMPLE_DEVICE} label="기기" />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
