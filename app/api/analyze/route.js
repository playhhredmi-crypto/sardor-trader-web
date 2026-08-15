import { NextResponse } from "next/server";

// Har bir strategiya kaliti va uning JSON javobdagi mos maydoni + AI uchun tavsifi
const STRATEGY_MAP = {
  smc: {
    label: "SMC / Order Block",
    field: "order_blocks",
    desc: "SMC (Smart Money Concepts) — Order Block va Liquidity zonalarini aniqla",
  },
  fvg: {
    label: "FVG",
    field: "fvg",
    desc: "FVG (Fair Value Gap) — narx tezligida qoldirilgan bo'shliqlarni aniqla",
  },
  amd: {
    label: "Bank Manipulatsiyasi (AMD)",
    field: "manipulation_zones",
    desc: "AMD (Accumulation-Manipulation-Distribution) — bank manipulatsiyasi fazalarini aniqla",
  },
  bos: {
    label: "BOS / CHoCH",
    field: "structure_breaks",
    desc: "BOS/CHoCH — tuzilma buzilishi (structure break) nuqtalarini aniqla",
  },
  trendline: {
    label: "Klassika — Trendline",
    field: "trendlines",
    desc: "Klassik texnik tahlil: Trendlinelarni chiz va aniqla",
  },
  sr: {
    label: "Klassika — Support/Resistance",
    field: "support_resistance",
    desc: "Klassik texnik tahlil: Support va Resistance darajalarini aniqla",
  },
  fibonacci: {
    label: "Fibonacci",
    field: "fibonacci",
    desc: "Fibonacci retracement darajalarini aniqla",
  },
  volume: {
    label: "Volume",
    field: "volume_analysis",
    desc: "Savdo hajmi (Volume) — agar grafikda volume paneli/ustunlari ko'rinib tursa, hajm oshyaptimi yoki pasayyaptimi, so'nggi harakatlar hajm bilan tasdiqlanyaptimi yoki yo'qligini aniqla",
  },
};

const FULL_SCHEMA = `{
  "symbol": "string (grafikda ko'ringan instrument nomi, masalan XAUUSD, EURUSD, BTCUSD — aniqlay olmasangiz 'UNKNOWN')",
  "trend": "bullish" | "bearish" | "sideways",
  "summary": "2-3 gapdan iborat qisqacha o'zbek tilidagi tahlil",
  "fundamental": { "sentiment": "bullish" | "bearish" | "neutral", "summary": "qidiruv natijalariga asoslangan 1-2 gaplik o'zbek tilidagi xulosa", "key_factors": [ "string — masalan 'FOMC foiz stavkasi qarori ertaga'" ] },
  "timeframe_bias": [ { "timeframe": "string (masalan H4)", "bias": "bullish" | "bearish" | "neutral", "note": "qisqa izoh" } ],
  "signal": { "direction": "BUY" | "SELL" | "WAIT", "entry": "string", "stop_loss": "string", "take_profit": "string", "risk_reward": "string masalan 1:2", "confidence": number (0-100), "reasoning": "nega bu signal berilgani — tanlangan strategiyalarga asoslanib qisqa aytib o'tish kerak" },
  "order_blocks": [ { "x1": number, "y1": number, "x2": number, "y2": number, "type": "bullish" | "bearish", "label": "string" } ],
  "liquidity_zones": [ { "y": number, "label": "string" } ],
  "fvg": [ { "x1": number, "y1": number, "x2": number, "y2": number, "type": "bullish" | "bearish", "label": "string" } ],
  "manipulation_zones": [ { "x1": number, "y1": number, "x2": number, "y2": number, "phase": "accumulation" | "manipulation" | "distribution", "label": "string" } ],
  "structure_breaks": [ { "x": number, "y": number, "type": "BOS" | "CHoCH", "label": "string" } ],
  "support_resistance": [ { "y": number, "type": "support" | "resistance", "label": "string" } ],
  "trendlines": [ { "x1": number, "y1": number, "x2": number, "y2": number, "label": "string" } ],
  "fibonacci": [ { "y": number, "level": "string", "label": "string" } ],
  "volume_analysis": { "trend": "increasing" | "decreasing" | "neutral", "confirms_price": boolean, "note": "string — hajm haqida qisqa izoh, agar grafikda volume ko'rinmasa 'grafikda volume paneli topilmadi' deb yoz" }
}`;

export async function POST(req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server sozlanmagan: ANTHROPIC_API_KEY topilmadi." },
        { status: 500 }
      );
    }

    const { timeframes, strategies } = await req.json();
    if (!Array.isArray(timeframes) || timeframes.length === 0) {
      return NextResponse.json({ error: "Kamida bitta grafik kerak." }, { status: 400 });
    }

    const selectedKeys =
      Array.isArray(strategies) && strategies.length > 0
        ? strategies.filter((k) => STRATEGY_MAP[k])
        : Object.keys(STRATEGY_MAP);

    if (selectedKeys.length === 0) {
      return NextResponse.json({ error: "Kamida bitta strategiya tanlang." }, { status: 400 });
    }

    const selectedStrategies = selectedKeys.map((k) => STRATEGY_MAP[k]);
    const strategyListText = selectedStrategies.map((s) => `- ${s.desc}`).join("\n");
    const strategyLabelsText = selectedStrategies.map((s) => s.label).join(", ");

    const unusedFields = Object.entries(STRATEGY_MAP)
      .filter(([key]) => !selectedKeys.includes(key))
      .map(([, s]) => s.field);

    const content = [
      {
        type: "text",
        text: `Sen professional trading tahlilchisisan va HAM texnik, HAM fundamental tahlilni birlashtirib ishlaysan. Foydalanuvchi SCALPING bilan shug'ullanadi. Quyida bir nechta timeframedagi grafiklar berilgan: ${timeframes.map((t) => t.label).join(", ")}.

QADAM 1 — FUNDAMENTAL TAHLIL: Avval grafikdagi instrumentni (symbol) aniqla. Keyin web_search vositasi orqali shu instrument bo'yicha ENG SO'NGGI yangiliklar, bozor kayfiyati va yaqin kunlardagi muhim iqtisodiy voqealarni (masalan FOMC, CPI, NFP, foiz stavkasi qarorlari, markaziy bank bayonotlari) qidir. Bir nechta qidiruv so'rovi yubor (masalan "XAUUSD news today", "Fed interest rate decision this week", instrumentga oid boshqa dolzarb mavzular).

QADAM 2 — TEXNIK TAHLIL: H1/H4 kabi yuqori timeframelar TREND/BIAS uchun, M2/M5 aniq KIRISH NUQTASI uchun, M15/M30 tasdiqlash uchun ishlatiladi. Foydalanuvchi FAQAT quyidagi strategiya(lar)ni tanlagan — TEKSHIRISHNI FAQAT SHULAR BILAN CHEKLA, boshqa strategiyalarga umuman e'tibor berma:
${strategyListText}

Faqat haqiqatan mavjud va signalga ta'sir qiladigan elementlarni qaytar; agar tanlangan strategiya grafikda aniq ko'rinmasa, tegishli massivni bo'sh ("[]") qoldir. Agar "volume_analysis" so'ralgan bo'lsa-yu, grafikda volume paneli ko'rinmasa, buni note'da aniq ayt va trend'ni "neutral" qoldir.

QADAM 3 — BIRLASHTIRISH: Fundamental va texnik tahlilni solishtir.
- Ikkalasi BIR XIL yo'nalishni ko'rsatsa (masalan texnik bullish + yangiliklar ham dollar zaiflashuvini ko'rsatsa) — bu signalni kuchaytiradi.
- Ikkalasi ZID bo'lsa (masalan texnik bullish, lekin bugun muhim foiz stavkasi qarori kutilmoqda va katta volatillik xavfi bor) — buni reasoning'da aniq ogohlantir va confidence'ni pasaytir, yoki "WAIT" ber.
- Agar qidiruv hech qanday muhim narsa topmasa, fundamental.sentiment = "neutral" va shunday deb yoz.

Natija TOZA, aniq bitta savdo signali bo'lsin: signal.reasoning ichida texnik VA fundamental asosiy dalillarni jami 2-4 ta gapda qisqa ayt, va tahlil qaysi strategiya(lar) (${strategyLabelsText}) asosida qilinganini aniq aytib o't.

MUHIM — ISHONCH DARAJASINI TO'G'RI BAHOLASH:
- Agar faqat 1 ta timeframe yuklangan bo'lsa, confidence'ni 55% dan OSHIRMA.
- Agar 2+ timeframe bir-biriga zid bo'lsa, albatta "WAIT" qaytar.
- Yaqin soatlarda katta fundamental voqea (masalan foiz stavkasi qarori) bo'lsa, buni alohida ogohlantir va confidence'ni pasaytir — bunday paytda bozor kutilmagan tarzda harakatlanishi mumkin.
- Tanlangan strategiya(lar) o'zaro mos kelsa VA fundamental ham qo'llab-quvvatlasa, confidence 70% dan yuqori bo'lishi mumkin — sen FAQAT tanlangan strategiya(lar) asosida baholayapsan, boshqa mos kelmagan strategiyalar yo'qligi confidence'ni pasaytirishga sabab BO'LMASLIGI kerak.
- Signal berishdan ko'ra "WAIT" berish har doim xavfsizroq — noaniq holatda ikkilanmasdan WAIT tanla.
- Hech qachon ishonchni sun'iy ravishda oshirma.

Barcha timeframelar mos kelsa (confluence) kuchli signal ber, mos kelmasa "WAIT" deb sababini qisqa ayt.`,
      },
    ];

    timeframes.forEach((tf) => {
      content.push({
        type: "text",
        text: `--- ${tf.label} grafigi (${tf.role === "bias" ? "trend/bias uchun" : tf.role === "entry" ? "aniq entry uchun" : "tasdiqlash uchun"}) ---`,
      });
      content.push({
        type: "image",
        source: { type: "base64", media_type: tf.mediaType, data: tf.base64 },
      });
    });

    content.push({
      type: "text",
      text: `Chizilgan annotatsiyalar faqat ENG PAST timeframe grafigi (${timeframes[0].label}) uchun, uning piksel foizida (0-100, chapdan o'ngga x, yuqoridan pastga y) hisoblansin. Quyidagi maydonlarni HAR DOIM bo'sh massiv ("[]") qoldir, chunki foydalanuvchi bu strategiyalarni tanlamagan: ${unusedFields.length > 0 ? unusedFields.join(", ") : "(barchasi tanlangan)"}\n\nFaqat quyidagi JSON formatida javob ber, hech qanday qo'shimcha matn yoki markdown belgisisiz:\n\n${FULL_SCHEMA}`,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Anthropic API xatolik: ${response.status} ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text");
    if (textBlocks.length === 0) {
      return NextResponse.json({ error: "AI javobi bo'sh keldi." }, { status: 502 });
    }
    const textBlock = textBlocks[textBlocks.length - 1];

    if (data.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "AI javobi juda uzun bo'lib, kesilib qoldi. Iltimos, kamroq timeframe bilan yoki qayta urinib ko'ring." },
        { status: 502 }
      );
    }

    let clean = textBlock.text.replace(/```json|```/g, "").trim();
    clean = clean.replace(/,(\s*[}\]])/g, "$1");

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      return NextResponse.json(
        { error: "AI javobini o'qib bo'lmadi (noto'g'ri format). Iltimos, qayta urinib ko'ring." },
        { status: 502 }
      );
    }

    return NextResponse.json({ analysis: parsed });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Kutilmagan xatolik" }, { status: 500 });
  }
}