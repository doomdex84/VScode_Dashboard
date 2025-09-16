// src/features/link/LinkList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { listLinks as listLocal, removeLinkLocal } from "./api.local";
import { removeLink as removeServer, toShortUrl, toQrUrl } from "./api.server";
import type { LinkItem } from "./types";
import { QRCodeCanvas } from "qrcode.react";

/* ▼▼ 추가: recharts */
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie
} from "recharts";
/* ▲▲ 추가 */

type LinkItemWithShort = LinkItem & { shortUrlCalc: string };

function fmt(dt: string | number) {
  const d = typeof dt === "number" ? new Date(dt) : new Date(dt);
  if (isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

/* ▼▼ 추가: 로그(클릭) 타입 가정 — 백엔드/프론트에서 주입 가능 */
type ClickLog = {
  ts: number | string;                 // 클릭 시각
  source?: "qr" | "link";              // 유입 경로
  device?: "mobile" | "desktop" | "tablet";
  os?: string;                         // iOS/Android/Windows/macOS …
  browser?: string;                    // Chrome/Safari/Edge …
  referrer?: string;                   // instagram.com, naver.com …
};
/* ▲▲ 추가 */

export default function LinkList() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<LinkItemWithShort[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // ▼▼ Analytics states
  const [granularity, setGranularity] =
    useState<"hour" | "weekday" | "month">("hour");
  const [whichPie, setWhichPie] =
    useState<"device" | "os" | "browser">("device");

  const [timeDist, setTimeDist] = useState<{ name: string; count: number }[]>(
    []
  );
  const [qrVsLink, setQrVsLink] =
    useState<{ name: string; value: number }[]>([]);
  const [pieData, setPieData] =
    useState<{ name: string; value: number }[]>([]);
  const [referrerTop, setReferrerTop] =
    useState<{ name: string; count: number }[]>([]);
  // ▲▲ Analytics states

  // 짧은 링크(r/{slug}) 계산
  function computeShort(it: any): string {
    if (typeof it.shortUrl === "string" && it.shortUrl.length > 0) return it.shortUrl;
    if (typeof it.slug === "string" && it.slug.length > 0) return toShortUrl(it.slug);
    if (typeof it.originalUrl === "string" && it.originalUrl.length > 0) return it.originalUrl;
    return "";
  }

  // QR 링크(q/{slug}?m=poster&loc=entrance) 계산
  function computeQr(it: any): string {
    if (typeof it.slug === "string" && it.slug.length > 0) {
      return toQrUrl(it.slug, { m: "poster", loc: "entrance" });
    }
    if (typeof it.originalUrl === "string" && it.originalUrl.length > 0) return it.originalUrl;
    return "";
  }

  function reload() {
    const data = listLocal();
    const sorted = [...data].sort((a, b) => {
      const ta = new Date(a.createdAt as any).getTime();
      const tb = new Date(b.createdAt as any).getTime();
      return (tb || 0) - (ta || 0);
    });
    setItems(sorted.map((it) => ({ ...it, shortUrlCalc: computeShort(it) })));
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const k = q.toLowerCase();
    return items.filter(
      (it) =>
        (it.originalUrl ?? "").toLowerCase().includes(k) ||
        (it.shortUrlCalc ?? "").toLowerCase().includes(k) ||
        (it.slug ?? "").toLowerCase().includes(k)
    );
  }, [q, items]);

  async function onDelete(id: number) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    try { await removeServer(id as any); } catch (_) {} finally { removeLinkLocal(id); }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 1200);
    });
  }

  /* ▼▼ Analytics helpers */
  function asDate(ts: number | string) {
    const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
    }

  function buildTimeDist(logs: ClickLog[], g: "hour" | "weekday" | "month") {
    const map = new Map<string, number>();
    const push = (k: string) => map.set(k, (map.get(k) || 0) + 1);
    logs.forEach((l) => {
      const d = asDate(l.ts);
      if (g === "hour") push(String(d.getHours()).padStart(2, "0"));         // 00~23
      if (g === "weekday") push(["일","월","화","수","목","금","토"][d.getDay()]);
      if (g === "month") push(`${d.getMonth()+1}월`);
    });
    // 보조: 값이 없을 때도 축 보장
    if (g === "hour") for (let h=0; h<24; h++) if (!map.has(String(h).padStart(2,"0"))) map.set(String(h).padStart(2,"0"), 0);
    if (g === "weekday") ["일","월","화","수","목","금","토"].forEach(k=>{ if(!map.has(k)) map.set(k,0); });
    if (g === "month") for (let m=1; m<=12; m++) { const k=`${m}월`; if(!map.has(k)) map.set(k,0); }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }

  function countBy<T extends string>(logs: ClickLog[], key: (l: ClickLog) => T | undefined) {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      const k = key(l);
      if (!k) return;
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  function topN(arr: { name: string; count?: number; value?: number }[], n=8) {
    return [...arr]
      .map(x => ({ name: x.name, count: (x.count ?? x.value ?? 0) as number }))
      .sort((a,b)=> (b.count - a.count))
      .slice(0, n);
  }

  function loadAnalytics(currentItems: LinkItemWithShort[]) {
    // 1) 우선 순위: 전역(또는 상위 컴포넌트)에서 주입한 클릭 로그 사용
    //    window.__linkLogs = [{ ts, source, device, os, browser, referrer }, ...]
    const injected = (typeof window !== "undefined"
      ? (window as any).__linkLogs as ClickLog[] | undefined
      : undefined);

    let logs: ClickLog[] = Array.isArray(injected) ? injected : [];

    // 2) 폴백: 클릭 로그가 없다면, 생성 시각으로 '시간 분포'만 구성(데모)
    if (logs.length === 0) {
      logs = currentItems.map((it) => ({ ts: it.createdAt, source: "link" }));
    }

    // 시간대/요일/월별
    setTimeDist(buildTimeDist(logs, granularity));

    // QR vs 링크 유입
    const ql = countBy(logs, (l) => (l.source === "qr" ? "QR" : "링크"));
    if (ql.length === 1) { // 하나만 있으면 나머지 0 채움
      const other = ql[0].name === "QR" ? { name: "링크", value: 0 } : { name: "QR", value: 0 };
      setQrVsLink([ql[0], other]);
    } else {
      setQrVsLink(ql);
    }

    // 디바이스/OS/브라우저 (토글)
    const pick = whichPie === "device"
      ? countBy(logs, (l) => (l.device ?? "unknown"))
      : whichPie === "os"
      ? countBy(logs, (l) => (l.os ?? "unknown"))
      : countBy(logs, (l) => (l.browser ?? "unknown"));
    setPieData(pick.length ? pick : [{ name: "데이터 없음", value: 0 }]);

    // 리퍼러 TOP
    const ref = countBy(logs, (l) => (l.referrer ? String(l.referrer).replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0] : "direct"));
    setReferrerTop(topN(ref.map(x => ({ name: x.name, count: x.value })), 8));
  }
  /* ▲▲ Analytics helpers */

  // 로딩 & 반응
  useEffect(() => { loadAnalytics(items); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [items, granularity, whichPie]);

  return (
    <section
      aria-labelledby="link-list-title"
      className="max-w-6xl mx-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow rounded-2xl p-6 md:p-8 space-y-6"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 id="link-list-title" className="text-2xl font-bold">
          링크 목록
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색: URL, 슬러그, 단축링크…"
          className="w-full sm:w-80 px-3 py-2 rounded-lg border bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="링크 검색"
        />
      </div>

      {/* ▼▼ 2×2 분석 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1) 시간대/요일/월별 클릭 분포 — Bar */}
        <div className="rounded-xl border dark:border-gray-800 bg-base-100 p-4 h-72">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">시간대/요일/월별 클릭 분포</h3>
            <div className="join">
              <button className={`btn btn-xs join-item ${granularity==='hour'?'btn-primary':''}`} onClick={()=>setGranularity('hour')}>시간대</button>
              <button className={`btn btn-xs join-item ${granularity==='weekday'?'btn-primary':''}`} onClick={()=>setGranularity('weekday')}>요일</button>
              <button className={`btn btn-xs join-item ${granularity==='month'?'btn-primary':''}`} onClick={()=>setGranularity('month')}>월별</button>
            </div>
          </div>
          <div className="h-[calc(100%-2rem)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2) QR vs 링크 유입 — Pie */}
        <div className="rounded-xl border dark:border-gray-800 bg-base-100 p-4 h-72">
          <h3 className="font-semibold mb-2">QR vs 링크 유입</h3>
          <div className="h-[calc(100%-2rem)]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Legend />
                <Tooltip />
                <Pie data={qrVsLink} dataKey="value" nameKey="name" outerRadius="80%" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3) 디바이스/OS/브라우저 점유율 — Pie(토글) */}
        <div className="rounded-xl border dark:border-gray-800 bg-base-100 p-4 h-72">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">디바이스/OS/브라우저 점유율</h3>
            <div className="join">
              <button className={`btn btn-xs join-item ${whichPie==='device'?'btn-primary':''}`} onClick={()=>setWhichPie('device')}>디바이스</button>
              <button className={`btn btn-xs join-item ${whichPie==='os'?'btn-primary':''}`} onClick={()=>setWhichPie('os')}>OS</button>
              <button className={`btn btn-xs join-item ${whichPie==='browser'?'btn-primary':''}`} onClick={()=>setWhichPie('browser')}>브라우저</button>
            </div>
          </div>
          <div className="h-[calc(100%-2rem)]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Legend />
                <Tooltip />
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius="80%" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4) 리퍼러별 순위 — Bar */}
        <div className="rounded-xl border dark:border-gray-800 bg-base-100 p-4 h-72">
          <h3 className="font-semibold mb-2">리퍼러 TOP</h3>
          <div className="h-[calc(100%-2rem)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referrerTop}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* ▲▲ 2×2 분석 그리드 */}

      <div className="text-sm text-gray-500 dark:text-gray-400">
        총 <span className="font-semibold">{items.length}</span> 건
      </div>

      <div className="divide-y dark:divide-gray-800">
        {filtered.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 py-8">조건에 맞는 링크가 없습니다.</p>
        )}
        {filtered.map((it) => {
          const short = it.shortUrlCalc;
          const qrLink = computeQr(it);
          return (
            <div key={it.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {short ? (
                    <a href={short} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                      {short}
                    </a>
                  ) : (
                    <span className="text-gray-400">/r/슬러그 없음</span>
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 break-all">{it.originalUrl}</p>
                <p className="text-xs text-gray-400">
                  {it.slug ? `slug: ${it.slug} • ` : ""}
                  생성: {fmt(it.createdAt)}
                  {it.expirationDate ? ` • 만료: ${fmt(it.expirationDate)}` : ""}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  className="px-3 py-2 rounded border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => copy(short || it.originalUrl)}
                  disabled={!short && !it.originalUrl}
                  title="복사"
                >
                  {copied === (short || it.originalUrl) ? "복사됨" : "복사"}
                </button>

                <button
                  className="px-3 py-2 rounded border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setQr(qrLink)}
                  disabled={!qrLink}
                >
                  QR
                </button>

                <button
                  className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={() => onDelete(it.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR 모달 */}
      {qr && (
        <div
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setQr(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 break-all text-sm text-gray-700 dark:text-gray-300">{qr}</p>
            <div className="flex justify-center">
              <QRCodeCanvas id="qr-modal-canvas" value={qr} size={220} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded border dark:border-gray-700"
                onClick={() => {
                  const canvas =
                    document.querySelector<HTMLCanvasElement>("#qr-modal-canvas") ||
                    document.querySelector<HTMLCanvasElement>("canvas");
                  if (!canvas) return;
                  const a = document.createElement("a");
                  a.href = canvas.toDataURL("image/png");
                  a.download = "qr.png";
                  a.click();
                }}
              >
                다운로드
              </button>
              <button className="px-3 py-2 rounded border dark:border-gray-700" onClick={() => setQr(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
