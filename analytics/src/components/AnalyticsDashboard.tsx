import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";

import {
  getTimeDistribution, getChannels, getLinkLogs,
  type TimeGranularity
} from "../api/links";

/**
 * AnalyticsDashboard (API 연결판)
 * - 화면 전체: 라이트=흰색, 다크=네이비톤(#0b1220)
 * - 4분면: 라인(일/월/연), 막대(시간대), 막대(채널), 파이(기기)
 * - 바/파이: 단색(그라데이션 없음)
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
  indigo: "#7dd3fc",
  blue: "#60a5fa",
  cyan: "#22d3ee",
  emerald: "#34d399",
  amber: "#fbbf24",
  violet: "#bda6ff",
  slate300: "#2a3b55",
  slate700: "#e2e8f0",
  text: "#e6edf7",
  page: "#0b1220",
  panel: "#141f2f",
};

type Granularity = "day" | "month" | "year";
type Point = { label: string; value: number };

// ui primitives --------------------------------------------------------------
const Card: React.FC<{
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  isDark?: boolean;
}> = ({ title, right, children, isDark = false }) => {
  return (
    <div
      className="shadow-sm p-4 flex flex-col w-full"
      style={{
        height: 380,
        width: "100%",
        borderRadius: 16, // 바깥만 둥글게
        background: isDark ? DARK.panel : "#ffffff",
        border: `1px solid ${isDark ? "#1f2b3e" : "#E5E7EB"}`,
        boxShadow: isDark ? "0 10px 24px rgba(0,0,0,0.55)" : "0 10px 24px rgba(15,23,42,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-semibold tracking-tight"
          style={{ color: isDark ? DARK.text : "#0f172a" }}
        >
          {title}
        </h3>
        {right}
      </div>
      <div className="flex-1 min-h-0 w-full">{children}</div>
    </div>
  );
};

const Toggle: React.FC<{ value: Granularity; onChange: (v: Granularity) => void }> = ({
  value,
  onChange,
}) => {
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

// helpers --------------------------------------------------------------------
const numberFmt = (n: number) => new Intl.NumberFormat().format(n);

// API granularity 매핑: UI '일/월/연' -> API 'dow/month/(month→연도 집계)'
const toApiGran = (g: Granularity): TimeGranularity => (g === "day" ? "dow" : "month");

// logs -> 채널 집계(fallback)
function aggregateChannelsFromLogs(
  logs: Array<{ referrer?: string | null; channel?: string | null }>
): { channel: string; value: number }[] {
  const m = new Map<string, number>();
  for (const l of logs) {
    const ch = (l.channel || "").trim();
    if (ch) {
      m.set(ch, (m.get(ch) || 0) + 1);
      continue;
    }
    const host = (l.referrer || "").replace(/^https?:\/\//, "").split("/")[0] || "Direct";
    m.set(host, (m.get(host) || 0) + 1);
  }
  return Array.from(m, ([channel, value]) => ({ channel, value })).sort((a, b) => b.value - a.value);
}

// logs -> 기기 집계
function aggregateDevicesFromLogs(
  logs: Array<{ deviceType?: string | null }>
): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const l of logs) {
    const k = (l.deviceType || "Unknown").trim() || "Unknown";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

// component ------------------------------------------------------------------
const AnalyticsDashboard: React.FC = () => {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [isDark, setIsDark] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 실데이터 상태
  const [lineData, setLineData] = useState<Point[]>([]);
  const [hourData, setHourData] = useState<Point[]>([]);
  const [channelData, setChannelData] = useState<{ channel: string; value: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);

  const C = isDark ? DARK : LIGHT;

  // slug: URL ?slug=... or default
  const slug = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("slug") || "V8aNfV";
  }, []);

  // 데이터 로딩
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) Line: UI granularity → API granularity
        const apiGran = toApiGran(granularity);
        const lineBuckets = await getTimeDistribution(slug, apiGran);

        // year(연도) 선택 시: month 시계열을 연도 단위로 합산
        let linePoints: Point[];
        if (granularity === "year") {
          const yearMap = new Map<string, number>();
          for (const b of lineBuckets) {
            const year = String(b.bucket).slice(0, 4);
            yearMap.set(year, (yearMap.get(year) || 0) + (b as any).cnt);
          }
          linePoints = Array.from(yearMap, ([label, value]) => ({ label, value })).sort((a, b) =>
            a.label.localeCompare(b.label)
          );
        } else {
          linePoints = lineBuckets.map((b: any) => ({ label: String(b.bucket), value: b.cnt }));
        }

        // 2) Hourly bar
        const hourBuckets = await getTimeDistribution(slug, "hour");
        const hourPoints = hourBuckets.map((b: any) => ({ label: String(b.bucket), value: b.cnt }));

        // 3) Channels bar: 우선 API, 실패/빈값이면 logs로 집계
        let channels: { channel: string; value: number }[] = [];
        try {
          const apiChannels = await getChannels(slug);
          channels = (apiChannels as any[]).map((c: any) => ({ channel: c.key, value: c.cnt }));
        } catch {
          channels = [];
        }
        if (!channels.length) {
          const logs = await getLinkLogs(slug);
          channels = aggregateChannelsFromLogs(logs as any[]);
        }

        // 4) Devices pie: logs에서 deviceType 집계
        const logs = await getLinkLogs(slug);
        const devices = aggregateDevicesFromLogs(logs as any[]);

        if (!alive) return;
        setLineData(linePoints);
        setHourData(hourPoints);
        setChannelData(channels);
        setDeviceData(devices);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "데이터 로딩 실패");
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug, granularity]);

  const tooltipStyle: React.CSSProperties = {
    background: isDark ? "#0f1729" : "#ffffff",
    borderColor: isDark ? DARK.slate300 : "#E5E7EB",
    color: isDark ? DARK.text : "#0f172a",
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div
        className="min-h-[100vh] w-full"
        style={{ background: isDark ? DARK.page : "#ffffff" }}
      >
        <div className="w-full max-w-none mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl font-semibold"
              style={{ color: isDark ? DARK.text : "#0f172a" }}
            >
              Analytics Dashboard
            </h2>
            <button
              onClick={() => setIsDark((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-neutral-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800"
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {isDark ? "🌙 Dark" : "🌞 Light"}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 12px",
                borderRadius: 12,
                background: isDark ? "#1e293b" : "#fef2f2",
                color: isDark ? "#fecaca" : "#991b1b",
                border: `1px solid ${isDark ? "#334155" : "#fecaca"}`,
              }}
            >
              API 에러: {error}
            </div>
          )}

          {/* 항상 2열(4등분). Tailwind 비활성 대비 inline fallback 포함 */}
          <div
            className="grid grid-cols-2 gap-6 min-w-0"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            {/* 1) Line: 일/월/연도 */}
            <Card
              isDark={isDark}
              title="일 / 월 / 연도 추이"
              right={<Toggle value={granularity} onChange={setGranularity} />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slate300} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: C.slate700 }}
                    tickLine={false}
                    axisLine={{ stroke: C.slate300 }}
                  />
                  <YAxis
                    tick={{ fill: C.slate700 }}
                    tickFormatter={(n) => numberFmt(n as number)}
                    width={50}
                    axisLine={{ stroke: C.slate300 }}
                  />
                  <Tooltip
                    formatter={(v: number) => numberFmt(v)}
                    cursor={{ stroke: C.slate300 }}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={C.blue}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* 2) Bar: 시간대 */}
            <Card isDark={isDark} title="시간대 분포">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slate300} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: C.slate700 }}
                    tickLine={false}
                    axisLine={{ stroke: C.slate300 }}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: C.slate700 }}
                    tickFormatter={(n) => numberFmt(n as number)}
                    width={50}
                    axisLine={{ stroke: C.slate300 }}
                  />
                  <Tooltip formatter={(v: number) => numberFmt(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={C.violet} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 3) Bar: 채널 */}
            <Card isDark={isDark} title="채널별 유입">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={C.slate300} />
                  <XAxis
                    type="number"
                    tick={{ fill: C.slate700 }}
                    tickFormatter={(n) => numberFmt(n as number)}
                    axisLine={{ stroke: C.slate300 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="channel"
                    width={110}
                    tick={{ fill: C.slate700 }}
                    tickLine={false}
                    axisLine={{ stroke: C.slate300 }}
                  />
                  <Tooltip formatter={(v: number) => numberFmt(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={C.emerald} radius={10} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 4) Pie: 기기 */}
            <Card isDark={isDark} title="기기별 비율">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: C.text }} />
                  <Tooltip formatter={(v: number) => `${v}`} contentStyle={tooltipStyle} />
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={110}
                    strokeWidth={4}
                    label={(e) => `${e.name} ${e.value}`}
                    labelLine={false}
                  >
                    {deviceData.map((_, idx) => {
                      const fills = [C.indigo, C.emerald, C.amber, C.cyan, C.violet];
                      return <Cell key={idx} fill={fills[idx % fills.length]} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
