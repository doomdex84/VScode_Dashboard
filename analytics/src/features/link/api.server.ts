// src/features/link/api.server.ts

// 단축 URL의 실제 호스트(백엔드). 배포/개발 모두 여기만 바꾸면 됨.
const SHORT_BASE =
  (import.meta.env.VITE_SHORT_BASE_URL as string | undefined) ??
  "http://localhost:8080";

export const toShortUrl = (slug: string) =>
  `${SHORT_BASE.replace(/\/+$/, "")}/r/${encodeURIComponent(slug)}`;

/** POST /links  (Form urlencoded: url=...)  */
export async function createLink(payload: { originalUrl: string }) {
  try {
    const body = new URLSearchParams();
    body.set("url", payload.originalUrl); // @RequestParam("url")

    // 프록시 사용 → 절대경로 '/links' 그대로
    const res = await fetch(`/links`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      console.warn("createLink not ok:", res.status, await res.text().catch(() => ""));
      return null;
    }

    // 예상 응답: { id, slug, originalUrl, ... }
    const data: any = await res.json().catch(() => ({}));
    const slug: string | undefined = data?.slug;
    const shortUrl = slug ? toShortUrl(slug) : undefined;
    return { ...data, slug, shortUrl } as
      | { id?: number; slug?: string; originalUrl?: string; shortUrl?: string }
      | null;
  } catch (e) {
    console.error("createLink error", e);
    return null;
  }
}

/** GET /api/links/{slug}  → 생성 검증/세부 정보 */
export async function getLinkBySlug(slug: string) {
  try {
    const res = await fetch(`/api/links/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch (e) {
    console.error("getLinkBySlug error", e);
    return null;
  }
}

// (호환용) 실서버 삭제 API가 아직 없다면 빈 스텁 제공
export async function removeLink(_: string | number) {
  return { ok: false };
}
