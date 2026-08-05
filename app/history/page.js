"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X as XIcon, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Logo from "../../components/Logo";

export default function HistoryPage() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const { data } = await supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false });
      setSignals(data || []);
      setLoading(false);
    })();
  }, [user]);

  const markOutcome = async (id, outcome) => {
    setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, outcome } : s)));
    await supabase.from("signals").update({ outcome }).eq("id", id);
  };

  const stats = useMemo(() => {
    const decided = signals.filter((s) => s.outcome === "win" || s.outcome === "loss");
    const wins = decided.filter((s) => s.outcome === "win").length;
    const accuracy = decided.length > 0 ? Math.round((wins / decided.length) * 100) : null;
    return { total: signals.length, decided: decided.length, wins, accuracy };
  }, [signals]);

  if (user === undefined || loading) {
    return <main className="min-h-screen flex items-center justify-center text-muted text-sm">Yuklanmoqda...</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo label="Sardor Trader · Tarix" />
        </Link>
        <Link href="/dashboard" className="text-sm text-muted hover:text-text">Dashboard →</Link>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10 space-y-6">
        <div>
          <h1 className="font-display font-700 text-2xl mb-1.5">Signal tarixi</h1>
          <p className="text-muted text-sm">Har bir signalni real hayotda sinab, natijasini belgilang — aniqlik foizingiz shu yerda hisoblanadi.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Jami signal" value={stats.total} />
          <StatBox label="Belgilangan" value={stats.decided} />
          <StatBox label="Aniqlik" value={stats.accuracy !== null ? `${stats.accuracy}%` : "—"} highlight />
        </div>

        {signals.length === 0 ? (
          <div className="text-center text-muted text-sm py-16 border border-line rounded-xl bg-panel">
            Hali signal yo'q. <Link href="/dashboard" className="text-gold">Dashboard</Link>'da birinchisini oling.
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((s) => (
              <div key={s.id} className="border border-line rounded-xl p-4 bg-panel flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-xs w-fit"
                  style={{
                    background: (s.direction === "BUY" ? "#3ECF8E" : s.direction === "SELL" ? "#F0575E" : "#7C8698") + "22",
                    color: s.direction === "BUY" ? "#3ECF8E" : s.direction === "SELL" ? "#F0575E" : "#7C8698",
                  }}
                >
                  {s.direction === "BUY" ? <TrendingUp size={13} /> : s.direction === "SELL" ? <TrendingDown size={13} /> : <Clock size={13} />}
                  {s.direction}
                </div>
                <div className="flex-1 text-sm text-muted min-w-0">
                  <span className="text-text">{s.symbol}</span> · Entry {s.entry} · SL {s.stop_loss} · TP {s.take_profit} · {s.risk_reward}
                  <div className="text-xs mt-0.5">{new Date(s.created_at).toLocaleString("uz-UZ")} · {s.timeframes}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.outcome === "pending" || !s.outcome ? (
                    <>
                      <button onClick={() => markOutcome(s.id, "win")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-bull/40 text-bull">
                        <Check size={12} /> Yutdi
                      </button>
                      <button onClick={() => markOutcome(s.id, "loss")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-bear/40 text-bear">
                        <XIcon size={12} /> Yutqazdi
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${s.outcome === "win" ? "text-bull bg-bull/10" : "text-bear bg-bear/10"}`}>
                      {s.outcome === "win" ? "✓ Yutdi" : "✗ Yutqazdi"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatBox({ label, value, highlight }) {
  return (
    <div className={`border rounded-xl p-4 text-center ${highlight ? "border-gold bg-gold/5" : "border-line bg-panel"}`}>
      <div className="text-2xl font-display font-700" style={{ color: highlight ? "#E8B33D" : "#E7EAEE" }}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
