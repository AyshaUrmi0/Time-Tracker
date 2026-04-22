import { requireAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireAuth();
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
        Welcome, {user.name}
      </h1>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
        The dashboard lands in feature/dashboard. Tasks, timer, and reports are
        each their own branch.
      </p>
    </div>
  );
}
