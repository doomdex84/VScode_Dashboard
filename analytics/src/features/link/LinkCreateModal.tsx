// src/features/link/LinkCreateModal.tsx
import React, { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createLink, type LinkData } from "./api.server";

type Props = { onClose: () => void };

const slugPattern = /^[A-Za-z0-9-_.~]+$/;

// ✅ 공개용 베이스 도메인 계산 (env 우선, 없으면 dev에서 :8080, 배포는 현 origin)
function getPublicOrigin() {
  const env = import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined;
  if (env && env.trim()) return env.trim();

  const { protocol, hostname, port } = window.location;
  const isDevVite = port === "5173" || port === "5174";
  if (isDevVite) return `${protocol}//${hostname}:8080`; // 로컬 개발 기본
  return window.location.origin;
}

export default function LinkCreateModal({ onClose }: Props) {
  const [originalUrl, setOriginalUrl] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<LinkData | null>(null);

  // 공개 도메인
  const publicOrigin = useMemo(() => getPublicOrigin(), []);

  // ✅ 짧은 링크(/r)와 QR용 링크(/q)를 각각 계산
  const shortUrl = useMemo(
    () => (link ? `${publicOrigin}/r/${link.slug}` : ""),
    [link, publicOrigin]
  );
  const qrUrl = useMemo(
    () => (link ? `${publicOrigin}/q/${link.slug}?m=poster&loc=entrance` : ""),
    [link, publicOrigin]
  );

  const validate = () => {
    if (!originalUrl.trim()) return "원본 URL을 입력하세요.";
    try {
      new URL(originalUrl.trim());
    } catch {
      return "올바른 URL이 아닙니다.";
    }
    if (slugInput && !slugPattern.test(slugInput)) {
      return "슬러그는 영문/숫자/.-_~ 만 가능합니다.";
    }
    return null;
  };

  const handleCreate = async () => {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setCreating(true);
    try {
      const data = await createLink({
        originalUrl: originalUrl.trim(),
        slug: slugInput.trim() || null, // 비우면 서버 자동 생성
      });
      setLink(data);
    } catch (e: any) {
      setError(e?.message || "링크 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    alert("짧은 링크가 복사되었습니다.");
  };

  return (
    <div className="fixed inset-0 grid place-items-center bg-black/40 z-50">
      {/* 모달 박스 하늘색 배경 유지 */}
      <div className="w-[540px] rounded-2xl shadow-xl p-6" style={{ backgroundColor: "#ffffffff" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">링크 생성</h2>
          <button onClick={onClose} className="px-3 py-1 rounded hover:bg-gray-100">닫기</button>
        </div>

        {/* 원본 URL */}
        <label className="block text-sm font-medium mb-1">원본 URL</label>
        <input
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          placeholder="https://example.com/..."
          className="w-full border rounded-lg px-3 py-2 mb-4 bg-white"
        />

        {/* 슬러그 (선택) */}
        <label className="block text-sm font-medium mb-1">
          슬러그 (선택) <span className="text-xs text-gray-700 ml-1">비워두면 자동 생성</span>
        </label>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-800">/r/</span>
          <input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="my-campaign-2025"
            className="flex-1 border rounded-lg px-3 py-2 bg-white"
          />
        </div>
        <p className="text-xs text-gray-700 mb-4">허용: 영문/숫자/.-_~</p>

        {/* 에러 */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
          >
            {creating ? "생성 중..." : "링크 생성"}
          </button>
        </div>

        {/* 결과 */}
        {link && (
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="flex flex-col items-center gap-3">
              {/* ✅ QR은 /q/{slug}?m=poster&loc=entrance 로 생성 */}
              <QRCodeCanvas value={qrUrl} size={180} includeMargin />
              <button onClick={handleCopy} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
                링크 복사
              </button>
            </div>
            <div className="text-sm">
              <p className="text-gray-800 mb-1">짧은 링크</p>
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-800 underline break-all"
              >
                {shortUrl}
              </a>

              <p className="text-gray-800 mt-4 mb-1">원본 URL</p>
              <a
                href={link.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="underline break-all"
              >
                {link.originalUrl}
              </a>

              <p className="text-gray-800 mt-4 mb-1">QR 링크</p>
              <a
                href={qrUrl}
                target="_blank"
                rel="noreferrer"
                className="underline break-all"
              >
                {qrUrl}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
