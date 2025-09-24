// src/components/AnalyticsDashboard.tsx
import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, Rectangle,
} from "recharts";

import {
  getTimeDistribution,
  getChannels,
  getLinkLogs,
  type TimeGranularity,
  type TimeBucket,
  type KV,
  type LogItem,
} from "../api/links";

/**
 * - 막대 얇게: maxBarSize + barCategoryGap
 * - hover 음영 얇게: Tooltip cursor에 얇은 Rectangle 커서 사용
 */

type Granularity = "day" | "month" | "year";
type Point = { label: string; value: number };
type AnalyticsProps = { embed?: boolean; slug?: string; isDark?: boolean; setIsDark?: React.Dispatch<React.SetStateAction<boolean>> };

// 로고색 한 곳만 바꾸면 전체가 따라옵니다
const PRIMARY = "#3B82F6";

const LIGHT = {
  accentLine: PRIMARY,
  barHour:    "#7c4dff",
  barChannel: "#10b981",
  deviceBlue: "#3b82f6",
  deviceGreen:"#10b981",
  deviceOrange:"#f59e0b",
  deviceViolet:"#a78bfa",
  grid:   "#e5e7eb",
  axis:   "#475569",
  text:   "#0f172a",
  page:   "#f8fafc",
  panel:  "#ffffff",
  border: "#e5e7eb",
};
const DARK = {
  accentLine: "#60a5fa",
  barHour:    "#a78bfa",
  barChannel: "#34d399",
  deviceBlue: "#60a5fa",
  deviceGreen:"#34d399",
  deviceOrange:"#fbbf24",
  deviceViolet:"#c4b5fd",
  grid:   "#1f2937",
  axis:   "#e2e8f0",
  text:   "#e6edf7",
  page:   "#0b1220",
  panel:  "#141f2f",
  border: "#2a3b55",
};

const WINDOW = { day: 7, month: 12, year: 5, hourStep: 3 };

// ───────────────────── 커서(hover 띠) — 얇게 렌더링 ────────────────────────
type CursorProps = any;

/** 세로 막대(시간대 차트)용: 폭을 barWidth로 제한해서 가운데 정렬 */
const NarrowXCursor: React.FC<CursorProps> = (p) => {
  const { x = 0, y = 0, width = 0, height = 0, fill = "#000", opacity = 0.08, radius = 2, barWidth = 16 } = p || {};
  const w = Math.min(barWidth, width);
  const cx = x + (width - w) / 2;
  return <Rectangle x={cx} y={y} width={w} height={height} fill={fill} opacity={opacity} radius={radius} />;
};

/** 가로 막대(채널 차트, layout="vertical")용: 높이를 barHeight로 제한 */
const NarrowYCursor: React.FC<CursorProps> = (p) => {
  const { x = 0, y = 0, width = 0, height = 0, fill = "#000", opacity = 0.08, radius = 2, barHeight = 14 } = p || {};
  const h = Math.min(barHeight, height);
  const cy = y + (height - h) / 2;
  return <Rectangle x={x} y={cy} width={width} height={h} fill={fill} opacity={opacity} radius={radius} />;
};

// ────────────────────────────────────────────────────────────────────────────
const Card: React.FC<{
  title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; isDark?: boolean;
}> = ({ title, subtitle, right, children, isDark = false }) => {
  const C = isDark ? DARK : LIGHT;
  return (
    <div
      className="p-4 flex flex-col w-full"
      style={{
        height: 360, width: "100%", minWidth: 0, borderRadius: 12,
        background: C.panel, border: `1px solid ${C.border}`,
        boxShadow: isDark
          ? "0 6px 14px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)"
          : "0 8px 24px rgba(2,6,23,0.06), 0 1px 3px rgba(2,6,23,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[15px] font-semibold leading-tight" style={{ color: C.text }}>{title}</h3>
          {subtitle && <div className="text-[12px] mt-1" style={{ color: isDark ? "#9aa4b2" : "#64748b" }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
};

// slug 감지
function useEffectiveSlug(propSlug?: string): string | null {
  const read = () => {
    if (propSlug) return propSlug;
    const sp = new URLSearchParams(window.location.search);
    const fromQuery = sp.get("slug"); if (fromQuery) return fromQuery;
    const m1 = window.location.pathname.match(/\/(?:analytics|links|stats)\/([^\/?#]+)/);
    if (m1?.[1]) return m1[1];
    const m2 = window.location.hash.match(/[?&]slug=([^&]+)/);
    if (m2?.[1]) return decodeURIComponent(m2[1]);
    return null;
  };
  const [slug, setSlug] = useState<string | null>(() => read());
  useEffect(() => {
    const update = () => setSlug(read());
    const emit = () => window.dispatchEvent(new Event("router-change"));
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = ((d, u, url) => { origPush(d, u, url ?? null); emit(); }) as History["pushState"];
    history.replaceState = ((d, u, url) => { origReplace(d, u, url ?? null); emit(); }) as History["replaceState"];
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    window.addEventListener("router-change", update);
    update();
    return () => {
      history.pushState = origPush as History["pushState"];
      history.replaceState = origReplace as History["replaceState"];
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
      window.removeEventListener("router-change", update);
    };
  }, [propSlug]);
  return slug;
}

// 유틸
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtYM  = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
function rangeLastNDays(n: number){const a:string[]=[];const t=new Date();for(let i=n-1;i>=0;i--){const d=new Date(t);d.setDate(d.getDate()-i);a.push(fmtYMD(d));}return a;}
function rangeLastNMonths(n: number){const a:string[]=[];const b=new Date();b.setDate(1);for(let i=n-1;i>=0;i--){const d=new Date(b);d.setMonth(d.getMonth()-i);a.push(fmtYM(d));}return a;}
function rangeLastNYears(n:number){const y=new Date().getFullYear();return Array.from({length:n},(_,i)=>String(y-(n-1-i))); }
function normalizeMonthBucket(s:string|number){const str=String(s);if(/^\d{4}-\d{2}/.test(str))return str.slice(0,7);if(/^\d{6}$/.test(str))return `${str.slice(0,4)}-${str.slice(4,6)}`;return str;}
function toApiGran(_:Granularity):TimeGranularity{return "month";}
function extractHost(url:string){try{return new URL(url).host;}catch{return url;}}
function numberFmt(n:number){return new Intl.NumberFormat().format(n);}
function aggregateChannelsFromLogs(logs:Array<{channel?:string|null;referrer?:string|null}>){
  const map=new Map<string,number>();
  for(const l of logs){
    let key=(l.channel&&l.channel.trim())||(l.referrer&&extractHost(l.referrer))||"Direct";
    key=key||"Direct"; map.set(key,(map.get(key)||0)+1);
  }
  return Array.from(map,([channel,value])=>({channel,value})).sort((a,b)=>b.value-a.value).slice(0,8);
}
function aggregateDevicesFromLogs(logs:Array<{deviceType?:string|null}>){
  const map=new Map<string,number>();
  for(const l of logs){const key=(l.deviceType&&l.deviceType.trim())||"Others";map.set(key,(map.get(key)||0)+1);}
  return Array.from(map,([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
}
function colorByDevice(name:string,pal:typeof LIGHT|typeof DARK){
  const n=name.toLowerCase();
  if(n.includes("desktop")||n.includes("pc")) return pal.deviceGreen;
  if(n.includes("mobile")||n.includes("phone")) return pal.deviceBlue;
  if(n.includes("tablet")||n.includes("pad"))  return pal.deviceOrange;
  return pal.deviceViolet;
}

// 본문
const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ embed=false, slug, isDark:isDarkFromParent, setIsDark:setIsDarkFromParent }) => {
  const [localDark, setLocalDark] = useState(false);
  const isDark = isDarkFromParent ?? localDark;
  const setIsDark = setIsDarkFromParent ?? setLocalDark;

  const effectiveSlug = useEffectiveSlug(slug);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [error, setError] = useState<string | null>(null);

  const [lineData, setLineData] = useState<Point[]>([]);
  const [hourData, setHourData] = useState<Point[]>([]);
  const [channelData, setChannelData] = useState<{ channel: string; value: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);

  const C = isDark ? DARK : LIGHT;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!effectiveSlug) {
          setError("링크를 생성하세요");
          setLineData([]); setHourData([]); setChannelData([]); setDeviceData([]); return;
        }
        setError(null);

        let logs: LogItem[] = [];
        try { logs = await getLinkLogs(effectiveSlug); } catch { logs = []; }

        // 1) 라인
        let linePoints: Point[] = [];
        if (granularity === "day") {
          const labels = rangeLastNDays(WINDOW.day);
          const map = new Map<string, number>();
          for (const l of logs) {
            const d = new Date(l.clickedAt); if (isNaN(d.getTime())) continue;
            const key = fmtYMD(d); map.set(key, (map.get(key) || 0) + 1);
          }
          linePoints = labels.map((label) => ({ label, value: map.get(label) || 0 }));
        } else {
          const monthBuckets: TimeBucket[] = await getTimeDistribution(effectiveSlug, toApiGran(granularity));
          const monthMap = new Map<string, number>();
          for (const b of monthBuckets) {
            const key = normalizeMonthBucket(b.bucket);
            monthMap.set(key, (monthMap.get(key) || 0) + b.cnt);
          }
          if (granularity === "month") {
            const labels = rangeLastNMonths(WINDOW.month);
            linePoints = labels.map((label) => ({ label, value: monthMap.get(label) || 0 }));
          } else {
            const yMap = new Map<string, number>();
            for (const [ym, cnt] of monthMap) {
              const y = ym.slice(0, 4);
              yMap.set(y, (yMap.get(y) || 0) + cnt);
            }
            const labels = rangeLastNYears(WINDOW.year);
            linePoints = labels.map((label) => ({ label, value: yMap.get(label) || 0 }));
          }
        }

        // 2) 시간대(3시간 bin)
        let hourCounts = new Array(24).fill(0);
        try {
          const hourBuckets: TimeBucket[] = await getTimeDistribution(effectiveSlug, "hour");
          for (const b of hourBuckets) {
            const h = Number(String(b.bucket).padStart(2, "0").slice(0, 2));
            if (!isNaN(h) && h >= 0 && h < 24) hourCounts[h] = b.cnt;
          }
        } catch {
          for (const l of logs) {
            const d = new Date(l.clickedAt);
            if (!isNaN(d.getTime())) hourCounts[d.getHours()]++;
          }
        }
        const step = WINDOW.hourStep;
        const hourPoints: Point[] = [];
        for (let h = 0; h < 24; h += step) {
          const sum = hourCounts.slice(h, h + step).reduce((a, b) => a + b, 0);
          hourPoints.push({ label: `${pad2(h)}:00`, value: sum });
        }

        // 3) 채널
        let channels: { channel: string; value: number }[] = [];
        try {
          const apiChannels: KV[] = await getChannels(effectiveSlug);
          channels = apiChannels.map((c) => ({ channel: c.key, value: c.cnt }));
        } catch { channels = aggregateChannelsFromLogs(logs); }

        // 4) 디바이스
        const devices = aggregateDevicesFromLogs(logs);

        if (!alive) return;
        setLineData(linePoints); setHourData(hourPoints);
        setChannelData(channels); setDeviceData(devices);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "데이터 로딩 실패");
      }
    })();
    return () => { alive = false; };
  }, [granularity, effectiveSlug]);

  const tooltipStyle: React.CSSProperties = {
    background: C.panel, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8,
  };
  const legendStyle: React.CSSProperties = { color: C.text };
  const gridClass = embed ? "grid grid-cols-2 gap-6" : "grid grid-cols-1 sm:grid-cols-2 gap-6";

  return (
    <div className={isDark ? "dark" : ""} id="stats-top">
      <div className={embed ? "" : "min-h-[100vh] w-full"} style={{ background: embed ? "transparent" : C.page }}>
        <div className={embed ? "" : "w-full max-w-none mx-auto p-4 md:p-6"}>
          {!embed && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: C.text }}>통계</h2>
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

          {!effectiveSlug ? null : (
            <div className={gridClass}>
              {/* 1) 라인 */}
              <Card isDark={isDark} title="일 / 월 / 연도 추이" subtitle="기간별 클릭 추이" right={
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
              }>
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

              {/* 2) 시간대 분포 — 얇은 막대 + 얇은 커서 */}
              <Card isDark={isDark} title="시간대 분포 (3시간 단위)">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hourData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barCategoryGap="60%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                    <XAxis dataKey="label" tick={{ fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} />
                    <YAxis tick={{ fill: C.axis }} tickLine={false} width={46} axisLine={{ stroke: C.grid }} />
                    <Tooltip
                      formatter={(v: number) => numberFmt(v)}
                      contentStyle={tooltipStyle}
                      cursor={
                        <NarrowXCursor
                          fill={isDark ? "#e2e8f0" : "#111827"}
                          opacity={0.10}
                          barWidth={18}   // ← 커서 폭(막대에 살짝 여유)
                          radius={2}
                        />
                      }
                    />
                    <Bar dataKey="value" fill={C.barHour} radius={[4, 4, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 3) 채널별 유입 — 얇은 막대 + 얇은 커서 */}
              <Card isDark={isDark} title="채널별 유입">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={channelData} layout="vertical" margin={{ top: 6, right: 16, left: 0, bottom: 6 }} barCategoryGap={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: C.axis }} axisLine={{ stroke: C.grid }} tickLine={false} />
                    <YAxis type="category" dataKey="channel" width={110} tick={{ fill: C.axis }} axisLine={{ stroke: C.grid }} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => numberFmt(v)}
                      contentStyle={tooltipStyle}
                      cursor={
                        <NarrowYCursor
                          fill={isDark ? "#e2e8f0" : "#111827"}
                          opacity={0.10}
                          barHeight={16} // ← 커서 높이
                          radius={2}
                        />
                      }
                    />
                    <Bar dataKey="value" fill={C.barChannel} radius={[0, 6, 6, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 4) 기기별 비율 */}
              <Card isDark={isDark} title="기기별 비율">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Legend wrapperStyle={{ color: C.text }} />
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
                        <Cell key={idx} fill={colorByDevice(d.name, isDark ? DARK : LIGHT)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
