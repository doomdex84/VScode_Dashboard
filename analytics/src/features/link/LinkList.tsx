import React, { useEffect, useMemo, useState } from "react";
import { listLinks as listLocal, removeLinkLocal } from "./api.local";
import { removeLink as removeServer, toShortUrl, toQrUrl } from "./api.server";
import type { LinkItem } from "./types";
import { QRCodeCanvas } from "qrcode.react";
import LinkCreateModal from "./LinkCreateModal";

type LinkItemWithShort = LinkItem & { shortUrlCalc: string };

function fmt(dt: string | number) {
  const d = typeof dt === "number" ? new Date(dt) : new Date(dt);
  if (isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

export default function LinkList({ isDark = false }: { isDark?: boolean }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<LinkItemWithShort[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const onSelectSlug = (slug: string) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("slug", slug);
    window.history.pushState({}, "", `?${sp.toString()}`);
    window.localStorage.setItem("lastSlug", slug);
    window.dispatchEvent(new Event("popstate"));
    document.getElementById("stats-top")?.scrollIntoView({ behavior: "smooth" });
  };

  function computeShort(it: any): string {
    if (typeof it.shortUrl === "string" && it.shortUrl.length > 0) return it.shortUrl;
    if (typeof it.slug === "string" && it.slug.length > 0) return toShortUrl(it.slug);
    if (typeof it.originalUrl === "string" && it.originalUrl.length > 0) return it.originalUrl;
    return "";
  }
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

  if (!items || items.length === 0) {
    return (
      <>
        <section
          aria-labelledby="link-list-empty"
          className={`max-w-6xl mx-auto rounded-2xl p-6 md:p-8 space-y-4 text-center shadow border transition-colors
          ${isDark ? "bg-gray-900 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"}`}
        >
          <h2 id="link-list-empty" className="text-2xl font-bold">링크 목록</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            아직 만든 링크가 없어요. 링크를 생성하면 클릭 통계와 시간대/기기/채널 분석을 바로 볼 수 있어요.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              링크 생성하기
            </button>
          </div>
        </section>

        {createOpen && (
          <LinkCreateModal
            // 구현마다 prop 이름이 다를 수 있어 둘 다 전달
            // @ts-ignore
            open={createOpen}
            // @ts-ignore
            isOpen={createOpen}
            onClose={() => setCreateOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <section
      aria-labelledby="link-list-title"
      className={`max-w-6xl mx-auto rounded-2xl p-6 md:p-8 space-y-6 shadow border transition-colors
      ${isDark ? "bg-gray-900 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"}`}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 id="link-list-title" className="text-2xl font-bold">링크 목록</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색: URL, 슬러그, 단축링크…"
          className={`w-full sm:w-80 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${isDark ? "bg-gray-950 border-gray-700 text-gray-100 placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900"}`}
          aria-label="링크 검색"
        />
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        총 <span className="font-semibold">{items.length}</span> 건
      </div>

      <div className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-200"}`}>
        {filtered.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 py-8">조건에 맞는 링크가 없습니다.</p>
        )}

        {filtered.map((it) => {
          const short = it.shortUrlCalc;
          const qrLink = computeQr(it);
          const hasSlug = !!it.slug;

          return (
            <div key={it.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {short ? (
                    <a
                      href={short}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline"
                    >
                      {short}
                    </a>
                  ) : (
                    <span className="text-gray-400">/r/슬러그 없음</span>
                  )}
                </p>
                <p className={`text-sm break-all ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {it.originalUrl}
                </p>
                <p className="text-xs text-gray-400">
                  {it.slug ? `slug: ${it.slug} • ` : ""}생성: {fmt(it.createdAt)}
                  { (it as any).expirationDate ? ` • 만료: ${fmt((it as any).expirationDate)}` : "" }
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  className={`px-3 py-2 rounded border transition-colors
                  ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}
                  ${hasSlug ? "" : "opacity-60 cursor-not-allowed"}`}
                  onClick={() => hasSlug && onSelectSlug(it.slug!)}
                  disabled={!hasSlug}
                  title={hasSlug ? "이 링크의 통계 보기" : "슬러그가 없어 분석을 열 수 없습니다"}
                >
                  분석
                </button>

                <button
                  className={`px-3 py-2 rounded border transition-colors
                  ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                  onClick={() => copy(short || it.originalUrl)}
                  disabled={!short && !it.originalUrl}
                  title="복사"
                >
                  {copied === (short || it.originalUrl) ? "복사됨" : "복사"}
                </button>

                <button
                  className={`px-3 py-2 rounded border transition-colors
                  ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                  onClick={() => setQr(qrLink)}
                  disabled={!qrLink}
                >
                  QR
                </button>

                <button
                  className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={() => onDelete(it.id!)}
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR 모달 (기존 그대로) */}
      {qr && (
        <div
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setQr(null)}
        >
          <div
            className={`rounded-2xl p-6 w-full max-w-md shadow-xl ${isDark ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`mb-3 break-all text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{qr}</p>
            <div className="flex justify-center">
              <QRCodeCanvas id="qr-modal-canvas" value={qr} size={220} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className={`px-3 py-2 rounded border ${isDark ? "border-gray-700" : "border-gray-300"}`}
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
              <button
                className={`px-3 py-2 rounded border ${isDark ? "border-gray-700" : "border-gray-300"}`}
                onClick={() => setQr(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <LinkCreateModal
          // @ts-ignore
          open={createOpen}
          // @ts-ignore
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </section>
  );
}
