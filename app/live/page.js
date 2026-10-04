"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Boxes, Layers, Waypoints, BarChart3, Activity, Clock, Zap, CheckCircle2 } from "lucide-react";
import Logo from "../../components/Logo";

const REFRESH_MS = 45_000;

// Qaysi strategiyalarni yoqib/o'chirish mumkin — har biri API'ga ?strategies=...
// query orqali yuboriladi va shunga qarab zonalar ham, signal hisob-kitobi ham o'zgaradi
const STRATEGY_TOGGLES = [
  { key: "structure", label: "Struktura (BOS/CHoCH)", icon: Waypoints, color: "#FF9F43" },
  { key: "ob", label: "Order Block", icon: Layers, color: "#E8B33D" },
  { key: "fvg", label: "FVG", icon: Boxes, color: "#22D3EE" },
  { key: "sr", label: "Support/Resistance", icon: Minus, color: "#5B8DEF" },
  { key: "volume", label: "Hajm (Volume)", icon: BarChart3, color: "#F0B93D" },
];

const biasLabel = (b) => (b === "bullish" ? "Ko'tarilish" : b === "bearish" ? "Pasayish" : "Noaniq");
const biasColor = (b) => (b === "bullish" ? "text-bull" : b === "bearish" ? "text-bear" : "text-muted");

function StrategyToggles({ enabled, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STRATEGY_TOGGLES.map(({ key, label, icon: Icon, color }) => {
        const isOn = enabled.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isOn ? "border-line bg-panel text-text" : "border-line/50 bg-transparent text-muted opacity-50"
            }`}
            style={isOn ? { boxShadow: `inset 0 0 0 1px ${color}55` } : undefined}
            title={isOn ? `${label} — yoqilgan, o'chirish uchun bosing` : `${label} — o'chirilgan, yoqish uchun bosing`}
          >
            <Icon size={13} style={{ color: isOn ? color : undefined }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Yangi tasdiqlovchi omillarni (trend/RSI, likvidlik tutish, sessiya, retest)
// kichik belgi (badge) sifatida ko'rsatadi — foydalanuvchi signal nega
// shunday chiqqanini bir qarashda tushunishi uchun.
function ConfirmationBadges({ m15, signal }) {
  if (!m15) return null;
  const ema50 = m15.indicators?.ema50;
  const rsi = m15.indicators?.rsi;
  const trendOk =
    ema50 != null && m15.lastClose != null
      ? (m15.bias === "bullish" && m15.lastClose > ema50) || (m15.bias === "bearish" && m15.lastClose < ema50)
      : null;

  const badges = [
    {
      key: "trend",
      icon: Activity,
      label: trendOk === null ? "Trend (EMA50)" : trendOk ? "Trend mos (EMA50)" : "Trendga qarshi",
      ok: trendOk,
    },
    {
      key: "rsi",
      icon: Activity,
      label: rsi != null ? `RSI ${rsi.toFixed(0)}` : "RSI",
      ok: rsi != null ? rsi > 25 && rsi < 75 : null,
    },
    {
      key: "liquidity",
      icon: Zap,
      label: m15.liquiditySweep ? "Likvidlik tutish topildi" : "Likvidlik tutish yo'q",
      ok: m15.liquiditySweep,
    },
    {
      key: "session",
      icon: Clock,
      label: m15.session?.label || "Sessiya",
      ok: m15.session?.active,
    },
    {
      key: "retest",
      icon: CheckCircle2,
      label: signal?.retestConfirmed ? "Retest tasdiqlandi" : "Retest kutilmoqda",
      ok: signal?.retestConfirmed,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map(({ key, icon: Icon, label, ok }) => (
        <span
          key={key}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
            ok === true
              ? "border-bull/40 bg-bull/10 text-bull"
              : ok === false
              ? "border-bear/40 bg-bear/10 text-bear"
              : "border-line bg-ink text-muted"
          }`}
        >
          <Icon size={12} />
          {label}
        </span>
      ))}
    </div>
  );
}

function BiasPill({ tf, bias }) {
  const Icon = bias === "bullish" ? TrendingUp : bias === "bearish" ? TrendingDown : Minus;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
      <span className="font-mono text-xs text-muted">{tf}</span>
      <Icon size={14} className={biasColor(bias)} />
      <span className={`text-sm font-medium ${biasColor(bias)}`}>{biasLabel(bias)}</span>
    </div>
  );
}

// M15 shamlari + OB/FVG zonalarini chizadigan oddiy canvas grafik
function LiveChart({ candles, orderBlocks, fvg, sr }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const visible = candles.slice(-80);
    const highs = visible.map((c) => c.high);
    const lows = visible.map((c) => c.low);
    const maxP = Math.max(...highs);
    const minP = Math.min(...lows);
    const pad = (maxP - minP) * 0.08 || 1;
    const top = maxP + pad;
    const bottom = minP - pad;
    const PAD_R = 60;
    const chartW = W - PAD_R;

    const yOf = (p) => H - ((p - bottom) / (top - bottom)) * H;
    const xStep = chartW / visible.length;
    const xOf = (i) => i * xStep + xStep / 2;

    // grid
    ctx.strokeStyle = "#232935";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      const price = bottom + (top - bottom) * (1 - i / 4);
      ctx.fillStyle = "#7C8698";
      ctx.font = "10px monospace";
      ctx.fillText(price.toFixed(2), chartW + 4, y + 3);
    }

    const firstIdx = candles.length - visible.length;

    // S/R darajalari
    (sr || []).forEach((lvl) => {
      const y = yOf(lvl.price);
      ctx.strokeStyle = lvl.type === "resistance" ? "#F0575E55" : "#3ECF8E55";
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // FVG zonalari
    (fvg || []).forEach((z) => {
      const xi = Math.max(0, z.index - firstIdx);
      const x = xOf(xi);
      ctx.fillStyle = z.type === "bullish" ? "#22D3EE22" : "#22D3EE15";
      ctx.fillRect(x, yOf(z.top), chartW - x, yOf(z.bottom) - yOf(z.top));
    });

    // Order Block zonalari
    (orderBlocks || []).forEach((z) => {
      const xi = Math.max(0, z.index - firstIdx);
      const x = xOf(xi);
      ctx.fillStyle = z.type === "bullish" ? "#3ECF8E2A" : "#F0575E2A";
      ctx.fillRect(x, yOf(z.top), chartW - x, yOf(z.bottom) - yOf(z.top));
      ctx.strokeStyle = z.type === "bullish" ? "#3ECF8E88" : "#F0575E88";
      ctx.strokeRect(x, yOf(z.top), chartW - x, yOf(z.bottom) - yOf(z.top));
    });

    // shamlar
    visible.forEach((c, i) => {
      const x = xOf(i);
      const isUp = c.close >= c.open;
      ctx.strokeStyle = isUp ? "#3ECF8E" : "#F0575E";
      ctx.fillStyle = isUp ? "#3ECF8E" : "#F0575E";
      ctx.beginPath();
      ctx.moveTo(x, yOf(c.high));
      ctx.lineTo(x, yOf(c.low));
      ctx.stroke();
      const bodyTop = yOf(Math.max(c.open, c.close));
      const bodyH = Math.max(1, Math.abs(yOf(c.open) - yOf(c.close)));
      ctx.fillRect(x - xStep * 0.3, bodyTop, xStep * 0.6, bodyH);
    });

    // joriy narx chizig'i
    const last = candles[candles.length - 1];
    const y = yOf(last.close);
    ctx.strokeStyle = "#E8B33D";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#E8B33D";
    ctx.font = "bold 11px monospace";
    ctx.fillText(last.close.toFixed(2), chartW + 4, y - 4 < 10 ? 14 : y - 4);
  }, [candles, orderBlocks, fvg, sr]);

  return <canvas ref={canvasRef} width={900} height={420} className="w-full h-[420px] rounded-xl bg-ink border border-line" />;
}

export default function LivePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(new Set(STRATEGY_TOGGLES.map((s) => s.key)));
  const timerRef = useRef(null);

  const load = useCallback(async (enabledSet) => {
    try {
      const qs = Array.from(enabledSet).join(",");
      const res = await fetch(`/api/live-analysis?strategies=${encodeURIComponent(qs)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xato");
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(enabled);
    timerRef.current = setInterval(() => load(enabled), REFRESH_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const toggleStrategy = (key) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // kamida bittasi yoqilgan turishi kerak
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const sig = data?.signal;
  const dirColor = sig?.direction === "BUY" ? "text-bull" : sig?.direction === "SELL" ? "text-bear" : "text-muted";

  return (
    <div className="min-h-screen bg-ink text-text font-body">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-muted font-mono flex items-center gap-1.5">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              yangilandi: {new Date(data.updated).toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">XAUUSD — Real vaqtli SMC tahlil</h1>
          <p className="text-muted text-sm mt-1">
            M5 / M15 / H1 bo'yicha Market Structure, Order Block, FVG, klassik S/R va hajm (tick-volume) tahlili — har {REFRESH_MS / 1000}
            soniyada avtomatik yangilanadi. Signal aniqligi uchun EMA/RSI trend filtri, likvidlik tutish (stop-hunt), savdo sessiyasi va
            retest tasdig'i ham hisobga olinadi.
          </p>
        </div>

        <div>
          <div className="text-xs text-muted mb-2">Strategiyalar — bosib yoqing/o'chiring:</div>
          <StrategyToggles enabled={enabled} onToggle={toggleStrategy} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-bear/40 bg-bear/10 px-4 py-3 text-sm text-bear">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <BiasPill tf="H1 (trend)" bias={data.timeframes.h1.bias} />
              <BiasPill tf="M15 (zona)" bias={data.timeframes.m15.bias} />
              <BiasPill tf="M5 (kirish)" bias={data.timeframes.m5.bias} />
              <div className="ml-auto font-mono text-xl">
                {data.timeframes.m5.lastClose.toFixed(2)} <span className="text-muted text-sm">USD</span>
              </div>
            </div>

            <LiveChart
              candles={data.candles.m15}
              orderBlocks={data.timeframes.m15.orderBlocks}
              fvg={data.timeframes.m15.fvg}
              sr={data.timeframes.m15.sr}
            />

            <div className="rounded-xl border border-line bg-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold">Signal</h2>
                <span className={`font-mono text-lg font-bold ${dirColor}`}>
                  {sig.direction}
                  {sig.direction !== "WAIT" && <span className="text-sm text-muted ml-2">ishonch: {sig.confidence}%</span>}
                </span>
              </div>
              <p className="text-sm text-text/90 leading-relaxed">{sig.reasoning}</p>
              <div className="mt-3">
                <ConfirmationBadges m15={data.timeframes.m15} signal={sig} />
              </div>
              {sig.direction !== "WAIT" && (
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div className="rounded-lg bg-ink border border-line px-3 py-2">
                    <div className="text-muted text-xs">Kirish</div>
                    <div className="font-mono">{sig.entry?.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-ink border border-line px-3 py-2">
                    <div className="text-muted text-xs">Stop Loss</div>
                    <div className="font-mono text-bear">{sig.stop_loss?.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-ink border border-line px-3 py-2">
                    <div className="text-muted text-xs">Take Profit</div>
                    <div className="font-mono text-bull">{sig.take_profit?.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-muted leading-relaxed border-t border-line pt-4 space-y-1">
              <p>
                ⚠️ Bu moliyaviy maslahat emas. Signal qoidaga asoslangan avtomatik tahlil natijasi, kafolat emas — har doim o'z risk
                boshqaruvingizni (SL, pozitsiya hajmi) qo'llang.
              </p>
              <p>
                "Hajm" ko'rsatkichi forex/CFD bozorida haqiqiy birja savdo hajmi emas, balki narx yangilanishlar soni (tick-count) —
                taxminiy ko'rsatkich sifatida qaraladi.
              </p>
            </div>
          </>
        )}

        {!data && loading && <div className="text-muted text-sm">Yuklanmoqda...</div>}
      </main>
    </div>
  );
}
