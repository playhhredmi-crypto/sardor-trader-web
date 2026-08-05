"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "../../components/Logo";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display font-700 text-2xl mb-3">Deyarli tayyor</h1>
          <p className="text-muted mb-6 max-w-sm">
            Email manzilingizga tasdiqlash havolasi yuborildi. Uni bosib, so'ng kirishingiz mumkin.
          </p>
          <Link href="/login" className="text-gold text-sm">Kirish sahifasiga o'tish →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center mb-10">
          <Logo />
        </Link>
        <div className="bg-panel border border-line rounded-2xl p-7">
          <h1 className="font-display font-700 text-2xl mb-6">Ro'yxatdan o'tish</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted block mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-ink border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Parol (kamida 6 belgi)</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ink border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            {error && <div className="text-bear text-sm">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gold text-ink font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60"
            >
              {loading ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
            </button>
          </form>
          <p className="text-sm text-muted mt-5 text-center">
            Hisobingiz bormi? <Link href="/login" className="text-gold">Kirish</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
