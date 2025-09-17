import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";

import {
  getTimeDistribution,
  getChannels,
  getLinkLogs,
  type TimeGranularity, // "hour" | "dow" | "month"
  type TimeBucket,
  type KV,
  type LogItem,
} from "../api/links";

/**
 * AnalyticsDashboard (임베드 대응)
 * - 2×2 그리드 고정
 * - 색상/배치 스크린샷 스타일 반영
 */

// ▶ 색상 팔레트
const LIGHT = {
  blue:   "#2563eb",
  green:  "#10b981",
  orange: "#f59e0b",
  purple: "#7c3aed",
  slate200: "#e5e7eb",
  slate300: "#e2e8f0",
  slate700: "#334155",
  text:   "#0f172a",
  page:   "#f1f5f9",
  panel:  "#ffffff",
};

const DARK = {
  blue:   "#60a5fa",
  green:  "#34d399",
  orange: "#fbbf24",
  purple: "#a78bfa",
  slate200: "#334155",
  slate300: "#2a3b55",
  slate700: "#e2e8f0",
  text:   "#e6edf7",
  page:   "#0b1220",
  panel:  "#141f2f",
};

type Granularity = "month" | "year";
type Point = { label: string; value: number };
type AnalyticsProps = { embed?: boolean; slug?: string };

// 공통 카드 컴포넌트 (대문자!)
const Card: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  isDark?: boolean;
}> = ({ title, subtitle, right, children, isDark = false }) => {
  return (
    <div
      className="p-4 flex flex-col w-full"
      style={{
        height: 360,
        width: "100%",
        minWidth: 0,
        borderRadius: 16,
        background: isDark ? DARK.panel : LIGHT.panel,
        border: `1px solid ${isDark ? DARK.slate300 : LIGHT.slate300}`,
        boxShadow:
          "0 8px 24px rgba(2,6,23,0.06), 0 1px 3px rgba(2,6,23,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3
            className="text-[15px] font-semibold leading-tight"
            style={{ color: isDark ? DARK.text : LIGHT.text }}
          >
            {title}
          </h3>
          {subtitle && (
            <div
              className="text-[12px] mt-1"
              style={{ color: isDark ? "#a0aec0" : "#64748b" }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {right}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
};

// ── 유틸
function toApiGran(g: Granularity): TimeGranularity {
  // 백엔드는 hour|dow|month(소문자)만 지원 → 항상 month 요청
  return "month";
}
function extractHost(url: string) {
  try { return new URL(url).host; } catch { return url; }
}
function numberFmt(n: number) {
  return new Intl.NumberFormat().format(n);
}
function aggregateChannelsFromLogs(
  logs: Array<{ channel?: string | null; referrer?: string | null }>
) {
  const map = new Map<string, number>();
  for (const l of logs) {
    let key =
      (l.channel && l.channel.trim()) ||
      (l.referrer && extractHost(l.referrer)) ||
      "Direct";
    key = key || "Direct";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map, ([channel, value]) => ({ channel, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}
function aggregateDevicesFromLogs(logs: Array<{ deviceType?: string | null }>) {
  const map = new Map<string, number>();
  for (const l of logs) {
    const key = (l.deviceType && l.deviceType.trim()) || "Others";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value
  );
}
function colorByDevice(name: string, pal: typeof LIGHT | typeof DARK) {
  const n = name.toLowerCase();
  if (n.includes("desktop") || n.includes("pc")) return pal.green;
  if (n.includes("mobile") || n.includes("phone")) return pal.blue;
  if (n.includes("tablet") || n.includes("pad"))  return pal.orange;
  return pal.purple;
}

// ── 컴포넌트
const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ embed = false, slug }) => {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [isDark, setIsDark] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lineData, setLineData] = useState<Point[]>([]);
  const [hourData, setHourData] = useState<Point[]>([]);
  const [channelData, setChannelData] = useState<{ channel: string; value: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);

  const C = isDark ? DARK : LIGHT;

  // slug
  const slugFromQuery = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("slug") || "V8aNfV";
  }, []);
  const effectiveSlug = slug ?? slugFromQuery;

  // 데이터 로딩
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) 라인 시리즈: month로 가져오고, 연도는 프론트에서 합산
        const apiGran = toApiGran(granularity); // "month"
        const lineBuckets: TimeBucket[] = await getTimeDistribution(effectiveSlug, apiGran);

        let linePoints: Point[];
        if (granularity === "year") {
          const yearMap = new Map<string, number>();
          for (const b of lineBuckets) {
            const year = String(b.bucket).slice(0, 4);
            yearMap.set(year, (yearMap.get(year) || 0) + b.cnt);
          }
          linePoints = Array.from(yearMap, ([label, value]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label));
        } else {
          linePoints = lineBuckets.map((b) => ({ label: String(b.bucket), value: b.cnt }));
        }

        // 2) 시간대 분포: hour (소문자)
        const hourBuckets: TimeBucket[] = await getTimeDistribution(effectiveSlug, "hour");
        const hourPoints = hourBuckets.map((b) => ({
          label: String(b.bucket).padStart(2, "0") + ":00",
          value: b.cnt,
        }));

        // 3) 채널: API 실패 시 logs 폴백
        let channels: { channel: string; value: number }[] = [];
        try {
          const apiChannels: KV[] = await getChannels(effectiveSlug);
          channels = apiChannels.map((c) => ({ channel: c.key, value: c.cnt }));
        } catch {
          const logs: LogItem[] = await getLinkLogs(effectiveSlug);
          channels = aggregateChannelsFromLogs(logs);
        }

        // 4) 디바이스: logs 집계
        const logs: LogItem[] = await getLinkLogs(effectiveSlug);
        const devices = aggregateDevicesFromLogs(logs);

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
    return () => { alive = false; };
  }, [granularity, effectiveSlug]);

  const tooltipStyle: React.CSSProperties = {
    background: isDark ? DARK.panel : "#ffffff",
    border: `1px solid ${isDark ? DARK.slate300 : LIGHT.slate200}`,
    color: isDark ? DARK.text : LIGHT.text,
    borderRadius: 8,
  };
  const legendStyle: React.CSSProperties = { color: isDark ? DARK.text : LIGHT.text };

  // ★ 2×2 고정 그리드 (embed일 때는 항상 2열)
  const gridClass = embed ? "grid grid-cols-2 gap-6" : "grid grid-cols-1 sm:grid-cols-2 gap-6";

  return (
    <div className={isDark ? "dark" : ""}>
      <div
        className={embed ? "" : "min-h-[100vh] w-full"}
        style={{ background: embed ? "transparent" : C.page }}
      >
        <div className={embed ? "" : "w-full max-w-none mx-auto p-4 md:p-6"}>
          {!embed && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: C.text }}>
                  통계
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as Granularity)}
                  className="h-9 px-3 rounded-md border"
                  style={{
                    background: C.panel,
                    color: C.text,
                    borderColor: C.slate300,
                  }}
                >
                  <option value="month">월별</option>
                  <option value="year">연도별</option>
                </select>
                <button
                  onClick={() => setIsDark((v) => !v)}
                  className="h-9 px-3 rounded-md border"
                  style={{
                    background: C.panel,
                    color: C.text,
                    borderColor: C.slate300,
                  }}
                  title="Toggle dark mode"
                >
                  {isDark ? "🌙 Dark" : "🌞 Light"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              className="mb-4 rounded-md p-3 text-sm"
              style={{
                background: isDark ? "#261d1d" : "#FEF2F2",
                color: isDark ? "#fecaca" : "#991b1b",
                border: `1px solid ${isDark ? "#7f1d1d" : "#FCA5A5"}`,
              }}
            >
              {error}
            </div>
          )}

          <div className={gridClass}>
            {/* 1) 라인: 일/월/연도 추세 */}
            <Card
              isDark={isDark}
              title="일 / 월 / 연도 추이"
              subtitle="일월연도"
              right={
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as Granularity)}
                  className="h-8 px-2 rounded-md border text-sm"
                  style={{ background: C.panel, color: C.text, borderColor: C.slate300 }}
                >
                  <option value="month">월별</option>
                  <option value="year">연도별</option>
                </select>
              }
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slate300} />
                  <XAxis dataKey="label" tick={{ fill: C.slate700 }} tickLine={false} axisLine={{ stroke: C.slate300 }} />
                  <YAxis tick={{ fill: C.slate700 }} tickLine={false} width={46} axisLine={{ stroke: C.slate300 }} />
                  <Tooltip formatter={(v: number) => numberFmt(v)} cursor={{ stroke: C.slate300 }} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="value" stroke={C.blue} strokeWidth={3} dot={{ r: 2.5 }} activeDot={{ r: 4.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* 2) 시간대 분포: 보라색 막대 */}
            <Card isDark={isDark} title="시간대 분포">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slate300} />
                  <XAxis dataKey="label" tick={{ fill: C.slate700 }} tickLine={false} axisLine={{ stroke: C.slate300 }} />
                  <YAxis tick={{ fill: C.slate700 }} tickLine={false} width={46} axisLine={{ stroke: C.slate300 }} />
                  <Tooltip formatter={(v: number) => numberFmt(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={C.purple} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 3) 채널별 유입: 가로 막대(녹색) */}
            <Card isDark={isDark} title="채널별 유입">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={channelData}
                  layout="vertical"
                  margin={{ top: 6, right: 16, left: 0, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.slate300} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.slate700 }} axisLine={{ stroke: C.slate300 }} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="channel"
                    width={110}
                    tick={{ fill: C.slate700 }}
                    axisLine={{ stroke: C.slate300 }}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v: number) => numberFmt(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={C.green} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 4) 기기별 비율: 도넛 + 고정 색상 */}
            <Card isDark={isDark} title="기기별 비율">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Legend wrapperStyle={legendStyle} />
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    startAngle={90}
                    endAngle={450}
                    outerRadius={105}
                    innerRadius={55}
                    labelLine={false}
                    label={(p: any) => {
                      const name = (p?.name as string) ?? "";
                      const percent = typeof p?.percent === "number" ? p.percent : 0;
                      return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                  >
                    {deviceData.map((d, idx) => (
                      <Cell key={idx} fill={colorByDevice(d.name, C)} />
                    ))}
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
