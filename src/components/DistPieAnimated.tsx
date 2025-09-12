// src/components/DistPieAnimated.tsx
import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export type DistPoint = { name: string; count: number };

// 색상 팔레트 (원하는 색으로 바꿔도 OK)
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a4de6c", "#8dd1e1", "#83a6ed", "#d0ed57"];

/** count <= 0 제거 + undefined 안전 처리 */
export function filterData(data: DistPoint[] | undefined) {
  return (Array.isArray(data) ? data : []).filter((d) => (d?.count ?? 0) > 0);
}

export default function DistPieAnimated({
  data,
  label = "분포",
  cycleMs = 1600,
  donut = true,
}: {
  data?: DistPoint[];
  label?: string;
  cycleMs?: number;
  donut?: boolean;
}) {
  const filtered = useMemo(() => filterData(data), [data]);
  const [active, setActive] = useState<number | null>(null);

  // 데이터가 변할 때 active 인덱스 안전 보정
  useEffect(() => {
    if (!filtered.length) {
      setActive(null);
      return;
    }
    if (active == null || active >= filtered.length) {
      setActive(0);
    }
  }, [filtered, active]);

  // 자동 순환 (마우스 올리면 hover 이벤트가 우선 적용됨)
  useEffect(() => {
    if (!filtered.length) return;
    const id = setInterval(() => {
      setActive((prev) => (prev == null ? 0 : (prev + 1) % filtered.length));
    }, cycleMs);
    return () => clearInterval(id);
  }, [filtered.length, cycleMs]);

  const total = useMemo(() => filtered.reduce((a, b) => a + (b?.count ?? 0), 0), [filtered]);
  const activeDatum = active != null ? filtered[active] : undefined;

  const outer = donut ? 90 : 110;
  const inner = donut ? 55 : 0;

  return (
    <div
      className="grid grid-cols-1 items-center gap-3 md:grid-cols-5"
      onMouseLeave={() => setActive((v) => v)} // 마우스 떠나도 자동 순환이 계속 돌아감
    >
      {/* 차트 */}
      <div className="h-64 md:col-span-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={(v: any, n: any) => [v, n]} />
            <Legend />

            {/* 기본 Pie (전체 조각) */}
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="name"
              outerRadius={outer}
              innerRadius={inner}
              paddingAngle={2}
              isAnimationActive
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive((v) => v)}
            >
              {filtered.map((e, i) => (
                <Cell key={e.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            {/* 강조용 Pie: 활성 조각만 하나 더 그려 외곽 반지를 +6 */}
            {activeDatum ? (
              <Pie
                data={[activeDatum]}
                dataKey="count"
                nameKey="name"
                outerRadius={outer + 6}
                innerRadius={Math.max(0, inner + 6)}
                isAnimationActive={false}
              >
                <Cell fill={COLORS[(active ?? 0) % COLORS.length]} />
              </Pie>
            ) : null}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 우측 요약 */}
      <div className="md:col-span-2">
        <div className="text-sm text-gray-500">총 {label}</div>
        <div className="mb-2 text-2xl font-bold">
          {total.toLocaleString()} <span className="text-sm font-normal text-gray-500">건</span>
        </div>
        <ul className="max-h-40 space-y-1 overflow-auto pr-1 text-sm">
          {filtered.map((d, i) => (
            <li
              key={d.name}
              className={`flex justify-between rounded border px-2 py-1 ${active === i ? "bg-gray-50" : ""}`}
              onMouseEnter={() => setActive(i)}
            >
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium">{d.name}</span>
              </span>
              <span>{d.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
