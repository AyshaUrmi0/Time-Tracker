import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SettingsPageView } from "./settings-page";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");
  return <SettingsPageView />;
}
