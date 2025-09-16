// src/features/link/LinkPage.tsx
import React, { useState } from "react";
import LinkList from "./LinkList";
import LinkCreateModal from "./LinkCreateModal";

export default function LinkPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <button className="btn btn-ghost normal-case text-lg" onClick={() => setOpen(true)}>
            링크 생성
          </button>
        </div>
        <div className="flex-none">
          <a className="btn btn-ghost text-xl">링크보드</a>
        </div>
      </div>

      <main className="p-6">
        <LinkList />
      </main>

      {open && <LinkCreateModal onClose={() => setOpen(false)} />}
    </div>
  );
}
