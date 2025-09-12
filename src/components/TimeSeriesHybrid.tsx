import { useMemo, useState } from "react";
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, BarChart, Bar, LabelList
} from "recharts";
import { format, parseISO, isValid as isValidDate } from "date-fns";

export type DailyPoint = { date: string; clicks: number; uidCount?: number };

function aggregate(daily: DailyPoint[] | undefined, granularity: "day" | "month" | "year") {
  const safe = Array.isArray(daily) ? daily : [];
  if (granularity === "day") return safe.map(d => ({ label: d.date, clicks: d.clicks ?? 0 }));
  const map = new Map<string, { clicks: number }>();
  for (const d of safe) {
    let key = d.date;
    try {
      const parsed = parseISO(d.date);
      key = granularity === "month"
        ? (isValidDate(parsed) ? format(parsed, "yyyy-MM") : d.date.slice(0, 7))
        : (isValidDate(parsed) ? format(parsed, "yyyy") : d.date.slice(0, 4));
    } catch {}
    const prev = map.get(key) || { clicks: 0 };
    map.set(key, { clicks: prev.clicks + (d.clicks ?? 0) });
  }
  return Array.from(map.entries())
    .sort(([a],[b]) => a > b ? 1 : a < b ? -1 : 0)
    .map(([label, v]) => ({ label, ...v }));
}

export default function TimeSeriesHybrid({ daily }: { daily?: DailyPoint[] }) {
  const [tab, setTab] = useState<"day"|"month"|"year">("day");
  const data = useMemo(() => aggregate(daily, tab), [daily, tab]);
  const total = useMemo(() => data.reduce((a,b)=>a+(b.clicks||0),0), [data]);

  const tick = (v: string) => {
    if (tab==="day") {
      try { const d = parseISO(v); return isValidDate(d) ? format(d,"MM/dd") : v; } catch { return v; }
    }
    return v;
  };

  return (
    <div>
      {/* 토글 */}
      <div className="mb-2 inline-flex overflow-hidden rounded-xl border">
        {(["day","month","year"] as const).map(g => (
          <button
            key={g}
            onClick={()=>setTab(g)}
            className={`px-3 py-1.5 text-sm ${tab===g ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-100"}`}
            aria-pressed={tab===g}
          >
            {g==="day" ? "일별" : g==="month" ? "월별" : "연도별"}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mb-2">합계: {total.toLocaleString()}</div>

      {/* 차트 */}
      <div className="h-72">
        {tab==="day" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tickFormatter={tick} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v:any)=>[v,"클릭 수"]} labelFormatter={(l:string)=>l} />
              <Legend />
              <Line type="monotone" dataKey="clicks" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v:any)=>[v,"클릭 수"]} />
              <Legend />
              <Bar dataKey="clicks">
                <LabelList dataKey="clicks" position="top" formatter={(v:any)=>v.toLocaleString()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!data.length && (
        <p className="mt-2 text-xs text-gray-500">표시할 데이터가 없습니다. 기간/링크를 조정하세요.</p>
      )}
    </div>
  );
}
