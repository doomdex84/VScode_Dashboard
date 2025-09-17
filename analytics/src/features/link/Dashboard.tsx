import React from "react";
import AnalyticsDashboard from "../../components/AnalyticsDashboard";
import LinkList from "./LinkList";

export default function Dashboard() {
  return (
    <>
      {/* 통계 섹션 */}
      <AnalyticsDashboard />

      {/* 링크 목록 섹션 */}
      <section className="bg-base-100 rounded-2xl p-6 md:p-8 shadow border border-base-200">
        <LinkList />
      </section>
    </>
  );
}
