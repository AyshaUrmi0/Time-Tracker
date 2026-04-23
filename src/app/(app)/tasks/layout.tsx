import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Create and manage tasks to track time against.",
};

export default function TasksLayout({ children }: { children: ReactNode }) {
  return children;
}
