import { NextResponse } from "next/server";

const FULL_SCHEMA = `{
  "symbol": "string (grafikda ko'ringan instrument nomi, masalan XAUUSD, EURUSD, BTCUSD — aniqlay olmasangiz 'UNKNOWN')",
  "trend": "bullish" | "bearish" | "sideways",
  "summary": "2-3 gapdan iborat qisqacha o'zbek tilidagi tahlil",
  "timeframe_bias": [ { "timeframe": "string (masalan H4)", "bias": "bullish" | "bearish" | "neutral", "note": "qisqa izoh" } ],
  "signal": { "direction": "BUY" | "SELL" | "WAIT", "entry": "string", "stop_loss": "string", "take_profit": "string", "risk_reward": "string masalan 1:2", "confidence": number (0-100), "reasoning": "nega bu signal berilgani, qaysi strategiya(lar) va timeframelar tasdiqlagani" },
  "order_blocks": [ { "x1": number, "y1": number, "x2": number, "y2": number, "type": "bullish" | "bearish", "label": "string" } ],
  "liquidity_zones": [ { "y": number, "label": "string" } ],
  "fvg": [ { "x1": number, "y1": number, "x2": number, "y2": number, "type": "bullish" | "bearish", "label": "string" } ],
  "manipulation_zones": [ { "x1": number, "y1": number, "x2": number, "y2": number, "phase": "accumulation" | "manipulation" | "distribution", "label": "string" } ],
  "structure_breaks": [ { "x": number, "y": number, "type": "BOS" | "CHoCH", "label": "string" } ],
  "support_resistance": [ { "y": number, "type": "support" | "resistance", "label": "string" } ],
  "trendlines": [ { "x1": number, "y1": number, "x2": number, "y2": number, "label": "string" } ],
  "fibonacci": [ { "y": number, "level": "string", "label": "string" } ]
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

    const { timeframes } = await req.json();
    if (!Array.isArray(timeframes) || timeframes.length === 0) {
      return NextResponse.json({ error: "Kamida bitta grafik kerak." }, { status: 400 });
    }

    const content = [
      {
        type: "text",
        text: `Sen professional scalping trading tahlilchisisan. Foydalanuvchi SCALPING bilan shug'ullanadi. Quyida bir nechta timeframedagi grafiklar berilgan: ${timeframes.map((t) => t.label).join(", ")}.

Qoida: H1/H4 kabi yuqori timeframelar faqat umumiy TREND/BIAS uchun ishlatiladi. M2/M5 kabi past timeframelar aniq KIRISH NUQTASI (entry trigger) uchun ishlatiladi. M15/M30 oraliq tasdiqlash uchun.

Tahlil jarayonida QUYIDAGI STRATEGIYALARNING HAMMASINI fonda tekshirib chiq: SMC (Order Block, Liquidity), FVG (Fair Value Gap), Bank Manipulatsiyasi (AMD), BOS/CHoCH (market structure), Support/Resistance, Trendline, Fibonacci. Lekin o'zing tanla — faqat shu grafikda HAQIQATAN mavjud va signalga ta'sir qiladigan narsalarni qaytar. Ahamiyatsizlarini bo'sh massiv ("[]") qoldir.

Natija TOZA, aniq bitta savdo signali bo'lsin: signal.reasoning ichida faqat 1-3 ta asosiy dalilni qisqa ayt.

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
      text: `Chizilgan annotatsiyalar faqat ENG PAST timeframe grafigi (${timeframes[0].label}) uchun, uning piksel foizida (0-100, chapdan o'ngga x, yuqoridan pastga y) hisoblansin. Faqat quyidagi JSON formatida javob ber, hech qanday qo'shimcha matn yoki markdown belgisisiz:\n\n${FULL_SCHEMA}`,
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
        max_tokens: 2200,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Anthropic API xatolik: ${response.status} ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "AI javobi bo'sh keldi." }, { status: 502 });
    }

    if (data.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "AI javobi juda uzun bo'lib, kesilib qoldi. Iltimos, kamroq timeframe bilan yoki qayta urinib ko'ring." },
        { status: 502 }
      );
    }

    let clean = textBlock.text.replace(/```json|```/g, "").trim();
    // Ba'zida model qatorlar oxirida ortiqcha vergul qoldiradi — shularni tozalaymiz
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
