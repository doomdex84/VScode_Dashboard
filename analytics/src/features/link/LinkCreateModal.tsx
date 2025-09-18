import React, { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createLink } from "./api.server"; // ← LinkData는 여기서 import 안함 (로컬 선언)

type Props = {
  onClose: () => void;
  defaultUrl?: string;            // ← 추가
  onCreated?: (link: LinkData) => void; // (쓰는 중이면 유지)
};


// 서버 응답 형태(로컬 선언: api.server.ts에서 굳이 export 안 해도 됨)
type LinkData = {
  id: number;
  slug: string;
  originalUrl: string;
  expirationDate: string | null;
  active: boolean;
  createdAt: string;
};

const slugPattern = /^[A-Za-z0-9-_.~]+$/;

// 공개용 베이스 도메인 (env 우선, 없으면 dev는 :8080, 배포는 현재 origin)
function getPublicOrigin() {
  const env = import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined; // ← | (파이프) 주의
  if (env && env.trim()) return env.trim();

  const { protocol, hostname, port } = window.location;
  const isDevVite = port === "5173" || port === "5174";
  if (isDevVite) return `${protocol}//${hostname}:8080`;
  return window.location.origin;
}

export default function LinkCreateModal({ onClose }: Props) {
  const [originalUrl, setOriginalUrl] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<LinkData | null>(null);

  const publicOrigin = useMemo(() => getPublicOrigin(), []);

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
      // ✅ payload에서 slug는 비었으면 아예 넣지 않는다 (null 금지)
      const payload: { originalUrl: string; slug?: string } = {
        originalUrl: originalUrl.trim(),
      };
      const vslug = slugInput.trim();
      if (vslug) payload.slug = vslug;

      const data: LinkData = await createLink(payload);
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
      {/* 모달 박스 배경: 하늘색 */}
      <div className="w-[540px] rounded-2xl shadow-xl p-6" style={{ backgroundColor: "#ffffffff" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">링크 생성</h2>
          <button onClick={onClose} className="px-3 py-1 rounded hover:bg-gray-100">닫기</button>
        </div>

        <label className="block text-sm font-medium mb-1">원본 URL</label>
        <input
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          placeholder="https://example.com/..."
          className="w-full border rounded-lg px-3 py-2 mb-4 bg-white"
        />

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

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
          >
            {creating ? "생성 중..." : "링크 생성"}
          </button>
        </div>

        {link && (
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="flex flex-col items-center gap-3">
              {/* ✅ QR은 /q/{slug}?m=poster&loc=entrance */}
              <QRCodeCanvas value={qrUrl} size={180} includeMargin />
              <button onClick={handleCopy} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
                링크 복사
              </button>
            </div>
            <div className="text-sm">
              <p className="text-gray-800 mb-1">짧은 링크</p>
              <a href={shortUrl} target="_blank" rel="noreferrer" className="text-blue-800 underline break-all">
                {shortUrl}
              </a>

              <p className="text-gray-800 mt-4 mb-1">원본 URL</p>
              <a href={link.originalUrl} target="_blank" rel="noreferrer" className="underline break-all">
                {link.originalUrl}
              </a>

              <p className="text-gray-800 mt-4 mb-1">QR 링크</p>
              <a href={qrUrl} target="_blank" rel="noreferrer" className="underline break-all">
                {qrUrl}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
