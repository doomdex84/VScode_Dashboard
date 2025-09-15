import React from "react";
import "./App.css";
import "./index.css"; // 폰트/색 보정
import { QRCodeCanvas } from "qrcode.react";
import LinkCreator from "./features/link/LinkCreator";
import LinkList from "./features/link/LinkList";
import TimeSeriesHybrid from "./components/TimeSeriesHybrid";

/** ─────────────────────────────────────────────────────────
 *  최소 수정 원칙:
 *  - 기존 LinkCreator / LinkList 그대로 사용
 *  - 새 라이브러리 추가 X (Tailwind 유틸만 사용)
 *  - 전체 레이아웃/카드/타이포그래피/아이콘만 손봄
 *  - 레퍼런스처럼: 사이드바 / 상단헤더 / 카드형 위젯 / 차트영역 / 표영역
 *  ───────────────────────────────────────────────────────── */

type Stat = { label: string; value: string | number; delta?: string; good?: boolean };

const statsTop: Stat[] = [
  { label: "누적 클릭", value: 570, delta: "+5.6%", good: true },
  { label: "활성 세션", value: 506, delta: "+24.3%", good: true },
  { label: "신규 클릭", value: 46, delta: "-19.3%", good: false },
];

const deviceDist = [
  { name: "desktop", value: 58 },
  { name: "mobile", value: 36 },
  { name: "tablet", value: 6 },
];

function StatCard({ s }: { s: Stat }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 px-5 py-4 hover:shadow-md transition">
      <div className="text-muted text-sm">{s.label}</div>
      <div className="mt-1 flex items-end gap-2">
        <div className="text-2xl font-semibold">{s.value}</div>
        {s.delta && (
          <span
            className={`text-xs px-2 py-0.5 rounded-md ${
              s.good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {s.delta}
          </span>
        )}
      </div>
    </div>
  );
}

function DeviceDonut() {
  // 라이브러리 없이 SVG 도넛 (의존성 추가 없이 구성)
  const total = deviceDist.reduce((a, b) => a + b.value, 0);
  const circ = 2 * Math.PI * 42; // r=42
  let offset = 0;

  const palette = ["#3B82F6", "#F59E0B", "#10B981"]; // blue / amber / emerald

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
      <div className="font-semibold mb-3">기기 분포</div>
      <div className="flex items-center gap-6">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <g transform="translate(60,60)">
            <circle r="42" fill="none" stroke="#e5e7eb" strokeWidth="14" />
            {deviceDist.map((d, i) => {
              const frac = d.value / total;
              const dash = circ * frac;
              const el = (
                <circle
                  key={d.name}
                  r="42"
                  fill="none"
                  stroke={palette[i % palette.length]}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return el;
            })}
            <text y="5" textAnchor="middle" className="fill-gray-800" style={{ fontSize: 14, fontWeight: 600 }}>
              총 {total}
            </text>
          </g>
        </svg>

        <ul className="text-sm space-y-1">
          {deviceDist.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="capitalize text-gray-600 w-16">{d.name}</span>
              <span className="font-medium">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-dashboard">
      {/* 상단 바 */}
      <header className="h-14 shrink-0 border-b border-black/5 bg-white/90 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <i className="bx bxs-dashboard text-primary text-xl" />
          <span className="font-semibold text-lg">DashPro</span>
          <span className="text-muted">| Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost">
            <i className="bx bx-bell text-xl" />
          </button>
          <button className="btn-primary">
            <i className="bx bx-calendar mr-1" />
            오늘
          </button>
        </div>
      </header>

      {/* 본문 레이아웃 */}
      <div className="h-[calc(100vh-56px)] flex">
        {/* 사이드바 */}
        <aside className="hidden md:block w-64 border-r border-black/5 bg-white p-4">
          <div className="text-xs text-muted mb-3">MENU</div>
          <nav className="space-y-1">
            <a className="nav-item active">
              <i className="bx bx-stats" />
              <span>Analytics Dashboard</span>
            </a>
            <a className="nav-item">
              <i className="bx bx-link" />
              <span>Link Creator</span>
            </a>
            <a className="nav-item">
              <i className="bx bx-list-ul" />
              <span>Link List</span>
            </a>
          </nav>

          <div className="mt-8 text-xs text-muted">QUICK</div>
          <div className="mt-2 rounded-xl bg-gray-50 p-3">
            <div className="text-sm font-medium mb-2">QR 미리보기</div>
            <div className="flex items-center justify-center rounded-lg bg-white ring-1 ring-black/5 p-3">
              <QRCodeCanvas value="https://example.com" size={96} />
            </div>
          </div>
        </aside>

        {/* 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
          {/* 타이틀 + 필터 */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Analytics Dashboard</h1>
            <div className="flex items-center gap-2">
              <select className="select">
                <option>이번 주</option>
                <option>지난 주</option>
                <option>지난 30일</option>
              </select>
              <button className="btn-ghost">
                <i className="bx bx-dots-horizontal-rounded text-xl" />
              </button>
            </div>
          </div>

          {/* 상단 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsTop.map((s) => (
              <StatCard key={s.label} s={s} />
            ))}
          </div>

          {/* 차트 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SectionCard
                title="일별/시간대 트렌드"
                right={
                  <div className="flex items-center gap-2">
                    <button className="chip">클릭수</button>
                    <button className="chip chip-muted">세션</button>
                    <button className="chip chip-muted">전환</button>
                  </div>
                }
              >
                {/* 기존 컴포넌트 재사용 */}
                <div className="h-[300px] md:h-[360px]">
                  <TimeSeriesHybrid />
                </div>
              </SectionCard>
            </div>

            <DeviceDonut />
          </div>

          {/* 생성/목록 카드 (기존 기능 그대로) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Link Creator">
              <LinkCreator />
            </SectionCard>

            <SectionCard
              title="Link List"
              right={<span className="text-sm text-muted">총 {deviceDist.reduce((a, b) => a + b.value, 0)} 건</span>}
            >
              <LinkList />
            </SectionCard>
          </div>
        </main>
      </div>
    </div>
  );
}
