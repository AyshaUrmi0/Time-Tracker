import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Reports",
  description: "Totals by day, task, or user over any date range.",
};

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return children;
}
