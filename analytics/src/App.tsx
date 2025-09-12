// dashboard/analytics/src/App.tsx
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import AdminLayout from "./components/AdminLayout";

export default function App() {
  return (
    <AdminLayout>
      <AnalyticsDashboard />
    </AdminLayout>
  )}