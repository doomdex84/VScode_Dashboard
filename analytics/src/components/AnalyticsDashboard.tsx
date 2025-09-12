import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/**
 * AnalyticsDashboard
 * - Light(white full-screen) / Dark(black full-screen) theme
 * - 4-up layout: Line(Day/Month/Year), Bar(By Hour), Bar(By Channel), Pie(By Device)
 * - External-only drop-in: src/components/AnalyticsDashboard.tsx
 *
 * NOTE: This file exports a *default* React component to satisfy Vite Fast Refresh.
 */

// color palettes -------------------------------------------------------------
const LIGHT = {
  indigo: "#6366F1",
  blue: "#2563EB",
  cyan: "#06B6D4",
  emerald: "#10B981",
  amber: "#F59E0B",
  violet: "#8B5CF6",
  slate300: "#E5E7EB",
  slate700: "#111827",
  text: "#0f172a",
};
const DARK = {
  // Dark theme inspired by the 3rd screenshot (navy/indigo tone)
  indigo: "#7dd3fc",   // light sky for accents
  blue: "#60a5fa",     // line accent
  cyan: "#22d3ee",     // secondary accent
  emerald: "#34d399",  // bars (channel)
  amber: "#fbbf24",    // donut slice
  violet: "#bda6ff",   // bars (hour) without gradient
  slate300: "#2a3b55", // grid
  slate700: "#e2e8f0", // ticks/text
  text: "#e6edf7",
  page: "#0b1220",     // deep navy background like screenshot
  panel: "#141f2f",    // card surface
};

type Granularity = "day" | "month" | "year";
interface Point { label: string; value: number }

// demo data -----------------------------------------------------------------
function seedRand(seed: number) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}
function makeSeries(count: number, labelFn: (i: number) => string, base = 100, variance = 60, seed = 1): Point[] {
  const rnd = seedRand(seed);
  return Array.from({ length: count }, (_, i) => ({
    label: labelFn(i),
    value: Math.max(0, Math.round(base + (rnd() - 0.5) * 2 * variance + i * (variance / 10)))
  }));
}
const daily = makeSeries(14, (i) => `${i + 1}일`, 150, 80, 2);
const monthly = makeSeries(12, (i) => `${i + 1}월`, 300, 160, 3);
const yearly = makeSeries(5, (i) => `${2020 + i}년`, 1800, 800, 4);
const byHour = makeSeries(24, (i) => `${String(i).padStart(2, "0")}:00`, 40, 35, 5);
const byChannel: { channel: string; value: number }[] = [
  { channel: "Instagram", value: 420 },
  { channel: "Kakao", value: 360 },
  { channel: "Naver Blog", value: 280 },
  { channel: "Direct", value: 240 },
  { channel: "Others", value: 120 },
];
const byDeviceBase: { name: string; value: number }[] = [
  { name: "Mobile", value: 62 },
  { name: "Desktop", value: 30 },
  { name: "Tablet", value: 8 },
];

// ui primitives --------------------------------------------------------------
const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; isDark?: boolean }> = ({ title, right, children, isDark = false }) => {
  return (
    <div
      className="rounded-2xl shadow-sm p-4 flex flex-col w-full"
      style={{ height: 380, width: "100%", borderRadius: 16,
        background: isDark ? DARK.panel : "#ffffff",
        border: `1px solid ${isDark ? "#1f2b3e" : "#E5E7EB"}`,
        boxShadow: isDark ? "0 10px 24px rgba(0,0,0,0.55)" : "0 10px 24px rgba(15,23,42,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-900 dark:text-slate-100 font-semibold tracking-tight" style={{color: isDark ? DARK.text : "#0f172a"}}>{title}</h3>
        {right}
      </div>
      <div className="flex-1 min-h-0 w-full">{children}</div>
    </div>
  );
};

const Toggle: React.FC<{ value: Granularity; onChange: (v: Granularity) => void }> = ({ value, onChange }) => {
  const items: Granularity[] = ["day", "month", "year"];
  const labels: Record<Granularity, string> = { day: "일", month: "월", year: "연도" };
  return (
    <div className="inline-flex rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      {items.map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={
            "px-3 py-1.5 text-sm font-medium transition-colors " +
            (value === k
              ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-inner"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800")
          }
        >
          {labels[k]}
        </button>
      ))}
    </div>
  );
};

// component ------------------------------------------------------------------

// component ------------------------------------------------------------------
const AnalyticsDashboard: React.FC = () => {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [isDark, setIsDark] = useState(false);

  const C = isDark ? DARK : LIGHT;

  const lineData = useMemo(() => {
    if (granularity === "day") return daily;
    if (granularity === "month") return monthly;
    return yearly;
  }, [granularity]);

  const deviceData = useMemo(() => {
    const fills = [C.indigo, C.emerald, C.amber];
    return byDeviceBase.map((d, i) => ({ ...d, color: fills[i % fills.length] }));
  }, [isDark]);

  const tooltipStyle: React.CSSProperties = {
  background: isDark ? "#0f1729" : "#ffffff",
  borderColor: isDark ? DARK.slate300 : "#E5E7EB",
  color: isDark ? DARK.text : "#0f172a",
};

  // no inner surface shading — only outer card shadow per user preference

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-[100vh] w-full" style={{ background: isDark ? DARK.page : "#ffffff" }}>
        <div className="w-full max-w-none mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Analytics Dashboard</h2>
            <button
              onClick={() => setIsDark((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-neutral-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {isDark ? "🌙 Dark" : "🌞 Light"}
            </button>
          </div>

          {/* grid: always 2 columns; inline fallback guarantees 4-up even without Tailwind */}
          <div
            className="grid grid-cols-2 gap-6 min-w-0"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            {/* 1) Line: Day/Month/Year */}
            <Card isDark={isDark} title="일 / 월 / 연도 추이" right={<Toggle value={granularity} onChange={setGranularity} />}>
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.slate300} />
                    <XAxis dataKey="label" tick={{ fill: C.slate700 }} tickLine={false} axisLine={{ stroke: C.slate300 }} />
                    <YAxis tick={{ fill: C.slate700 }} tickFormatter={(n) => new Intl.NumberFormat().format(n as number)} width={50} axisLine={{ stroke: C.slate300 }} />
                    <Tooltip formatter={(v: number) => new Intl.NumberFormat().format(v)} cursor={{ stroke: C.slate300 }} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="value" stroke={C.blue} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 2) Bar: by Hour */}
            <Card isDark={isDark} title="시간대 분포">
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byHour} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.slate300} />
                    <XAxis dataKey="label" tick={{ fill: C.slate700 }} tickLine={false} axisLine={{ stroke: C.slate300 }} interval={2} />
                    <YAxis tick={{ fill: C.slate700 }} tickFormatter={(n) => new Intl.NumberFormat().format(n as number)} width={50} axisLine={{ stroke: C.slate300 }} />
                    <Tooltip formatter={(v: number) => new Intl.NumberFormat().format(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill={C.violet} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 3) Bar: by Channel */}
            <Card isDark={isDark} title="채널별 유입">
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byChannel} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke={C.slate300} />
                    <XAxis type="number" tick={{ fill: C.slate700 }} tickFormatter={(n) => new Intl.NumberFormat().format(n as number)} axisLine={{ stroke: C.slate300 }} />
                    <YAxis type="category" dataKey="channel" width={110} tick={{ fill: C.slate700 }} tickLine={false} axisLine={{ stroke: C.slate300 }} />
                    <Tooltip formatter={(v: number) => new Intl.NumberFormat().format(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill={C.emerald} radius={10} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 4) Pie: by Device */}
            <Card isDark={isDark} title="기기별 비율">
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: C.text }} />
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={tooltipStyle} />
                    <Pie
                      data={deviceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={110}
                      strokeWidth={4}
                      label={(e) => `${e.name} ${e.value}%`}
                      labelLine={false}
                    >
                      {deviceData.map((d, idx) => (
                        <Cell key={idx} fill={(d as any).color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
