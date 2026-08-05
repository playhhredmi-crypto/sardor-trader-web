"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, Users } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Logo from "../../components/Logo";

export default function ReferralPage() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [referredCount, setReferredCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      if (!data.user) router.push("/login");
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!p) {
        const code = user.id.replace(/-/g, "").slice(0, 8);
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({ id: user.id, referral_code: code })
          .select()
          .single();
        p = inserted;
      }
      setProfile(p);
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", user.id);
      setReferredCount(count || 0);
    })();
  }, [user]);

  if (user === undefined || !profile) {
    return <main className="min-h-screen flex items-center justify-center text-muted text-sm">Yuklanmoqda...</main>;
  }

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${profile.referral_code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo label="Sardor Trader · Referral" />
        </Link>
        <Link href="/dashboard" className="text-sm text-muted hover:text-text">Dashboard →</Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-14">
        <h1 className="font-display font-700 text-2xl mb-2">Do'stlaringizni taklif qiling</h1>
        <p className="text-muted text-sm mb-10">
          Shaxsiy havolangiz orqali ro'yxatdan o'tganlar sizning hisobingizga bog'lanadi.
        </p>

        <div className="bg-panel border border-line rounded-2xl p-6 mb-6">
          <div className="text-xs text-muted uppercase tracking-wide mb-2 font-mono">Sizning havolangiz</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-ink border border-line rounded-lg px-3.5 py-2.5 text-sm font-mono truncate">
              {link}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 bg-gold text-ink font-semibold px-4 py-2.5 rounded-lg text-sm"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Nusxalandi" : "Nusxalash"}
            </button>
          </div>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <div className="text-3xl font-display font-700">{referredCount}</div>
            <div className="text-sm text-muted">havolangiz orqali ro'yxatdan o'tgan kishi</div>
          </div>
        </div>

        <p className="text-xs text-muted mt-8 leading-relaxed">
          Hozircha bu son shaxsiy hisobot sifatida ko'rsatiladi. Chegirma/bonus qoidalari (masalan, har 5 taklif uchun 1 oy bepul)
          to'lov tizimi (Click) ulanganda avtomatlashtiriladi.
        </p>
      </main>
    </div>
  );
}