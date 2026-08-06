"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  UploadCloud,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  RotateCcw,
  AlertTriangle,
  Target,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Newspaper,
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabaseClient";

const TIMEFRAMES = [
  { key: "M2", label: "M2", role: "entry" },
  { key: "M5", label: "M5", role: "entry" },
  { key: "M15", label: "M15", role: "confirm" },
  { key: "M30", label: "M30", role: "confirm" },
  { key: "H1", label: "H1", role: "bias" },
  { key: "H4", label: "H4", role: "bias" },
];

const MIN_CONFIDENCE = 80;

export default function Dashboard() {
  const { t, locale } = useLanguage();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === "SIGNED_IN" && session?.user) {
        applyPendingReferral(session.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const applyPendingReferral = async (userId) => {
    const code = typeof window !== "undefined" ? window.localStorage.getItem("pending_referral_code") : null;
    if (!code) return;
    const { data: myProfile } = await supabase.from("profiles").select("referred_by, referral_code").eq("id", userId).single();
    if (!myProfile || myProfile.referred_by || myProfile.referral_code === code) {
      window.localStorage.removeItem("pending_referral_code");
      return;
    }
    const { data: owner } = await supabase.from("profiles").select("id").eq("referral_code", code).single();
    if (owner && owner.id !== userId) {
      await supabase.from("profiles").update({ referred_by: owner.id }).eq("id", userId);
    }
    window.localStorage.removeItem("pending_referral_code");
  };
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const canvasRef = useRef(null);
  const imgObjRef = useRef(null);

  const entryTFKey = useMemo(() => {
    const found = TIMEFRAMES.find((tf) => images[tf.key]);
    return found ? found.key : null;
  }, [images]);

  const uploadedCount = Object.keys(images).length;

  const drawCanvas = useCallback((withAnalysis) => {
    const canvas = canvasRef.current;
    const img = imgObjRef.current;
    if (!canvas || !img || !img.complete) return;
    const maxW = 900;
    const ratio = img.naturalHeight / img.naturalWidth;
    const w = Math.min(maxW, img.naturalWidth);
    const h = w * ratio;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    if (!withAnalysis) return;

    const pctX = (v) => (v / 100) * w;
    const pctY = (v) => (v / 100) * h;
    ctx.lineWidth = 2;
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.textBaseline = "bottom";

    (withAnalysis.order_blocks || []).forEach((ob) => {
      const x1 = pctX(ob.x1), x2 = pctX(ob.x2), y1 = pctY(ob.y1), y2 = pctY(ob.y2);
      const color = ob.type === "bullish" ? "#3ECF8E" : "#F0575E";
      ctx.strokeStyle = color; ctx.fillStyle = color + "26"; ctx.setLineDash([6, 4]);
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.setLineDash([]); ctx.fillStyle = color;
      ctx.fillText(ob.label || "OB", Math.min(x1, x2) + 4, Math.min(y1, y2) - 4);
    });

    (withAnalysis.fvg || []).forEach((f) => {
      const x1 = pctX(f.x1), x2 = pctX(f.x2), y1 = pctY(f.y1), y2 = pctY(f.y2);
      const color = "#22D3EE";
      ctx.strokeStyle = color; ctx.fillStyle = color + "22"; ctx.setLineDash([]);
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.fillStyle = color;
      ctx.fillText(f.label || "FVG", Math.min(x1, x2) + 4, Math.min(y1, y2) - 4);
    });

    const amdColors = { accumulation: "#5B8DEF", manipulation: "#F0575E", distribution: "#C084FC" };
    (withAnalysis.manipulation_zones || []).forEach((mz) => {
      const x1 = pctX(mz.x1), x2 = pctX(mz.x2), y1 = pctY(mz.y1), y2 = pctY(mz.y2);
      const color = amdColors[mz.phase] || "#FF9F43";
      ctx.strokeStyle = color; ctx.fillStyle = color + "18"; ctx.setLineDash([3, 3]);
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.setLineDash([]); ctx.fillStyle = color;
      ctx.fillText(mz.label || mz.phase, Math.min(x1, x2) + 4, Math.min(y1, y2) - 4);
    });

    (withAnalysis.structure_breaks || []).forEach((sb) => {
      const x = pctX(sb.x), y = pctY(sb.y);
      ctx.strokeStyle = "#FF9F43"; ctx.fillStyle = "#FF9F43"; ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(`${sb.type}${sb.label ? " · " + sb.label : ""}`, x + 8, y - 6);
    });

    (withAnalysis.liquidity_zones || []).forEach((lz) => {
      const y = pctY(lz.y);
      ctx.strokeStyle = "#E8B33D"; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = "#E8B33D";
      ctx.fillText(lz.label || "Liquidity", 6, y - 4);
    });

    (withAnalysis.support_resistance || []).forEach((sr) => {
      const y = pctY(sr.y);
      const color = sr.type === "support" ? "#3ECF8E" : "#F0575E";
      ctx.strokeStyle = color; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(sr.label || sr.type, w - 90, y - 4);
    });

    (withAnalysis.trendlines || []).forEach((tl) => {
      ctx.strokeStyle = "#5B8DEF"; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pctX(tl.x1), pctY(tl.y1)); ctx.lineTo(pctX(tl.x2), pctY(tl.y2)); ctx.stroke();
      if (tl.label) {
        ctx.fillStyle = "#5B8DEF";
        ctx.fillText(tl.label, pctX(tl.x2) + 4, pctY(tl.y2));
      }
    });

    (withAnalysis.fibonacci || []).forEach((f) => {
      const y = pctY(f.y);
      ctx.strokeStyle = "#C084FC"; ctx.setLineDash([8, 3]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = "#C084FC";
      ctx.fillText(`${f.level}${f.label ? " · " + f.label : ""}`, w - 130, y - 4);
    });
  }, []);

  useEffect(() => {
    if (!entryTFKey || !images[entryTFKey]) return;
    const img = new Image();
    img.onload = () => { imgObjRef.current = img; drawCanvas(analysis); };
    img.src = images[entryTFKey].src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryTFKey, images]);

  useEffect(() => {
    if (imgObjRef.current) drawCanvas(analysis);
  }, [analysis, drawCanvas]);

  const handleFile = (tfKey, file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setAnalysis(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      const match = src.match(/^data:(.+);base64,(.+)$/);
      setImages((prev) => ({ ...prev, [tfKey]: { src, mediaType: match[1], base64: match[2] } }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (tfKey) => {
    setImages((prev) => { const next = { ...prev }; delete next[tfKey]; return next; });
    setAnalysis(null);
  };

  const runAnalysis = async () => {
    const uploadedTFs = TIMEFRAMES.filter((tf) => images[tf.key]).map((tf) => ({
      ...tf,
      mediaType: images[tf.key].mediaType,
      base64: images[tf.key].base64,
    }));
    if (uploadedTFs.length === 0) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeframes: uploadedTFs, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      setAnalysis(data.analysis);

      if (user && data.analysis?.signal) {
        const sig = data.analysis.signal;
        await supabase.from("signals").insert({
          user_id: user.id,
          symbol: data.analysis.symbol || "UNKNOWN",
          timeframes: uploadedTFs.map((tf) => tf.label).join(", "),
          direction: sig.direction,
          entry: sig.entry,
          stop_loss: sig.stop_loss,
          take_profit: sig.take_profit,
          risk_reward: sig.risk_reward,
          confidence: sig.confidence,
          reasoning: sig.reasoning,
        });
      }
    } catch (err) {
      setError(err.message || "Tahlil qilishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImages({}); setAnalysis(null); setError(null); setShowDetails(false);
    imgObjRef.current = null;
  };

  const trendIconFor = (tr) => (tr === "bullish" ? TrendingUp : tr === "bearish" ? TrendingDown : Activity);
  const trendColorFor = (tr) => (tr === "bullish" ? "#3ECF8E" : tr === "bearish" ? "#F0575E" : "#7C8698");

  const signal = analysis?.signal;
  const isConfidentSignal = signal && signal.direction !== "WAIT" && signal.confidence >= MIN_CONFIDENCE;
  const signalColor = signal?.direction === "BUY" ? "#3ECF8E" : signal?.direction === "SELL" ? "#F0575E" : "#7C8698";

  const detailGroups = analysis ? [
    { title: "Order Blocks", color: "#E8B33D", items: (analysis.order_blocks || []).map((o) => `${o.label || "OB"} · ${o.type}`) },
    { title: "Liquidity", color: "#E8B33D", items: (analysis.liquidity_zones || []).map((l) => l.label || "Liquidity") },
    { title: "Fair Value Gap", color: "#22D3EE", items: (analysis.fvg || []).map((f) => `${f.label || "FVG"} · ${f.type}`) },
    { title: "Bank Manipulatsiyasi", color: "#F0575E", items: (analysis.manipulation_zones || []).map((m) => `${m.phase}${m.label ? " · " + m.label : ""}`) },
    { title: "BOS / CHoCH", color: "#FF9F43", items: (analysis.structure_breaks || []).map((s) => `${s.type}${s.label ? " · " + s.label : ""}`) },
    { title: "Support / Resistance", color: "#5B8DEF", items: (analysis.support_resistance || []).map((s) => `${s.type}${s.label ? " · " + s.label : ""}`) },
    { title: "Trendlines", color: "#3ECF8E", items: (analysis.trendlines || []).map((t) => t.label || "Trendline") },
    { title: "Fibonacci", color: "#C084FC", items: (analysis.fibonacci || []).map((f) => `${f.level}${f.label ? " · " + f.label : ""}`) },
  ].filter((g) => g.items.length > 0) : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo label="Sardor Trader · Dashboard" />
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/history" className="text-sm text-muted hover:text-text">Signal tarixi</Link>
              <Link href="/referral" className="text-sm text-muted hover:text-text">Do'stlarni taklif qilish</Link>
              <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted hover:text-text">Chiqish</button>
            </>
          ) : (
            <Link href="/login" className="text-sm text-gold">Kirish (signallarni saqlash uchun)</Link>
          )}
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10 space-y-6">
        <div>
          <h1 className="font-display font-700 text-2xl mb-1.5">{t.dashboard.title}</h1>
          <p className="text-muted text-sm">{t.dashboard.desc}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {TIMEFRAMES.map((tf) => {
            const filled = images[tf.key];
            const roleColor = tf.role === "bias" ? "#5B8DEF" : tf.role === "entry" ? "#3ECF8E" : "#E8B33D";
            return (
              <div key={tf.key} className="relative">
                <label
                  htmlFor={`tf-${tf.key}`}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 cursor-pointer min-h-[92px] overflow-hidden border"
                  style={{ borderColor: filled ? roleColor : "#232935", background: filled ? `${roleColor}14` : "#12161D" }}
                >
                  {filled ? (
                    <img src={filled.src} alt={tf.label} className="w-full h-12 object-cover rounded-md" />
                  ) : (
                    <UploadCloud size={18} className="text-muted" />
                  )}
                  <div className="font-mono text-xs font-bold" style={{ color: filled ? roleColor : "#7C8698" }}>{tf.label}</div>
                  <div className="text-[9px] text-muted uppercase tracking-wide">
                    {tf.role === "bias" ? t.dashboard.roleTrend : tf.role === "entry" ? t.dashboard.roleEntry : t.dashboard.roleConfirm}
                  </div>
                </label>
                {filled && (
                  <button onClick={() => removeImage(tf.key)} className="absolute top-1 right-1 bg-ink/80 rounded-full w-5 h-5 flex items-center justify-center">
                    <X size={12} />
                  </button>
                )}
                <input id={`tf-${tf.key}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(tf.key, e.target.files?.[0])} />
              </div>
            );
          })}
        </div>

        {entryTFKey && (
          <div className="bg-panel border border-line rounded-xl p-5">
            <div className="font-mono text-xs text-muted mb-2.5">{t.dashboard.entryChart}: {entryTFKey}</div>
            <div className="relative inline-block max-w-full">
              <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg block" />
              {loading && (
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent animate-scan" />
                </div>
              )}
            </div>
            <div className="flex gap-2.5 mt-4 flex-wrap">
              <button onClick={runAnalysis} disabled={loading} className="flex items-center gap-2 px-4.5 py-2.5 rounded-lg bg-gold text-ink font-semibold text-sm disabled:opacity-60">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {loading ? t.dashboard.analyzing : `${t.dashboard.getSignal} (${uploadedCount} ${t.dashboard.chartsWord})`}
              </button>
              <button onClick={reset} className="flex items-center gap-2 px-4.5 py-2.5 rounded-lg border border-line text-muted text-sm">
                <RotateCcw size={14} /> {t.dashboard.clear}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-2.5 items-start bg-[#2A1518] border border-bear/30 rounded-lg p-4 text-bear text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {signal && (
          <div className="bg-panel border rounded-xl p-6" style={{ borderColor: signalColor + "55" }}>
            <div className="flex items-center gap-3 mb-4.5 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-extrabold text-lg tracking-wide" style={{ background: signalColor + "22", color: signalColor }}>
                <Target size={20} /> {signal.direction}
              </div>
              <div className="text-sm text-muted">{t.dashboard.confidence}: <span className="text-text font-semibold">{signal.confidence}%</span></div>
            </div>
            {signal.confidence < MIN_CONFIDENCE && (
              <div className="flex items-start gap-2 bg-[#2A1F0F] border border-gold/30 rounded-lg px-3.5 py-2.5 mb-4 text-xs text-gold/90 leading-relaxed">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Ishonch darajasi {MIN_CONFIDENCE}%dan past — bu signalni ehtiyotkorlik bilan baholang. Kuchliroq signal uchun ko'proq timeframe qo'shib ko'ring.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat label={t.dashboard.entry} value={signal.entry} />
              <Stat label={t.dashboard.stopLoss} value={signal.stop_loss} color="#F0575E" />
              <Stat label={t.dashboard.takeProfit} value={signal.take_profit} color="#3ECF8E" />
              <Stat label={t.dashboard.rr} value={signal.risk_reward} color="#E8B33D" />
            </div>
            <p className="text-sm leading-relaxed text-[#B8C0CC]">{signal.reasoning}</p>
          </div>
        )}

        {analysis?.fundamental && (
          <div className="bg-panel border border-line rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper size={16} className="text-gold" />
              <span className="font-mono text-xs uppercase tracking-wide font-semibold text-gold">Fundamental fon</span>
              <span
                className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full ml-auto"
                style={{
                  background: trendColorFor(analysis.fundamental.sentiment) + "22",
                  color: trendColorFor(analysis.fundamental.sentiment),
                }}
              >
                {analysis.fundamental.sentiment}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#B8C0CC] mb-3">{analysis.fundamental.summary}</p>
            {analysis.fundamental.key_factors?.length > 0 && (
              <ul className="space-y-1.5">
                {analysis.fundamental.key_factors.map((f, i) => (
                  <li key={i} className="text-xs text-muted flex items-start gap-1.5">
                    <span className="text-gold mt-0.5">•</span> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {analysis && (
          <div>
            <button onClick={() => setShowDetails((v) => !v)} className="flex items-center gap-1.5 text-muted text-sm py-1.5">
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showDetails ? t.dashboard.hideDetails : t.dashboard.showDetails}
            </button>
            {showDetails && (
              <div className="bg-panel border border-line rounded-xl p-5 mt-2.5">
                <div className="flex items-center gap-2.5 mb-3">
                  {React.createElement(trendIconFor(analysis.trend), { size: 20, color: trendColorFor(analysis.trend) })}
                  <span className="font-mono text-xs uppercase tracking-wide font-semibold" style={{ color: trendColorFor(analysis.trend) }}>
                    {analysis.trend === "bullish" ? t.dashboard.bullish : analysis.trend === "bearish" ? t.dashboard.bearish : t.dashboard.sideways}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-4">{analysis.summary}</p>
                {detailGroups.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {detailGroups.map((g) => (
                      <div key={g.title} className="border border-line rounded-lg p-3.5">
                        <div className="text-[11px] font-mono uppercase tracking-wide mb-2" style={{ color: g.color }}>{g.title}</div>
                        <ul className="space-y-1 text-sm">{g.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted">{t.dashboard.noExtra}</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted border-t border-line pt-4 leading-relaxed">
          {t.dashboard.disclaimer}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color = "#E7EAEE" }) {
  return (
    <div className="border border-line rounded-lg p-2.5">
      <div className="text-[10px] text-muted uppercase tracking-wide mb-1">{label}</div>
      <div className="font-mono font-bold text-[15px]" style={{ color }}>{value}</div>
    </div>
  );
}