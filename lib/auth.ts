import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

export function isAdminEmail(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export function isGoogleAuthEnabled(): boolean {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim()
  );
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Rate limit simple en memoria: 5 intentos / 10 minutos por email.
// En despliegues multi-instancia se recomienda respaldar con Redis (Upstash).
const loginRateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

export function checkLoginRateLimit(email: string): { allowed: boolean } {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const entry = loginRateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    loginRateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  entry.count += 1;
  loginRateLimitMap.set(key, entry);
  return { allowed: true };
}

export function clearLoginRateLimit(email: string): void {
  loginRateLimitMap.delete(email.trim().toLowerCase());
}

const providers: Provider[] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }

      const email = parsed.data.email.toLowerCase();
      const { allowed } = checkLoginRateLimit(email);
      if (!allowed) {
        throw new Error("RATE_LIMIT");
      }

      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        return null;
      }

      const valid = await bcrypt.compare(
        parsed.data.password,
        user.passwordHash
      );
      if (!valid) {
        return null;
      }

      clearLoginRateLimit(email);

      let effectiveRole: Role = user.role;
      if (isAdminEmail(email) && user.role !== "ADMIN") {
        await db.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
        effectiveRole = "ADMIN";
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.imageUrl,
        role: effectiveRole,
      };
    },
  }),
];

if (isGoogleAuthEnabled()) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!.trim(),
      clientSecret: process.env.AUTH_GOOGLE_SECRET!.trim(),
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const email = user.email.trim().toLowerCase();
        const shouldBeAdmin = isAdminEmail(email);

        const existing = await db.user.findUnique({
          where: { email },
        });

        if (existing) {
          const nextRole: Role = shouldBeAdmin ? "ADMIN" : existing.role;
          const updated = await db.user.update({
            where: { id: existing.id },
            data: {
              role: nextRole,
              imageUrl: existing.imageUrl || user.image || null,
            },
          });
          user.id = updated.id;
          user.role = updated.role;
          user.name = updated.name;
          return true;
        }

        const created = await db.user.create({
          data: {
            email,
            name: user.name?.trim() || email.split("@")[0],
            passwordHash: "",
            imageUrl: user.image || null,
            role: shouldBeAdmin ? "ADMIN" : "USER",
          },
        });
        user.id = created.id;
        user.role = created.role;
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
      } else if (token.email && !token.id) {
        const dbUser = await db.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
  },
});
