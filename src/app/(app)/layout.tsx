import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import AppearanceSync from "@/components/AppearanceSync";
import AppNav from "@/components/AppNav";
import { buttonClass } from "@/components/ui";
import { auth, signOut } from "@/lib/auth";
import { APP_NAME } from "@/lib/copy";
import { prisma } from "@/lib/db";
import { normalizeAppearance } from "@/lib/theme/appearance";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appearance: true },
  });

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const signOutButton = (
    <form action={signOutAction}>
      <button type="submit" className={buttonClass("text", "-mr-3 lg:mr-0 lg:-ml-3")}>
        <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
        Sign out
      </button>
    </form>
  );

  return (
    <div className="min-h-screen lg:flex">
      <AppNav appName={APP_NAME} signOut={signOutButton} />
      <main className="mx-auto w-full max-w-5xl px-gutter pb-32 pt-6 lg:px-10 lg:pb-16 lg:pt-10">
        {children}
      </main>
      <AppearanceSync
        appearance={user?.appearance ? normalizeAppearance(user.appearance) : null}
      />
    </div>
  );
}
