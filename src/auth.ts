import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "@/features/auth/auth.schema";
import { authService } from "@/server/services/auth.service";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: SEVEN_DAYS, updateAge: 60 * 60 * 24 },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await authService.verifyCredentials(
          parsed.data.email,
          parsed.data.password,
        );
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          timezone: user.timezone,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id as string;
        token.role = (user as { role: "ADMIN" | "MEMBER" }).role;
        token.timezone = (user as { timezone: string }).timezone;
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.timezone) token.timezone = session.timezone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user = {
          ...session.user,
          id: token.userId as string,
          role: token.role as "ADMIN" | "MEMBER",
          timezone: token.timezone as string,
        };
      }
      return session;
    },
  },
});
