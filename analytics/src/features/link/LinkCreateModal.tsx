// src/features/link/LinkCreateModal.tsx
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas } from "qrcode.react";
import { addLinkLocal, removeLinkLocal } from "./api.local.ts";
import {
  createLink,
  getLinkBySlug,
  toShortUrl,
  removeLink as removeServer,
} from "./api.server.ts";

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
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  const disabled = useMemo(
    () => loading || !isHttp(f.originalUrl),
    [loading, f.originalUrl]
  );

  async function onCreate() {
    if (disabled) return;
    setLoading(true);
    setSlugError(null);
    try {
      const desired = sanitizeSlug(f.slug); // "/abd" → "abd"
      const resp = await createLink({
        originalUrl: f.originalUrl,
        slug: desired || undefined,         // 서버로도 전송(서버가 지원할 때 사용)
      });

      if ((resp as any)?.error === "SLUG_ALREADY_TAKEN") {
        setSlugError("이미 사용 중인 슬러그입니다. 다른 값을 입력하세요.");
        return;
      }
      if ((resp as any)?.error) {
        alert("링크 생성 중 오류가 발생했습니다.");
        return;
      }

      // 서버가 slug 내려주면 우선 사용, 없으면 입력/랜덤
      let slug = (resp as any)?.slug as string | undefined;
      if (!slug) slug = desired || genSlug();

      const short = toShortUrl(slug);
      await getLinkBySlug(slug).catch(() => null);

      const saved = addLinkLocal({
        originalUrl: f.originalUrl,
        shortUrl: short,
        slug,
        url: short, // 레거시 호환
      }) as any;

      setCreatedId(saved?.id ?? null);
      setShortUrl(short);
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
    setCreatedId(null);
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border-4 border-black p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold">링크 생성</h3>
          <button className="border-2 border-black px-2 py-1" onClick={onClose}>
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
              className="w-full h-11 border-2 border-black px-3 outline-none"
            />
            {!f.originalUrl ? (
              <p className="text-xs text-gray-500">필수 입력</p>
            ) : !isHttp(f.originalUrl) ? (
              <p className="text-xs text-rose-600">http/https 주소가 아닙니다.</p>
            ) : null}
          </div>

          {/* 슬러그 (선택, 서버 미전송) */}
          <div className="space-y-1">
            <label className="text-sm font-medium">슬러그 (선택, 서버 미전송)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">/r/</span>
              <input
                value={f.slug}
                onChange={(e) => setF((s) => ({ ...s, slug: e.target.value }))}
                placeholder="abd"
                className={`flex-1 h-11 border-2 px-3 outline-none ${
                  slugError ? "border-rose-600" : "border-black"
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
          {shortUrl && (
            <div className="grid place-items-center gap-2">
              <QRCodeCanvas id="qr-preview" value={shortUrl} size={160} />
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
                className="underline break-all"
              >
                {shortUrl}
              </a>
            </div>
          )}
        </div>

        {/* 하단 버튼: 생성/복사(초록) → 삭제(빨강) */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={shortUrl ? () => navigator.clipboard.writeText(shortUrl!) : onCreate}
            disabled={disabled && !shortUrl}
            className="px-4 py-2 border-2 border-black bg-emerald-600 text-white disabled:opacity-50"
          >
            {shortUrl ? "링크 복사" : loading ? "생성중..." : "링크 생성(+QR)"}
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 border-2 border-black bg-rose-600 text-white"
          >
            링크 삭제
          </button>
        </div>
      </div>
    </div>
  );

  // ✅ 언제나 body 위에 렌더 → 진짜 팝업
  return createPortal(modal, document.body);
}
