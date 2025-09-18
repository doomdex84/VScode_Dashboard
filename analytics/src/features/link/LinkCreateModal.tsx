// src/features/link/LinkCreateModal.tsx
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas } from "qrcode.react";
import { addLinkLocal, removeLinkLocal } from "./api.local";
import {
  createLink,
  toShortUrl,
  removeLink as removeServer,
  // ❌ checkSlugExists 제거
  toQrUrl,
} from "./api.server";

type Props = { defaultUrl?: string; onClose: () => void };
type FormState = { originalUrl: string; slug: string };

const pad = (n: number) => `${n}`.padStart(2, "0");
const genSlug = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};
const sanitizeSlug = (s: string) =>
  s.trim().replace(/^\/+/, "").replace(/\/+$/, "");

function isHttp(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function LinkCreateModal({ defaultUrl = "", onClose }: Props) {
  const [f, setF] = useState<FormState>({ originalUrl: defaultUrl, slug: "" });
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null); // ✅ 추가
  const [slugError, setSlugError] = useState<string | null>(null);

  const disabled = useMemo(
    () => loading || !isHttp(f.originalUrl),
    [loading, f.originalUrl]
  );

  const analyticsHref = useMemo(
    () => (createdSlug ? `/?slug=${encodeURIComponent(createdSlug)}` : null),
    [createdSlug]
  );

  async function onCreate() {
    if (disabled) return;
    setLoading(true);
    setSlugError(null);
    try {
      const desired = sanitizeSlug(f.slug);
      const resp = await createLink({
        originalUrl: f.originalUrl,
        slug: desired || undefined,
      });

      if ((resp as any)?.error === "SLUG_ALREADY_TAKEN") {
        setSlugError("이미 사용 중인 슬러그입니다. 다른 값을 입력하세요.");
        return;
      }
      if ((resp as any)?.error) {
        alert("링크 생성 중 오류가 발생했습니다.");
        return;
      }

      // 서버가 slug를 안 내려주면 폴백 생성
      let slug = (resp as any)?.slug as string | undefined;
      if (!slug) slug = desired || genSlug();

      // ✅ 존재 확인(HEAD) 없이, 바로 /r, /q 링크를 만든다
      const short = toShortUrl(slug);
      const qr = toQrUrl(slug, { m: "poster", loc: "entrance" });

      // ✅ 대시보드 폴백용으로 저장
      localStorage.setItem("lastSlug", slug);
      setCreatedSlug(slug);

      // 로컬 목록에도 저장
      const saved = addLinkLocal({
        originalUrl: f.originalUrl,
        shortUrl: short,
        slug,
        url: short, // 레거시 호환
      }) as any;

      setCreatedId(saved?.id ?? null);
      setShortUrl(short);
      setQrUrl(qr);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (createdId != null) removeLinkLocal(createdId);
    try {
      await removeServer(createdId ?? "");
    } catch {}
    setShortUrl(null);
    setQrUrl(null);
    setCreatedId(null);
    setCreatedSlug(null);
  }

  function openAnalytics() {
    if (!createdSlug) return;
    const href = analyticsHref ?? `/?slug=${encodeURIComponent(createdSlug)}`;
    window.location.href = href;
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1000] bg-white/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold">링크 생성</h3>
          <button
            className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className="space-y-4">
          {/* 원문 URL */}
          <div className="space-y-1">
            <label className="text-sm font-medium">원문 URL</label>
            <input
              type="url"
              value={f.originalUrl}
              onChange={(e) =>
                setF((s) => ({ ...s, originalUrl: e.target.value }))
              }
              placeholder="https://example.com/..."
              className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {!f.originalUrl ? (
              <p className="text-xs text-gray-500">필수 입력</p>
            ) : !isHttp(f.originalUrl) ? (
              <p className="text-xs text-rose-600">http/https 주소가 아닙니다.</p>
            ) : null}
          </div>

          {/* 슬러그 (선택) */}
          <div className="space-y-1">
            <label className="text-sm font-medium">슬러그 (선택)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">/r/</span>
              <input
                value={f.slug}
                onChange={(e) => setF((s) => ({ ...s, slug: e.target.value }))}
                placeholder="my-campaign-2025"
                className={`flex-1 h-11 rounded-lg border px-3 outline-none focus:ring-2 ${
                  slugError
                    ? "border-rose-600 focus:ring-rose-500"
                    : "border-gray-300 focus:ring-indigo-500"
                }`}
              />
            </div>
            {slugError ? (
              <p className="text-xs text-rose-600">{slugError}</p>
            ) : (
              <p className="text-xs text-gray-500">
                비워두면 자동 생성됩니다. (영문/숫자/-/_ 권장)
              </p>
            )}
          </div>

          {/* QR 미리보기 */}
          {qrUrl && (
            <div className="grid place-items-center gap-2">
              <QRCodeCanvas id="qr-preview" value={qrUrl} size={160} />
              <a
                href={qrUrl}
                target="_blank"
                rel="noreferrer"
                className="underline break-all"
              >
                {qrUrl}
              </a>
            </div>
          )}
        </div>

        {/* 하단 버튼: 생성/복사 + 분석 보기 + 삭제 */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={shortUrl ? () => navigator.clipboard.writeText(shortUrl!) : onCreate}
            disabled={disabled && !shortUrl}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-emerald-600 text-white disabled:opacity-50"
          >
            {shortUrl ? "링크 복사" : loading ? "생성중..." : "링크 생성(+QR)"}
          </button>

          {createdSlug && (
            <button
              onClick={openAnalytics}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-slate-700 text-white"
              title="이 링크의 통계 보기"
            >
              분석 보기
            </button>
          )}

          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-rose-600 text-white"
          >
            링크 삭제
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
