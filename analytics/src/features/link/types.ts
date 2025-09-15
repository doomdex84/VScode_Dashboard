// 서버 응답(JSON) 스펙 그대로 맞춘 타입
export type LinkItem = {
  id: number;                    // PK
  slug: string;                  // 단축 슬러그
  originalUrl: string;           // 원본 URL
  expirationDate: string | null; // 만료일(없으면 null)
  active: boolean;               // 활성 여부
  createdAt: string;             // 생성 시각 (ISO 문자열)
};

// 생성 요청 전용 DTO (요청과 응답 타입 분리 권장)
export type CreateLinkDto = {
  originalUrl: string;
  slug?: string;
  expirationDate?: string; // yyyy-MM-dd
};
