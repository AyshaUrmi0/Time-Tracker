import type { ReactNode } from "react";
import { TopNav } from "@/components/app-shell/top-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-6">
        {children}
      </main>
    </div>
  );
}
