import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MEMBER";
      timezone: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "MEMBER";
    timezone: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "ADMIN" | "MEMBER";
    timezone?: string;
  }
}
