// 프론트 → 백엔드 API 래퍼

function trimSlash(u: string) { return u.replace(/\/+$/, ""); }

const ENV_BASE = (import.meta.env.VITE_SHORT_BASE_URL as string | undefined) ?? undefined;
const ORIGIN   = typeof window !== "undefined" ? window.location.origin : undefined;

// 휴대폰에서도 열 수 있는 공개 베이스 (도메인/내부IP를 .env에 넣어주세요)
export const PUBLIC_BASE = trimSlash(ENV_BASE ?? ORIGIN ?? "http://localhost:8080");

// r/q 링크 생성기
export const toShortUrl = (slug: string) =>
  `${PUBLIC_BASE}/r/${encodeURIComponent(slug)}`;

export const toQrUrl = (slug: string, opts?: { m?: string; loc?: string }) => {
  const m = opts?.m ?? "poster";
  const loc = opts?.loc ?? "entrance";
  const qs = new URLSearchParams();
  if (m) qs.set("m", m);
  if (loc) qs.set("loc", loc);
  return `${PUBLIC_BASE}/q/${encodeURIComponent(slug)}?${qs.toString()}`;
};

// ------- API 호출 -------
export type CreateLinkPayload = { originalUrl: string; slug?: string };

const BACKEND_ORIGIN =
  (import.meta.env.VITE_BACKEND_ORIGIN as string | undefined) ?? "";
const api = (path: string) => (BACKEND_ORIGIN ? `${trimSlash(BACKEND_ORIGIN)}${path}` : path);

export async function createLink(payload: CreateLinkPayload) {
  try {
    const body = new URLSearchParams();
    body.set("url", payload.originalUrl);
    if (payload.slug) body.set("slug", payload.slug);

    const res = await fetch(api(`/links`), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });

    if (res.status === 409) return { error: "SLUG_ALREADY_TAKEN" } as const;
    if (!res.ok)      return { error: "CREATE_FAILED", status: res.status } as const;

    const data: any = await res.json().catch(() => ({}));
    const slug = data?.slug as string | undefined;
    const shortUrl = slug ? toShortUrl(slug) : undefined;
    const qrUrl    = slug ? toQrUrl(slug) : undefined;

    return { ...data, slug, shortUrl, qrUrl } as any;
  } catch (e) {
    console.error("createLink error", e);
    return { error: "NETWORK_ERROR" } as const;
  }
}

// /r/{slug}가 리다이렉트(3xx)이면 존재한다고 판단
export async function checkSlugExists(slug: string) {
  try {
    const res = await fetch(api(`/r/${encodeURIComponent(slug)}`), {
      method: "GET",
      redirect: "manual",
    });
    return res.status >= 300 && res.status < 400;
  } catch { return false; }
}

export async function removeLink(_: string | number) { return { ok: false }; }