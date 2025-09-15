// src/features/link/LinkCreator.tsx
import React, { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { addLinkLocal } from "./api.local";
import { createLink, getLinkBySlug, toShortUrl } from "./api.server";

type FormState = { originalUrl: string; slug: string };
const initial: FormState = { originalUrl: "", slug: "" };

function isValidHttpUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
const pad = (n: number) => `${n}`.padStart(2, "0");
function genSlug() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export default function LinkCreator() {
  const [f, setF] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  const disabled = useMemo(() => loading || !isValidHttpUrl(f.originalUrl), [loading, f.originalUrl]);

  function onChange<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    setShortUrl(null);

    try {
      // 1) 서버 호출 (스프링은 slug를 받지 않음)
      const res = await createLink({ originalUrl: f.originalUrl });

      // 2) slug/shortUrl 결정
      let slug = (res as any)?.slug as string | undefined;
      let short = (res as any)?.shortUrl as string | undefined;

      // 서버가 slug를 안 주거나 실패 → 폴백
      if (!slug) slug = (f.slug || "").trim() || genSlug();
      if (!short) short = toShortUrl(slug);

      // 3) 생성 검증 (있으면)
      const verified = await getLinkBySlug(slug);
      if (!verified) {
        console.warn("server did not confirm link creation for slug:", slug);
        // 검증에 실패해도 UX는 계속 진행 (로컬 미리보기/QR)
      }

      // 4) 로컬에도 기록 (기존 타입을 건드리지 않기 위해 관대한 입력 사용)
      const saved = addLinkLocal({
        originalUrl: f.originalUrl,
        shortUrl: short,
        slug,
        url: short, // 레거시 호환
      });

      // 5) 미리보기 표시 (반드시 8080 기준 shortUrl)
      const preview = (saved as any).shortUrl ?? (saved as any).url ?? short;
      setShortUrl(preview as string);

      // 6) 폼 초기화
      setF(initial);
    } catch (err) {
      console.error(err);
      alert("링크 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function downloadQR() {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qr.png";
    a.click();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">원본 URL</label>
          <input
            type="url"
            required
            value={f.originalUrl}
            onChange={(e) => onChange("originalUrl", e.target.value)}
            placeholder="https://example.com/article/123"
            className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          {!f.originalUrl ? (
            <p className="text-xs text-gray-400">필수 입력</p>
          ) : !isValidHttpUrl(f.originalUrl) ? (
            <p className="text-xs text-rose-500">유효한 http/https 주소가 아닙니다.</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">슬러그 (선택, 서버 미전송)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">/r/</span>
            <input
              type="text"
              value={f.slug}
              onChange={(e) => onChange("slug", e.target.value)}
              placeholder="my-campaign-2025"
              className="h-10 flex-1 rounded-lg border border-black/10 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <p className="text-xs text-gray-400">비워두면 자동으로 생성됩니다.</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setF(initial)} disabled={loading}>
            초기화
          </button>
          <button type="submit" className="btn-primary disabled:opacity-50" disabled={disabled}>
            {loading ? "생성중..." : "링크 생성"}
          </button>
        </div>
      </form>

      {shortUrl && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <div className="text-sm text-gray-700 mb-2">생성된 링크</div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <a href={shortUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
              {shortUrl}
            </a>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost" onClick={() => navigator.clipboard.writeText(shortUrl!)}>
                링크 복사
              </button>
              <button type="button" className="btn-primary" onClick={downloadQR}>
                QR 다운로드
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <QRCodeCanvas id="qr-canvas" value={shortUrl} size={160} />
          </div>
        </div>
      )}
    </div>
  );
}
