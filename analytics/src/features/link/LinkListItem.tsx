type LinkItem = {
  id?: number;
  originalUrl: string;
  shortUrl?: string | null;
  slug?: string | null;
  createdAt?: string;
};

export default function LinkListItem({
  item,
  onSelectSlug,
}: {
  item: LinkItem;
  onSelectSlug?: (slug: string) => void;
}) {
  const hasSlug = !!item.slug;

  // 분석 버튼: slug만 대상으로 동작
  const handleAnalyze = () => {
    if (!item.slug) return;

    // 1) 상위에서 핸들러를 준 경우 그대로 사용
    if (onSelectSlug) {
      onSelectSlug(item.slug);
      return;
    }

    // 2) 폴백: 자체적으로 ?slug= 갱신 + 이벤트 발행
    const sp = new URLSearchParams(window.location.search);
    sp.set("slug", item.slug);
    window.history.pushState({}, "", `?${sp.toString()}`);
    window.localStorage.setItem("lastSlug", item.slug);
    window.dispatchEvent(new Event("popstate"));
    document.getElementById("stats-top")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-gray-500 truncate">{item.originalUrl}</div>

        <div className="mt-1 flex items-center gap-2">
          {item.shortUrl ? (
            <a
              href={item.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 underline break-all"
              title="단축 링크 새 탭에서 열기"
            >
              {item.shortUrl}
            </a>
          ) : (
            <span className="text-sm text-gray-400">단축 링크 없음</span>
          )}

          {/* ✅ 분석 버튼 (디자인 유지, 기능만 연결) */}
          <button
            onClick={handleAnalyze}
            disabled={!hasSlug}
            className={`px-2 py-1 rounded-md border text-xs ${
              hasSlug
                ? "bg-slate-700 text-white border-slate-700 hover:opacity-90"
                : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
            }`}
            title={hasSlug ? "이 링크의 통계 보기" : "슬러그가 없어 분석을 열 수 없습니다"}
          >
            분석
          </button>

          {/* (선택) 바로 방문 */}
          {item.shortUrl && (
            <button
              onClick={() => window.open(item.shortUrl!, "_blank", "noopener")}
              className="px-2 py-1 rounded-md border text-xs bg-white text-slate-700 border-slate-300 hover:bg-gray-50"
              title="단축 링크 방문 (로그 적재)"
            >
              열기
            </button>
          )}
        </div>
      </div>

      {item.createdAt && (
        <div className="shrink-0 text-xs text-gray-400">
          {new Date(item.createdAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
