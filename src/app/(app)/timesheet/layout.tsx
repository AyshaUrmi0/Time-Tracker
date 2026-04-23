import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Timesheet",
  description: "Your logged time entries — add, edit, and review.",
};

export default function TimesheetLayout({ children }: { children: ReactNode }) {
  return children;
}
