import React, { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200 transition-all`}>
        <div className="flex items-center justify-between p-4 border-b">
          <span className="flex items-center gap-2 font-bold text-indigo-600">
            <i className="bx bxs-dashboard text-2xl" />
            {!collapsed && <span>DashPro</span>}
          </span>
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700">
            <i className="bx bx-menu" />
          </button>
        </div>
        <nav className="mt-4">
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
            <i className="bx bxs-bar-chart-alt-2" /> {!collapsed && "Analytics"}
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
            <i className="bx bxs-link-alt" /> {!collapsed && "Link Creator"}
          </a>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-800">Analytics Dashboard</h1>
          <div className="flex items-center gap-4">
            <button className="relative text-gray-600 hover:text-indigo-600">
              <i className="bx bxs-bell text-xl" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">3</span>
            </button>
            <img src="https://placehold.co/32x32" className="h-8 w-8 rounded-full" />
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 bg-gray-50 p-6">{children}</div>
      </main>
    </div>
  );
}
