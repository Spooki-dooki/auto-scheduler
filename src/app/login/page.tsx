import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AlertCircle } from "lucide-react";

import { Button, Notice, buttonClass, inputClass } from "@/components/ui";
import { auth, signIn } from "@/lib/auth";
import { APP_NAME } from "@/lib/copy";

const emailEnabled = Boolean(process.env.AUTH_RESEND_KEY);

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  // Auth.js sends people back here with ?error= when sign-in didn't finish
  // (they cancelled at Google, or the link expired).
  const { error } = await searchParams;

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  async function signInWithEmail(formData: FormData) {
    "use server";
    await signIn("resend", {
      email: String(formData.get("email") ?? ""),
      redirectTo: "/dashboard",
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-gutter py-16">
      <Link href="/" className="-ml-1 inline-flex min-h-touch items-center self-start rounded-control px-1 t-heading text-text">
        {APP_NAME}
      </Link>
      <h1 className="mt-8 t-title text-text">Sign in</h1>
      <p className="mt-3 t-body text-soft">
        Signing in with Google also connects your calendar, so your plan works around your
        classes and events. One step, not two.
      </p>
      <p className="mt-3 t-small text-soft">
        It only adds and moves its own blocks. It never changes or deletes your events.
      </p>

      {error ? (
        <div className="mt-6">
          <Notice tone="error" icon={<AlertCircle className="size-4" />}>
            Sign-in didn&apos;t finish, so nothing changed. Try again.
          </Notice>
        </div>
      ) : null}

      <form action={signInWithGoogle} className="mt-8">
        <Button type="submit" className="w-full">
          Continue with Google
        </Button>
      </form>

      {emailEnabled ? (
        <>
          <div className="my-6 flex items-center gap-4 t-label text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <form action={signInWithEmail} className="space-y-3">
            <label htmlFor="email" className="mb-2 block t-small text-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@school.edu"
              className={inputClass}
            />
            <button type="submit" className={buttonClass("secondary", "w-full")}>
              Email me a link
            </button>
          </form>
          <p className="mt-3 t-small text-soft">
            With email, your tasks are planned into your own hours. You can connect a calendar
            later so it avoids your classes and events.
          </p>
        </>
      ) : null}
    </main>
  );
}
