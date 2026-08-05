"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "../../components/Logo";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center mb-10">
          <Logo />
        </Link>
        <div className="bg-panel border border-line rounded-2xl p-7">
          <h1 className="font-display font-700 text-2xl mb-6">Kirish</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted block mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-ink border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Parol</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ink border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            {error && <div className="text-bear text-sm">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gold text-ink font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60"
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>
          <p className="text-sm text-muted mt-5 text-center">
            Hisobingiz yo'qmi? <Link href="/signup" className="text-gold">Ro'yxatdan o'tish</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
