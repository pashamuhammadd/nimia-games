"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoadingScreen, InlineSpinner } from "./LoadingScreen";

type Phase = "checking" | "needs-login" | "linking";

/** Rendered by every protected page (Home, Orders, Partner, Account) when
 * `getCurrentUser()` finds no session yet — the docs/TELEGRAM.md §7 auth
 * bridge, end to end:
 *
 *   1. On mount, read `Telegram.WebApp.initData` (the RAW signed string
 *      — never initDataUnsafe, see webapp-auth.ts) and POST it to
 *      /api/telegram/session.
 *   2. If that Telegram account is already linked to a Nimia account,
 *      the route mints a real Supabase session server-side (via
 *      generateLink + verifyOtp — see that route's own comment) and this
 *      component just reloads the page — no password needed. This is
 *      the "log in automatically" path: it only ever runs once per
 *      account (the first-time link below), every open after that is
 *      silent.
 *   3. If not linked (or this isn't running inside Telegram at all, e.g.
 *      local dev in a plain browser tab), show a normal email/password
 *      login form that posts to /api/telegram/link — a REAL Supabase
 *      password sign-in, then links this Telegram account to whichever
 *      account just signed in.
 *
 * v1 deliberately never creates a NEW Nimia account from inside the Mini
 * App (docs/TELEGRAM.md §7's explicit decision) — someone with no
 * account yet is pointed at the website's own /register instead. */
export function TelegramLinkGate() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [firstName, setFirstName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;

    if (!initData) {
      setPhase("needs-login");
      return;
    }

    fetch("/api/telegram/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((res) => res.json())
      .then((data: { linked?: boolean; firstName?: string | null }) => {
        if (data.linked) {
          window.location.reload();
          return;
        }
        setFirstName(data.firstName ?? null);
        setPhase("needs-login");
      })
      .catch(() => setPhase("needs-login"));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPhase("linking");
    setErrorMessage(null);

    const initData = window.Telegram?.WebApp?.initData ?? "";

    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setPhase("needs-login");
        return;
      }

      window.location.reload();
    } catch {
      setErrorMessage("Network error — please try again.");
      setPhase("needs-login");
    }
  }

  if (phase === "checking") {
    return <LoadingScreen label="Connecting to your Nimia Studio account…" />;
  }

  return (
    <div className="page">
      <h1 className="greeting">{firstName ? `Hi ${firstName} 👋` : "Welcome to Nimia Studio 👋"}</h1>
      <p className="subtitle">
        Log in with your existing Nimia Studio account to link it with Telegram — every time after
        that, opening the app here logs you straight in automatically. Don&apos;t have an account
        yet?{" "}
        <a
          href="https://app.nimiastudio.com/register"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--accent)" }}
        >
          Create one on the website
        </a>{" "}
        first, then come back here.
      </p>
      <form onSubmit={handleSubmit} className="page" style={{ gap: 12 }}>
        <input
          className="text-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={phase === "linking"}
        />
        <input
          className="text-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={phase === "linking"}
        />
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <button type="submit" className="cta-button" disabled={phase === "linking"}>
          {phase === "linking" ? (
            <>
              <InlineSpinner />
              Linking…
            </>
          ) : (
            "Continue with Telegram"
          )}
        </button>
      </form>
    </div>
  );
}
