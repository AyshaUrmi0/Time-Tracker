import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Time Tracker account.",
};

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
