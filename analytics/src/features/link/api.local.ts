// src/features/link/api.local.ts
import type { LinkItem } from "./types";

const KEY = "links";

/** 전체 불러오기 */
export function listLinks(): LinkItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LinkItem[]) : [];
  } catch {
    return [];
  }
}

/** 내부 저장 */
function saveAll(items: LinkItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

/**
 * ✅ 기존 타입을 절대 건드리지 않고, 입력만 관대하게 받습니다.
 * - 프로젝트마다 LinkItem 필드 구성이 달라서, originalUrl/shortUrl/slug 등을 넘겨도 에러 안 나게.
 * - 필요한 최소 필드(id, createdAt)는 여기서 자동 생성합니다.
 */
export type LinkInsert = Partial<Omit<LinkItem, "id" | "createdAt">> & {
  originalUrl?: string;
  shortUrl?: string;
  slug?: string;
  url?: string; // 레거시 호환 (혹시 url 하나만 쓰는 코드가 있을 수 있음)
};

export function addLinkLocal<T extends LinkItem>(data: LinkInsert): T {
  const newItem = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    ...data,
  } as unknown as T; // ← 기존 LinkItem 구조를 그대로 존중(필수 필드가 더 있어도 컴파일러 불평 X)

  const next = [newItem as LinkItem, ...listLinks()];
  saveAll(next);
  return newItem;
}

/** 로컬 삭제 (id:number 가정) */
export function removeLinkLocal(id: number) {
  const next = listLinks().filter((x) => x.id !== id);
  saveAll(next);
  return { ok: true };
}

/** (기존 코드 호환용) 통째 저장 */
export function saveLinks(items: LinkItem[]) {
  saveAll(items);
}
