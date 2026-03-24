import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin_auth");

  if (!auth || auth.value !== "authenticated") {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
