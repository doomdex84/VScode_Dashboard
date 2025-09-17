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
 * AnalyticsDashboard
 * - 상단 헤더: 다크/라이트 토글만
 * - 일/월/연도 추이: 카드 내부 셀렉트 (day/month/year)
 * - 범위 고정 & 패딩:
 *    day  -> 최근 7일 (빈 날 0 채움)
 *    month-> 최근 12개월 (빈 달 0 채움)
 *    year -> 최근 5년 (빈 연 0 채움)
 * - 시간대 분포: 24시간을 3시간 bin(00,03,06,...,21)으로 집계
 */

// ▶ 톤 다운 팔레트
const LIGHT = {
  accentLine: "#0ea5e9",   // sky-500
  barHour:    "#8b5cf6",   // violet-500
  barChannel: "#10b981",   // emerald-500
  deviceBlue: "#38bdf8",   // sky-400
  deviceGreen:"#34d399",   // emerald-400
  deviceOrange:"#f59e0b",  // amber-500
  deviceViolet:"#a78bfa",  // violet-400

  grid:   "#e2e8f0",
  axis:   "#475569",
  text:   "#0f172a",
  page:   "#f8fafc",
  panel:  "#ffffff",
  border: "#e5e7eb",
};

const DARK = {
  accentLine: "#38bdf8",   // sky-400
  barHour:    "#a78bfa",   // violet-400
  barChannel: "#34d399",   // emerald-400
  deviceBlue: "#7dd3fc",   // sky-300
  deviceGreen:"#6ee7b7",   // emerald-300
  deviceOrange:"#fbbf24",  // amber-400
  deviceViolet:"#c4b5fd",  // violet-300

  grid:   "#2a3b55",
  axis:   "#e2e8f0",
  text:   "#e6edf7",
  page:   "#0b1220",
  panel:  "#141f2f",
  border: "#2a3b55",
};

const WINDOW = {
  day: 7,
  month: 12,
  year: 5,
  hourStep: 3, // 3시간 bin
};

type Granularity = "day" | "month" | "year";
type Point = { label: string; value: number };
type AnalyticsProps = { embed?: boolean; slug?: string };

// 공통 카드
const Card: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  isDark?: boolean;
}> = ({ title, subtitle, right, children, isDark = false }) => {
  const C = isDark ? DARK : LIGHT;
  return (
    <div
      className="p-4 flex flex-col w-full"
      style={{
        height: 360,
        width: "100%",
        minWidth: 0,
        borderRadius: 16,
        background: C.panel,
        border: `1px solid ${C.border}`,
        boxShadow: "0 8px 24px rgba(2,6,23,0.06), 0 1px 3px rgba(2,6,23,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[15px] font-semibold leading-tight" style={{ color: C.text }}>
            {title}
          </h3>
          {subtitle && (
            <div className="text-[12px] mt-1" style={{ color: isDark ? "#9aa4b2" : "#64748b" }}>
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

// ── 날짜 유틸 (로컬 타임존 기준) ───────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtYM  = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

function rangeLastNDays(n: number): string[] {
  const arr: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push(fmtYMD(d));
  }
  return arr;
}
function rangeLastNMonths(n: number): string[] {
  const arr: string[] = [];
  const base = new Date();
  base.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    arr.push(fmtYM(d));
  }
  return arr;
}
function rangeLastNYears(n: number): string[] {
  const arr: string[] = [];
  const y = new Date().getFullYear();
  for (let i = n - 1; i >= 0; i--) arr.push(String(y - i));
  return arr;
}
function normalizeMonthBucket(s: string | number): string {
  const str = String(s);
  if (/^\d{4}-\d{2}/.test(str)) return str.slice(0, 7);
  if (/^\d{6}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}`;
  return str;
}

// 서버가 지원하는 month만 사용 (day는 logs로 대체)
function toApiGran(_: Granularity): TimeGranularity {
  return "month";
}

// 채널/디바이스 유틸
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
  if (n.includes("desktop") || n.includes("pc")) return pal.deviceGreen;
  if (n.includes("mobile") || n.includes("phone")) return pal.deviceBlue;
  if (n.includes("tablet") || n.includes("pad"))  return pal.deviceOrange;
  return pal.deviceViolet;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────
const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ embed = false, slug }) => {
  const [granularity, setGranularity] = useState<Granularity>("day");
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
        // 공통 logs (day/시간대 폴백/채널/디바이스에 활용)
        let logs: LogItem[] = [];
        try {
          logs = await getLinkLogs(effectiveSlug);
        } catch {
          logs = [];
        }

        // 1) 라인 시리즈 (범위 패딩)
        let linePoints: Point[] = [];
        if (granularity === "day") {
          // 최근 7일 레인지 생성
          const labels = rangeLastNDays(WINDOW.day);
          const map = new Map<string, number>();
          for (const l of logs) {
            const d = new Date(l.clickedAt);
            if (isNaN(d.getTime())) continue;
            const key = fmtYMD(d);
            map.set(key, (map.get(key) || 0) + 1);
          }
          linePoints = labels.map((label) => ({ label, value: map.get(label) || 0 }));
        } else {
          // 서버 month 집계 사용
          const monthBuckets: TimeBucket[] = await getTimeDistribution(
            effectiveSlug,
            toApiGran(granularity) // "month"
          );
          const monthMap = new Map<string, number>();
          for (const b of monthBuckets) {
            const key = normalizeMonthBucket(b.bucket);
            monthMap.set(key, (monthMap.get(key) || 0) + b.cnt);
          }

          if (granularity === "month") {
            const labels = rangeLastNMonths(WINDOW.month);
            linePoints = labels.map((label) => ({ label, value: monthMap.get(label) || 0 }));
          } else {
            // year: 월→연도 합산 + 최근 5년 패딩
            const yMap = new Map<string, number>();
            for (const [ym, cnt] of monthMap) {
              const y = ym.slice(0, 4);
              yMap.set(y, (yMap.get(y) || 0) + cnt);
            }
            const labels = rangeLastNYears(WINDOW.year);
            linePoints = labels.map((label) => ({ label, value: yMap.get(label) || 0 }));
          }
        }

        // 2) 시간대 분포 (3시간 bin)
        let hourCounts = new Array(24).fill(0);
        try {
          const hourBuckets: TimeBucket[] = await getTimeDistribution(effectiveSlug, "hour");
          for (const b of hourBuckets) {
            const h = Number(String(b.bucket).padStart(2, "0").slice(0, 2));
            if (!isNaN(h) && h >= 0 && h < 24) hourCounts[h] = b.cnt;
          }
        } catch {
          // 폴백: logs에서 시간대 집계
          for (const l of logs) {
            const d = new Date(l.clickedAt);
            if (!isNaN(d.getTime())) hourCounts[d.getHours()]++;
          }
        }
        // 3시간 bin으로 압축
        const step = WINDOW.hourStep;
        const hourPoints: Point[] = [];
        for (let h = 0; h < 24; h += step) {
          const sum = hourCounts.slice(h, h + step).reduce((a, b) => a + b, 0);
          hourPoints.push({ label: `${pad2(h)}:00`, value: sum });
        }

        // 3) 채널: API → 실패 시 logs 폴백
        let channels: { channel: string; value: number }[] = [];
        try {
          const apiChannels: KV[] = await getChannels(effectiveSlug);
          channels = apiChannels.map((c) => ({ channel: c.key, value: c.cnt }));
        } catch {
          channels = aggregateChannelsFromLogs(logs);
        }

        // 4) 디바이스
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
    background: C.panel,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 8,
  };
  const legendStyle: React.CSSProperties = { color: C.text };

  // 2×2 고정 그리드
  const gridClass = embed ? "grid grid-cols-2 gap-6" : "grid grid-cols-1 sm:grid-cols-2 gap-6";

  return (
    <div className={isDark ? "dark" : ""}>
      <div className={embed ? "" : "min-h-[100vh] w-full"} style={{ background: embed ? "transparent" : C.page }}>
        <div className={embed ? "" : "w-full max-w-none mx-auto p-4 md:p-6"}>
          {!embed && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: C.text }}>통계</h2>
              {/* 상단 우측: 다크/라이트 토글만 */}
              <button
                onClick={() => setIsDark((v) => !v)}
                className="h-9 px-3 rounded-md border"
                style={{ background: C.panel, color: C.text, borderColor: C.border }}
                title="Toggle dark mode"
              >
                {isDark ? "🌙 Dark" : "🌞 Light"}
              </button>
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
              subtitle="기간별 클릭 추이"
              right={
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as Granularity)}
                  className="h-8 px-2 rounded-md border text-sm"
                  style={{ background: C.panel, color: C.text, borderColor: C.border }}
                >
                  <option value="day">일별 (최근 7일)</option>
                  <option value="month">월별 (최근 12개월)</option>
                  <option value="year">연도별 (최근 5년)</option>
                </select>
              }
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="label" tick={{ fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} />
                  <YAxis tick={{ fill: C.axis }} tickLine={false} width={46} axisLine={{ stroke: C.grid }} />
                  <Tooltip formatter={(v: number) => numberFmt(v)} cursor={{ stroke: C.grid }} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="value" stroke={C.accentLine} strokeWidth={3} dot={{ r: 2.5 }} activeDot={{ r: 4.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* 2) 시간대 분포 (3시간 bin) */}
            <Card isDark={isDark} title="시간대 분포 (3시간 단위)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="label" tick={{ fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} />
                  <YAxis tick={{ fill: C.axis }} tickLine={false} width={46} axisLine={{ stroke: C.grid }} />
                  <Tooltip formatter={(v: number) => numberFmt(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={C.barHour} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 3) 채널별 유입 */}
            <Card isDark={isDark} title="채널별 유입">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={channelData} layout="vertical" margin={{ top: 6, right: 16, left: 0, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.axis }} axisLine={{ stroke: C.grid }} tickLine={false} />
                  <YAxis type="category" dataKey="channel" width={110} tick={{ fill: C.axis }} axisLine={{ stroke: C.grid }} tickLine={false} />
                  <Tooltip formatter={(v: number) => numberFmt(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={C.barChannel} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 4) 기기별 비율 */}
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
