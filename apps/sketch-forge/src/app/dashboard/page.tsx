import { getDashboardData } from "@/api/server";
import { DashboardClient } from "@/features/dashboard";

export default async function DashboardPage() {
  const initialData = await getDashboardData();

  return <DashboardClient initialData={initialData} />;
}
