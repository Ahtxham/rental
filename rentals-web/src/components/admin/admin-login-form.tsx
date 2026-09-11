"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field, Input } from "@/components/ui";

export const AdminLoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not work.");
        setBusy(false);
        return;
      }
      router.push("/admin");
      // The layout above reads the session on the server, so the new cookie
      // only takes effect once the tree is re-fetched.
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-deep px-5 py-12">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-7"
      >
        <p className="font-display text-2xl font-semibold text-ink">Musafir</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
          Office
        </p>

        <h1 className="font-display mt-6 text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          For people who work here. Car owners sign in on their own page.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
        </div>

        {error ? (
          <p
            className="mt-4 flex gap-2 rounded-xl border border-alert/30 bg-alert/5 p-3 text-xs text-alert"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-night px-6 py-3 text-sm font-semibold text-paper transition-colors duration-150 hover:bg-action-deep disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Sign in
        </button>
      </form>
    </div>
  );
};
