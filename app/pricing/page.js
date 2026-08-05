"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function PricingPage() {
  const { t } = useLanguage();
  const plans = t.pricing.plans;

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="font-mono text-xs uppercase tracking-widest text-muted">← {t.pricing.back}</Link>
        <LanguageSwitcher />
      </div>
      <h1 className="font-display font-700 text-3xl sm:text-4xl mb-3">{t.pricing.heading}</h1>
      <p className="text-muted mb-12 max-w-lg">{t.pricing.desc}</p>

      <div className="grid sm:grid-cols-3 gap-5">
        {plans.map((p, i) => (
          <div
            key={p.name}
            className={`rounded-2xl p-6 border ${i === 1 ? "border-gold bg-gold/5" : "border-line bg-panel"}`}
          >
            {i === 1 && (
              <div className="text-[11px] font-mono uppercase tracking-widest text-gold mb-3">{t.pricing.recommended}</div>
            )}
            <h3 className="font-display font-600 text-lg mb-1">{p.name}</h3>
            <div className="mb-5">
              <span className="text-3xl font-display font-700">{p.price}</span>{" "}
              <span className="text-muted text-sm">{p.period}</span>
            </div>
            <ul className="space-y-2.5 mb-7">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[#B8C0CC]">
                  <Check size={15} className="text-bull mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-3 rounded-lg font-semibold text-sm ${
                i === 1 ? "bg-gold text-ink" : "border border-line text-text"
              }`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-10 leading-relaxed max-w-lg">
        {t.pricing.clickNote}
      </p>
    </main>
  );
}
