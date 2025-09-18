// src/features/link/LinkList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { listLinks as listLocal, removeLinkLocal } from "./api.local";
import { removeLink as removeServer, toShortUrl, toQrUrl } from "./api.server";
import type { LinkItem } from "./types";
import { QRCodeCanvas } from "qrcode.react";

type LinkItemWithShort = LinkItem & { shortUrlCalc: string };

function fmt(dt: string | number) {
  const d = typeof dt === "number" ? new Date(dt) : new Date(dt);
  if (isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

export default function LinkList() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<LinkItemWithShort[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 짧은 링크(r/{slug}) 계산
  function computeShort(it: any): string {
    if (typeof it.shortUrl === "string" && it.shortUrl.length > 0) return it.shortUrl;
    if (typeof it.slug === "string" && it.slug.length > 0) return toShortUrl(it.slug);
    // slug/shortUrl 없으면 원문으로 폴백
    if (typeof it.originalUrl === "string" && it.originalUrl.length > 0) return it.originalUrl;
    return "";
  }

  // QR 링크(q/{slug}?m=poster&loc=entrance) 계산
  function computeQr(it: any): string {
    if (typeof it.slug === "string" && it.slug.length > 0) {
      return toQrUrl(it.slug, { m: "poster", loc: "entrance" });
    }
    // slug 없으면 QR도 원문으로 폴백
    if (typeof it.originalUrl === "string" && it.originalUrl.length > 0) return it.originalUrl;
    return "";
  }

  function reload() {
    const data = listLocal();
    // 최신순 정렬
    const sorted = [...data].sort((a, b) => {
      const ta = new Date(a.createdAt as any).getTime();
      const tb = new Date(b.createdAt as any).getTime();
      return (tb || 0) - (ta || 0);
    });
    setItems(sorted.map((it) => ({ ...it, shortUrlCalc: computeShort(it) })));
  }

  useEffect(() => {
    reload();
  }, []);

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
    // 낙관적 업데이트
    setItems((prev) => prev.filter((x) => x.id !== id));
    try {
      await removeServer(id as any); // 백엔드가 없으면 조용히 실패하게 둠
    } catch (_) {
      // 서버 실패는 무시 (로컬만 삭제)
    } finally {
      removeLinkLocal(id);
      // reload(); // 필요 시 재동기화
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 1200);
    });
  }

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

      <div className="text-sm text-gray-500 dark:text-gray-400">
        총 <span className="font-semibold">{items.length}</span> 건
      </div>

      <div className="divide-y dark:divide-gray-800">
        {filtered.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 py-8">조건에 맞는 링크가 없습니다.</p>
        )}

        {filtered.map((it) => {
          const short = it.shortUrlCalc;            // 표시/복사용 /r/{slug}
          const qrLink = computeQr(it);             // QR용 /q/{slug}?m=poster&loc=entrance
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