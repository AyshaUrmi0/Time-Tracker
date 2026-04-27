"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { BrandMark } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { TimerWidget } from "@/features/timer/components/timer-widget";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; adminOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/timesheet", label: "Timesheet" },
  { href: "/calendar", label: "Calendar" },
  { href: "/reports", label: "Reports" },
  { href: "/team", label: "Team", adminOnly: true },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
              Time Tracker
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                    active
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <TimerWidget />
          <AvatarMenu name={session?.user?.name ?? "User"} id={session?.user?.id} />
        </div>
      </div>
    </header>
  );
}

function AvatarMenu({ name, id }: { name: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} id={id} size={28} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
        >
          <div className="border-b border-[var(--border)] px-3 py-2.5">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">{name}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            role="menuitem"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
