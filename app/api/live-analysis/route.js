import { NextResponse } from "next/server";
import { fetchMultiTimeframe } from "../../../lib/twelveData";
import { analyzeTimeframe, combineSignal } from "../../../lib/smc";

// Vercel'da bu route har so'rovda ishga tushsin (statik keshlanmasin) —
// o'ziga xos keshlashni lib/twelveData.js ichida qisqa muddat qilamiz.
export const dynamic = "force-dynamic";

const ALL_STRATEGIES = ["structure", "ob", "fvg", "sr", "volume", "vp"];

// Foydalanuvchi o'chirib qo'ygan strategiyalarning zonalari/signallarini
// natijadan olib tashlaydi — shunda ham grafikda ko'rinmaydi, ham yakuniy
// signal hisob-kitobiga ta'sir qilmaydi.
function filterStrategies(tf, enabled) {
  return {
    ...tf,
    structureEvents: enabled.has("structure") ? tf.structureEvents : [],
    orderBlocks: enabled.has("ob") ? tf.orderBlocks : [],
    fvg: enabled.has("fvg") ? tf.fvg : [],
    sr: enabled.has("sr") ? tf.sr : [],
    volume: enabled.has("volume") ? tf.volume : { available: false, spikes: [] },
    volumeProfile: enabled.has("vp") ? tf.volumeProfile : null,
    cumulativeDelta: enabled.has("vp") ? tf.cumulativeDelta : null,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("strategies");
    const enabled = new Set(raw ? raw.split(",").filter(Boolean) : ALL_STRATEGIES);

    const { m5, m15, h1 } = await fetchMultiTimeframe();

    const m5a = filterStrategies(analyzeTimeframe(m5), enabled);
    const m15a = filterStrategies(analyzeTimeframe(m15), enabled);
    const h1a = filterStrategies(analyzeTimeframe(h1), enabled);

    const signal = combineSignal({ m5: m5a, m15: m15a, h1: h1a });

    return NextResponse.json({
      symbol: "XAUUSD",
      updated: new Date().toISOString(),
      enabledStrategies: Array.from(enabled),
      timeframes: { m5: m5a, m15: m15a, h1: h1a },
      candles: { m15 }, // grafik chizish uchun xom shamlar (M15)
      signal,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Noma'lum xato" }, { status: 500 });
  }
}
