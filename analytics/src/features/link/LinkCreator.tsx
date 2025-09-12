// src/features/link/LinkCreator.tsx
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FocusTrap } from "focus-trap-react";
import { QRCodeCanvas } from "qrcode.react";

const schema = z.object({
  url: z.string().url("올바른 URL을 입력하세요 (https://...)"),
  slug: z
    .string()
    .trim()
    .max(32, "슬러그는 최대 32자입니다.")
    .regex(/^[a-zA-Z0-9-_]*$/, "영문/숫자/-/_ 만 가능합니다.")
    .optional()
    .or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;
type LinkItem = {
  id: string;
  url: string;
  slug?: string;
  expiresAt?: string | null;
  createdAt: string;
};

const STORAGE_KEY = "link_creator_items_v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const toShortUrl = (it: LinkItem) =>
  `https://short.link/${it.slug && it.slug.length ? it.slug : it.id}`;

function save(items: LinkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function load(): LinkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function Modal({
  isOpen,
  onClose,
  children,
  titleId = "modal-title",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  titleId?: string;
}) {
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      lastActiveRef.current = document.activeElement as HTMLElement | null;
    } else {
      lastActiveRef.current?.focus?.();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <FocusTrap>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onKeyDown={onKeyDown}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative z-10 w-[min(96vw,560px)] rounded-2xl bg-white p-6 shadow-xl outline-none">
          {children}
        </div>
      </div>
    </FocusTrap>
  );
}

function QrModalContent({ item, onClose }: { item: LinkItem; onClose: () => void }) {
  const shortUrl = toShortUrl(item);

  const handleDownload = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#qr-canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr_${item.slug || item.id}.png`;
    a.click();
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 id="modal-title" className="text-lg font-semibold">QR 코드</h3>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          닫기 (Esc)
        </button>
      </div>
      <p className="mb-2 break-all text-sm text-slate-600">{shortUrl}</p>
      <div className="flex flex-col items-center gap-4">
        <QRCodeCanvas id="qr-canvas" value={shortUrl} size={220} includeMargin />
        <button
          onClick={handleDownload}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
        >
          PNG 다운로드
        </button>
      </div>
    </div>
  );
}

export default function LinkCreator() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", slug: "", expiresAt: "" },
  });

  const [items, setItems] = useState<LinkItem[]>(() => load());
  const [qrTarget, setQrTarget] = useState<LinkItem | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => save(items), [items]);

  const onError = () => {
    const firstError = Object.values(errors)[0]?.message as string | undefined;
    if (firstError) setAnnounce(firstError);
  };

  const onSubmit = (v: FormValues) => {
    const newItem: LinkItem = {
      id: uid(),
      url: v.url,
      slug: (v.slug || "").trim(),
      expiresAt: v.expiresAt || null,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);
    setAnnounce("링크가 생성되어 목록에 추가되었습니다.");
    reset({ url: "", slug: "", expiresAt: "" });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setAnnounce("링크가 삭제되었습니다.");
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">링크 생성 & QR UI</h1>
        <p className="text-sm text-slate-600">프로젝트에 통합된 모듈</p>
      </header>

      <div aria-live="polite" className="sr-only">{announce}</div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit, onError)} className="grid gap-4" noValidate>
          <div>
            <label htmlFor="url" className="mb-1 block font-medium">
              대상 URL <span className="text-rose-600">*</span>
            </label>
            <input
              id="url"
              type="url"
              inputMode="url"
              placeholder="https://example.com/article/123"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:ring-4 focus:ring-indigo-100"
              aria-invalid={!!errors.url || undefined}
              aria-describedby={errors.url ? "url-error" : undefined}
              {...register("url")}
            />
            {errors.url && (
              <p id="url-error" role="alert" className="mt-1 text-sm text-rose-600">
                {String(errors.url.message)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="slug" className="mb-1 block font-medium">
              커스텀 슬러그 <span className="text-slate-500">(선택)</span>
            </label>
            <input
              id="slug"
              type="text"
              placeholder="my-campaign-001"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:ring-4 focus:ring-indigo-100"
              aria-invalid={!!errors.slug || undefined}
              aria-describedby={errors.slug ? "slug-error" : undefined}
              {...register("slug")}
            />
            {errors.slug && (
              <p id="slug-error" role="alert" className="mt-1 text-sm text-rose-600">
                {String(errors.slug.message)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="expiresAt" className="mb-1 block font-medium">
              만료일 <span className="text-slate-500">(선택)</span>
            </label>
            <input
              id="expiresAt"
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:ring-4 focus:ring-indigo-100"
              {...register("expiresAt")}
            />
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-50"
            >
              링크 생성
            </button>
            <button
              type="button"
              onClick={() => reset({ url: "", slug: "", expiresAt: "" })}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">생성된 링크</h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            아직 생성된 링크가 없습니다.
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((it) => {
              const shortUrl = toShortUrl(it);
              return (
                <li key={it.id} className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{shortUrl}</div>
                    <div className="truncate text-sm text-slate-600">{it.url}</div>
                    <div className="text-xs text-slate-500">
                      생성일: {new Date(it.createdAt).toLocaleString()}
                      {it.expiresAt ? ` · 만료일: ${it.expiresAt}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setQrTarget(it)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    >
                      QR 보기/다운로드
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal isOpen={!!qrTarget} onClose={() => setQrTarget(null)}>
        {qrTarget && <QrModalContent item={qrTarget} onClose={() => setQrTarget(null)} />}
      </Modal>
    </div>
  );
}
