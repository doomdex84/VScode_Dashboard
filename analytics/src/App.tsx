import React, { useState } from "react";
import AdminLayout from "./components/AdminLayout";
import LinkCreator from "./features/link/LinkCreator";
import TimeSeriesHybrid from "./components/TimeSeriesHybrid";
import DistPieAnimated from "./components/DistPieAnimated";

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
  const [view, setView] = useState<View>("dashboard");

  return (
    <AdminLayout>
      {/* 탭 버튼 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView("dashboard")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            view === "dashboard" ? "bg-indigo-600 text-white" : "bg-white border text-gray-700 hover:bg-gray-50"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setView("links")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            view === "links" ? "bg-indigo-600 text-white" : "bg-white border text-gray-700 hover:bg-gray-50"
          }`}
        >
          Link Creator
        </button>
      </div>

      {view === "links" ? (
        <section className="rounded-xl bg-white p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">링크 생성 & QR</h2>
          <LinkCreator />
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl bg-white p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">시계열 통계</h2>
            <TimeSeriesHybrid daily={SAMPLE_DAILY} />
          </section>
          <section className="rounded-xl bg-white p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">기기 분포</h2>
            <DistPieAnimated data={SAMPLE_DEVICE} label="기기" />
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
