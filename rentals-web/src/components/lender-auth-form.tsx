"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Container, Eyebrow, Field, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Sign in, or start an account, on one screen.
 *
 * A car owner arriving from the pitch page has not decided which of the two
 * they are yet, and half of them signed up months ago and cannot remember. Two
 * separate pages makes them guess; a toggle does not.
 *
 * `embedded` drops the page chrome so the same form can sit at the foot of
 * `/rent-your-car`. That matters more than it looks: an owner who has just read
 * the pitch and is convinced should not then have to click a link and wait for
 * a page, which is where a good share of them stop.
 */
export const LenderAuthForm = ({
  initialMode,
  embedded = false,
}: {
  initialMode: "login" | "signup";
  embedded?: boolean;
}) => {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "signup" && (fullName.trim().length < 2 || phone.trim().length < 7)) {
      setError("We need your name and a phone number.");
      return;
    }
    if (!email.trim() || password.length < 8) {
      setError("Enter your email and a password of at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/lender/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? {
                mode,
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                city: city.trim() || undefined,
                password,
              }
            : { mode, email: email.trim(), password },
        ),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not work.");
        setBusy(false);
        return;
      }
      // `refresh` before `push`: the dashboard is a server component that reads
      // the session cookie, and without it the router can serve a cached
      // signed-out render of the page we are about to open.
      router.refresh();
      // Straight to the car form on signup. Somebody who has just made an
      // account to list a car should not land on an empty garage and have to
      // find the button.
      router.push(mode === "signup" ? "/lender/cars/new" : "/lender");
    } catch {
      setError("That did not work. Please try again.");
      setBusy(false);
    }
  };

  const form = (
    <>
      <div className="flex gap-2" role="tablist">
        {(["signup", "login"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            aria-selected={mode === value}
            className={cn(
              "flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150",
              mode === value
                ? "border-forest bg-forest text-paper"
                : "border-line text-ink-soft hover:border-forest/40",
            )}
          >
            {value === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" ? (
          <>
            <Field label="Your name">
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="03xx xxxxxxx"
                autoComplete="tel"
                className="tnum"
              />
            </Field>
            <Field label="City">
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Lahore"
              />
            </Field>
          </>
        ) : null}

        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </Field>

        {error ? (
          <p
            className="flex gap-2 rounded-xl border border-alert/30 bg-alert/5 p-3 text-xs text-alert"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brass px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brass-bright disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      {mode === "signup" ? (
        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          Creating an account commits you to nothing. Your car only goes on the
          website after somebody from the office has seen it and agreed a rate
          with you.
        </p>
      ) : null}
    </>
  );

  if (embedded) return form;

  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-md">
        <Eyebrow>Car owners</Eyebrow>
        <h1 className="font-display mt-2 mb-6 text-3xl font-semibold sm:text-4xl">
          {mode === "signup" ? "List your car with Musafir" : "Welcome back"}
        </h1>
        {form}
      </div>
    </Container>
  );
};
