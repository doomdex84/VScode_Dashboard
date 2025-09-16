// src/features/link/api.server.ts
// 프론트 → 백엔드 API 래퍼

// 단축 도메인 (환경변수 없으면 8080 기본)
const SHORT_BASE =
  (import.meta.env.VITE_SHORT_BASE_URL as string | undefined) ??
  "http://localhost:8080";

export const toShortUrl = (slug: string) =>
  `${SHORT_BASE.replace(/\/+$/, "")}/r/${encodeURIComponent(slug)}`;

// ⬇️ 여기가 핵심: slug는 선택(optional)
export type CreateLinkPayload = { originalUrl: string; slug?: string };

export async function createLink(payload: CreateLinkPayload) {
  try {
    const body = new URLSearchParams();
    body.set("url", payload.originalUrl);
    if (payload.slug) body.set("slug", payload.slug); // 서버가 slug를 받는다면 전송

    // 프록시(vite.config.ts) 기준으로 동일 호스트 경로 사용
    const res = await fetch(`/links`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (res.status === 409) {
      // 슬러그 중복
      return { error: "SLUG_ALREADY_TAKEN" } as const;
    }
    if (!res.ok) {
      return { error: "CREATE_FAILED", status: res.status } as const;
    }

    // 백엔드가 내려주는 JSON(예: { id, slug, originalUrl, createdAt ... })
    const data: any = await res.json().catch(() => ({}));
    const slug: string | undefined = data?.slug;
    const shortUrl = slug ? toShortUrl(slug) : undefined;
    return { ...data, slug, shortUrl } as any;
  } catch (e) {
    console.error("createLink error", e);
    return { error: "NETWORK_ERROR" } as const;
  }
}

export async function getLinkBySlug(slug: string) {
  try {
    const res = await fetch(`/api/links/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}

// 아직 서버 삭제가 없을 수도 있으니 no-op 처리
export async function removeLink(_: string | number) {
  return { ok: false };
}
