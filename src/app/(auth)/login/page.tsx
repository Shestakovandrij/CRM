"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Невірний email або пароль");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--text)]">CRM</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Увійдіть у свій акаунт</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Admin"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>
      </div>
    </div>
  );
}
