import React, { useEffect, useState } from "react";
import AnalyticsDashboard from "../../components/AnalyticsDashboard";
import LinkList from "./LinkList";

export default function Dashboard() {
  // ✅ 전역 다크모드 상태 (상단바 제외, 본 섹션만)
  const [isDark, setIsDark] = useState(false);

  // Tailwind dark: 와 차트 CSS 변수( body.dark ) 모두 동기화
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
  }, [isDark]);

  return (
    // ✅ 이 래퍼의 dark 클래스는 자식 전체(그래프+링크목록)에 적용됨
    <div className={isDark ? "dark" : ""}>
      {/* 통계 섹션 (토글 버튼은 이 안에 있음) */}
      <AnalyticsDashboard isDark={isDark} setIsDark={setIsDark} />

      {/* 링크 목록 섹션 (기존 디자인 유지 + 다크 지원) */}
      <section
        className={`p-6 md:p-8 shadow border transition-colors
        ${isDark ? "bg-gray-900 border-gray-700 text-gray-100" : "bg-[rgb(248,250,252)] border-gray-200 text-gray-900"}`}
      >
        <LinkList isDark={isDark} />
      </section>
    </div>
  );
}
