import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";

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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Signing in with Google also connects the calendar the scheduler writes
        to — one step, not two.
      </p>

      <form action={signInWithGoogle} className="mt-8">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Continue with Google
        </button>
      </form>

      {emailEnabled ? (
        <>
          <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-widest text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form action={signInWithEmail} className="space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder="you@school.edu"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Email me a link
            </button>
          </form>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Email sign-in gets you an account, but scheduling needs a calendar —
            you will be asked to connect Google afterwards.
          </p>
        </>
      ) : null}
    </main>
  );
}
