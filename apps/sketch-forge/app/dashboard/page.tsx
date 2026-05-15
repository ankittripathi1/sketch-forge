import { getDashboardData } from "../../lib/api/server";
import { DashboardClient } from "./_components/DashboardClient";

export default async function DashboardPage() {
  const initialData = await getDashboardData();

  return <DashboardClient initialData={initialData} />;
}
