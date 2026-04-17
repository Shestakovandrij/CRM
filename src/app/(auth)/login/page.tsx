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

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      setError("Невірний email або пароль");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-5"
            style={{
              background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
              boxShadow: "0 0 48px rgba(79,142,247,0.55)",
            }}
          >
            C
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Ласкаво просимо</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1.5">Увійдіть у свій CRM акаунт</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: "rgba(13, 16, 32, 0.80)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {[
            { id: "email", label: "Email", type: "text", value: email, onChange: setEmail, placeholder: "Admin" },
            { id: "pass", label: "Пароль", type: "password", value: password, onChange: setPassword, placeholder: "••••••••" },
          ].map((f) => (
            <div key={f.id} className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {f.label}
              </label>
              <input
                type={f.type}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                required
                autoFocus={f.id === "email"}
                placeholder={f.placeholder}
                className="w-full px-4 py-3 rounded-xl text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] outline-none transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(79,142,247,0.6)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-[var(--danger)] bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #4f8ef7, #3b7de8)",
              boxShadow: "0 0 28px rgba(79,142,247,0.5)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 44px rgba(79,142,247,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 28px rgba(79,142,247,0.5)")}
          >
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>
      </div>
    </div>
  );
}
