// Twelve Data API orqali XAUUSD candle (shamlar) ma'lumotini olish.
// Bepul reja: kuniga ~800 so'rov, daqiqasiga 8 ta — shuning uchun server tomonida
// qisqa muddatli kesh (CACHE_MS) ishlatamiz, har foydalanuvchi sahifani
// yangilaganida yangi so'rov yubormasligi uchun.

const BASE_URL = "https://api.twelvedata.com/time_series";
const SYMBOL = "XAU/USD";

// interval -> necha soniya keshlab turish kerak (shu interval candle yopilish
// vaqtidan tezroq so'ramaslik uchun, bepul limitni tejash maqsadida)
const CACHE_MS = {
  "5min": 30_000,
  "15min": 60_000,
  "1h": 120_000,
};

const cache = new Map(); // key -> { ts, data }

async function fetchInterval(interval, outputsize = 120) {
  const key = `${interval}:${outputsize}`;
  const cached = cache.get(key);
  const ttl = CACHE_MS[interval] || 60_000;
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data;
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY sozlanmagan (.env.local ga qo'shing)");
  }

  const url = `${BASE_URL}?symbol=${encodeURIComponent(SYMBOL)}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  if (json.status === "error" || json.code) {
    throw new Error(`Twelve Data xatosi (${interval}): ${json.message || "noma'lum xato"}`);
  }
  if (!Array.isArray(json.values)) {
    throw new Error(`Twelve Data: ${interval} uchun candle topilmadi`);
  }

  // Twelve Data eng yangi shamni birinchi qatorda beradi — eskidan yangiga qarab tartiblaymiz
  const candles = json.values
    .map((v) => ({
      time: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      // ba'zi forex/metall juftliklarida hajm kelmaydi — 0 bo'lsa ham xato bermaymiz
      volume: Number(v.volume || 0),
    }))
    .reverse();

  cache.set(key, { ts: Date.now(), data: candles });
  return candles;
}

// XAUUSD uchun M5, M15, H1 shamlarini birga oladi.
export async function fetchMultiTimeframe() {
  const [m5, m15, h1] = await Promise.all([
    fetchInterval("5min", 150),
    fetchInterval("15min", 150),
    fetchInterval("1h", 150),
  ]);
  return { m5, m15, h1 };
}
