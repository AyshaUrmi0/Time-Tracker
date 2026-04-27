import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 lg:px-16">
        <div className="flex items-center justify-between">
          <BrandLockup />
        </div>
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>

      <aside
        className="relative hidden overflow-hidden lg:block"
        style={{
          background:
            "linear-gradient(135deg, #312e81 0%, #4f46e5 45%, #6366f1 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 40% at 70% 30%, rgba(255,255,255,0.14), transparent 70%), radial-gradient(50% 40% at 20% 80%, rgba(129,140,248,0.22), transparent 70%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <span className="text-[13px] font-medium tracking-tight text-white/80">
              Time Tracker
            </span>
          </div>

          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Built for focus
            </p>
            <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight">
              Track the hours that matter.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/70">
              A quiet, keyboard-first timer with the reports you actually need —
              no screenshots, no micromanagement.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
