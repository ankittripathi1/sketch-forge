"use client";

import { ArrowRight, Mail, PenLine } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PUBLIC_API_URL } from "../../lib/api/config";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const googleUrl = `${PUBLIC_API_URL}/auth/google?next=${encodeURIComponent(next)}`;

  async function requestMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    try {
      const response = await fetch(`${PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setStatus(response.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-surface-base px-6 text-text-primary">
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-[0_2px_8px_var(--color-accent-glow)]">
            <PenLine size={15} strokeWidth={2.5} className="text-accent-text" />
          </div>
          <span
            className="text-[20px] font-bold tracking-tight text-text-heading"
            style={{ fontFamily: "Kalam, cursive" }}
          >
            sketch forge
          </span>
        </div>

        <div className="rounded-2xl border border-border-default bg-surface-raised p-5 shadow-elev-2">
          <h1 className="text-xl font-bold tracking-tight text-text-heading">
            Sign in
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            Your folders, pages, templates, and canvas saves need an account.
          </p>

          <a
            href={googleUrl}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
          >
            Continue with Google
            <ArrowRight size={15} strokeWidth={2.4} />
          </a>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border-subtle" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Or
            </span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>

          <form className="space-y-3" onSubmit={requestMagicLink}>
            <label className="block text-xs font-medium text-text-secondary">
              Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 rounded-xl border border-border-default bg-surface-overlay px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-dim focus:border-border-accent-strong"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                title="Send magic link"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-default bg-surface-overlay text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail size={16} strokeWidth={2} />
              </button>
            </div>
            {status === "sent" && (
              <p className="text-xs text-status-success">
                Check your email for a sign-in link.
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-status-danger">
                Could not send a sign-in link. Try Google sign-in.
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
