import "./globals.css";
import { LanguageProvider } from "../lib/LanguageContext";
import ReferralCapture from "../components/ReferralCapture";

export const metadata = {
  title: "Sardor Trader — AI Scalping Signal Engine",
  description:
    "Ko'p timeframeli AI tahlil: SMC, FVG, Bank Manipulatsiyasi, BOS/CHoCH, Support/Resistance, Trend va Fibonacci asosida toza scalping signallari.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  themeColor: "#0B0E14",
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