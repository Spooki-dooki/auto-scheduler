import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { encryptedPrismaAdapter } from "@/lib/adapter";
import { prisma } from "@/lib/db";
import { seedDefaultProfiles } from "@/lib/profiles";

/**
 * Read-only access is needed for free/busy lookups; events access is needed to
 * write the blocks back. Requesting both keeps the consent screen honest
 * without asking for full calendar ownership.
 */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const providers: NextAuthConfig["providers"] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: {
      params: {
        scope: GOOGLE_SCOPES,
        // Required to receive a refresh token, which the scheduler needs to
        // keep working while the user is not on the site.
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      },
    },
    allowDangerousEmailAccountLinking: true,
  }),
];

// Email sign-in is optional: without a Resend key the app offers Google only.
if (process.env.AUTH_RESEND_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "login@example.com",
    }),
  );
}

export const authConfig: NextAuthConfig = {
  adapter: encryptedPrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) await seedDefaultProfiles(user.id);
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/** Throws if there is no session — for use inside API route handlers. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}
