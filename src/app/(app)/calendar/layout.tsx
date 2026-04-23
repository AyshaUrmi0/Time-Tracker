import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Week view of your tracked time, grouped by day.",
};

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return children;
}
