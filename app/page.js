"use client";

import Link from "next/link";
import {
  Layers,
  Boxes,
  Landmark,
  Waypoints,
  Minus,
  GitBranch,
  Percent,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Logo from "../components/Logo";

const STRATEGY_META = [
  { icon: Layers, color: "#E8B33D" },
  { icon: Boxes, color: "#22D3EE" },
  { icon: Landmark, color: "#F0575E" },
  { icon: Waypoints, color: "#FF9F43" },
  { icon: Minus, color: "#5B8DEF" },
  { icon: GitBranch, color: "#3ECF8E" },
  { icon: Percent, color: "#C084FC" },
];

const STRATEGY_LABELS = {
  uz: [
    { label: "Order Block", sub: "SMC" },
    { label: "Fair Value Gap", sub: "FVG" },
    { label: "Bank Manipulatsiyasi", sub: "AMD" },
    { label: "Structure Break", sub: "BOS / CHoCH" },
    { label: "Support / Resistance", sub: "S/R" },
    { label: "Trendline", sub: "Trend" },
    { label: "Fibonacci", sub: "Retracement" },
  ],
  ru: [
    { label: "Order Block", sub: "SMC" },
    { label: "Fair Value Gap", sub: "FVG" },
    { label: "Банковская манипуляция", sub: "AMD" },
    { label: "Слом структуры", sub: "BOS / CHoCH" },
    { label: "Поддержка / Сопротивление", sub: "S/R" },
    { label: "Трендлиния", sub: "Trend" },
    { label: "Фибоначчи", sub: "Retracement" },
  ],
  en: [
    { label: "Order Block", sub: "SMC" },
    { label: "Fair Value Gap", sub: "FVG" },
    { label: "Bank Manipulation", sub: "AMD" },
    { label: "Structure Break", sub: "BOS / CHoCH" },
    { label: "Support / Resistance", sub: "S/R" },
    { label: "Trendline", sub: "Trend" },
    { label: "Fibonacci", sub: "Retracement" },
  ],
};

const CANDLES = [
  { h: 28, c: "bull" }, { h: 44, c: "bear" }, { h: 20, c: "bull" }, { h: 60, c: "bull" },
  { h: 36, c: "bear" }, { h: 52, c: "bear" }, { h: 24, c: "bull" }, { h: 40, c: "bull" },
  { h: 68, c: "bull" }, { h: 30, c: "bear" }, { h: 46, c: "bear" }, { h: 22, c: "bull" },
];

export default function LandingPage() {
  const { locale, t } = useLanguage();
  const strategies = STRATEGY_LABELS[locale].map((s, i) => ({ ...s, ...STRATEGY_META[i] }));

  return (
    <main>
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <a href="#strategiyalar" className="text-muted hover:text-text transition-colors hidden sm:block">{t.nav.strategies}</a>
          <Link href="/pricing" className="text-muted hover:text-text transition-colors hidden sm:block">{t.nav.pricing}</Link>
          <LanguageSwitcher />
          <Link
            href="/dashboard"
            className="bg-gold text-ink font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all"
          >
            {t.nav.login}
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-line">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 relative z-10">
          <div className="inline-flex items-center gap-2 border border-line rounded-full px-3 py-1 text-xs text-muted font-mono mb-8">
            <Zap size={12} className="text-gold" />
            {t.hero.badge}
          </div>
          <h1 className="font-display font-700 text-4xl sm:text-6xl leading-[1.05] max-w-3xl mb-6">
            {t.hero.titlePre}
            <span className="text-gold">{t.hero.titleHighlight}</span>
          </h1>
          <p className="text-muted text-lg max-w-xl mb-10 leading-relaxed">
            {t.hero.desc}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-gold text-ink font-semibold px-6 py-3.5 rounded-xl hover:brightness-110 transition-all"
            >
              {t.hero.ctaTry} <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-line px-6 py-3.5 rounded-xl text-text hover:border-muted transition-colors"
            >
              {t.hero.ctaPricing}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 flex items-end gap-2 px-6 opacity-70 pointer-events-none">
          {CANDLES.map((c, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-sm animate-drift ${c.c === "bull" ? "bg-bull/25" : "bg-bear/25"}`}
              style={{ height: `${c.h}%`, animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
        <div className="absolute bottom-40 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </section>

      <div className="border-b border-line bg-panel overflow-hidden py-3">
        <div className="flex gap-10 animate-[marquee_28s_linear_infinite] whitespace-nowrap w-max">
          {[...strategies, ...strategies].map((s, i) => (
            <span key={i} className="font-mono text-xs uppercase tracking-wider text-muted flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.sub} · {s.label}
            </span>
          ))}
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-6 py-24 border-b border-line">
        <h2 className="font-display font-600 text-2xl sm:text-3xl mb-14">{t.steps.heading}</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {t.steps.items.map((s) => (
            <div key={s.n} className="border border-line rounded-2xl p-6 bg-panel">
              <div className="font-mono text-gold/60 text-sm mb-4">{s.n}</div>
              <h3 className="font-display font-600 text-lg mb-2">{s.t}</h3>
              <p className="text-muted text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="strategiyalar" className="max-w-6xl mx-auto px-6 py-24 border-b border-line">
        <h2 className="font-display font-600 text-2xl sm:text-3xl mb-3">{t.strategiesSection.heading}</h2>
        <p className="text-muted mb-14 max-w-xl">{t.strategiesSection.desc}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="border border-line rounded-xl p-5 bg-panel flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + "1A", color: s.color }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-muted text-xs font-mono uppercase tracking-wide mt-0.5">{s.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display font-600 text-3xl sm:text-4xl mb-4">{t.cta.heading}</h2>
        <p className="text-muted mb-10 max-w-lg mx-auto">{t.cta.desc}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gold text-ink font-semibold px-8 py-4 rounded-xl hover:brightness-110 transition-all"
        >
          {t.cta.button} <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="border-t border-line py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <span>© {new Date().getFullYear()} Sardor Trader. {t.footer.rights}</span>
          <span>{t.footer.disclaimer}</span>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  );
}
