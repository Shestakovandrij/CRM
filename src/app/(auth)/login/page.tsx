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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        {/* Logo mark */}
        <div className="mb-8 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              boxShadow: "0 0 48px rgba(56,189,248,0.5)",
            }}
          >
            C
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Ласкаво просимо</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Увійдіть у свій акаунт</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: "rgba(10, 10, 18, 0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              placeholder="Admin"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              boxShadow: "0 0 28px rgba(56,189,248,0.5)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 48px rgba(56,189,248,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 28px rgba(56,189,248,0.5)")}
          >
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>
      </div>
    </div>
  );
}
