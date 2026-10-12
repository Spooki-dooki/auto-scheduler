import { redirect } from "next/navigation";

import { Button, buttonClass, inputClass } from "@/components/ui";
import { auth, signIn } from "@/lib/auth";
import { APP_NAME } from "@/lib/copy";

const emailEnabled = Boolean(process.env.AUTH_RESEND_KEY);

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

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
      <p className="t-heading text-text">{APP_NAME}</p>
      <h1 className="mt-10 t-title text-text">Sign in</h1>
      <p className="mt-3 t-body text-soft">
        Signing in with Google also connects the calendar the planner writes to. One step, not
        two.
      </p>

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
            <label htmlFor="email" className="sr-only">
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
            Email sign-in gets you an account, but scheduling needs a calendar. You&apos;ll be
            asked to connect Google afterwards.
          </p>
        </>
      ) : null}
    </main>
  );
}
