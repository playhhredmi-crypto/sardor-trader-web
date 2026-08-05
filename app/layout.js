import "./globals.css";
import { LanguageProvider } from "../lib/LanguageContext";
import ReferralCapture from "../components/ReferralCapture";

export const metadata = {
  title: "Sardor Trader — AI Scalping Signal Engine",
  description:
    "Ko'p timeframeli AI tahlil: SMC, FVG, Bank Manipulatsiyasi, BOS/CHoCH, Support/Resistance, Trend va Fibonacci asosida toza scalping signallari.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body className="font-body bg-ink text-text antialiased">
        <ReferralCapture />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}