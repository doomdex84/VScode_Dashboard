import TimeSeriesHybrid from "./components/TimeSeriesHybrid";
import DistPieAnimated from "./components/DistPieAnimated";

// 샘플 데이터 (스프링 API 붙이기 전까지 테스트용)
const SAMPLE_DAILY = [
  { date: "2025-09-01", clicks: 120 },
  { date: "2025-09-02", clicks: 150 },
  { date: "2025-09-03", clicks: 90 },
  { date: "2025-10-01", clicks: 210 }
];

const SAMPLE_DEVICE = [
  { name: "desktop", count: 58 },
  { name: "mobile", count: 36 },
  { name: "tablet", count: 6 }
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500">React + Recharts + Tailwind(v4)</p>
          </div>
        </header>

        {/* 일/월/연 토글 시계열 (일=라인, 월/연=막대) */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">시계열 통계</h2>
          <TimeSeriesHybrid daily={SAMPLE_DAILY} />
        </section>

        {/* 파이 그래프 (심플 애니메이션/하이라이트 순환) */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">기기 분포 (파이)</h2>
          <DistPieAnimated data={SAMPLE_DEVICE} label="기기" />
        </section>
      </div>
    </div>
  );
}
