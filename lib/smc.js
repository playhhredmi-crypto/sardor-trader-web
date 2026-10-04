// XAUUSD uchun qoidaga asoslangan (rule-based) texnik tahlil:
// Market Structure (BOS/CHoCH), Order Block, Fair Value Gap, klassik
// Support/Resistance, hajm (tick-volume), trend filtri (EMA/RSI),
// likvidlik tutish (stop-hunt), savdo sessiyasi va retest tasdig'i.
//
// MUHIM: bu haqiqiy order-flow/footprint EMAS — oddiy OHLC (shamlar)
// ma'lumotiga asoslangan qoidaviy tahlil. Forex/CFD'da haqiqiy birja
// hajmi bo'lmagani uchun "volume" — Twelve Data bergan tick-count,
// ya'ni narx necha marta yangilangani, haqiqiy savdo hajmi emas.

const SWING_LOOKBACK = 2; // har tomonda nechta sham solishtirilsin (pivot)

// --- 1) Swing high/low'larni topish ---------------------------------------
export function findSwings(candles, lookback = SWING_LOOKBACK) {
  const swings = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    let isHigh = true;
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }
    if (isHigh) swings.push({ index: i, price: c.high, type: "high" });
    if (isLow) swings.push({ index: i, price: c.low, type: "low" });
  }
  return swings.sort((a, b) => a.index - b.index);
}

// --- 2) Market Structure: BOS / CHoCH --------------------------------------
export function detectStructure(candles, swings) {
  const events = [];
  let bias = "neutral";
  let lastHigh = null; // { index, price }
  let lastLow = null;

  for (const s of swings) {
    if (s.type === "high") {
      if (lastHigh) {
        if (s.price > lastHigh.price && bias !== "bearish") bias = "bullish";
        else if (s.price > lastHigh.price && bias === "bearish") {
          events.push({ index: s.index, type: "CHoCH", direction: "bullish", price: s.price });
          bias = "bullish";
        }
      }
      lastHigh = { index: s.index, price: s.price };
    } else {
      if (lastLow) {
        if (s.price < lastLow.price && bias !== "bullish") bias = "bearish";
        else if (s.price < lastLow.price && bias === "bullish") {
          events.push({ index: s.index, type: "CHoCH", direction: "bearish", price: s.price });
          bias = "bearish";
        }
      }
      lastLow = { index: s.index, price: s.price };
    }
  }

  // Shamlar narxi oxirgi muhim swingdan o'tsa (yopilish narxi bilan) — BOS deb belgilaymiz
  const closeNow = candles[candles.length - 1].close;
  if (lastHigh && closeNow > lastHigh.price) {
    events.push({ index: candles.length - 1, type: "BOS", direction: "bullish", price: lastHigh.price });
  }
  if (lastLow && closeNow < lastLow.price) {
    events.push({ index: candles.length - 1, type: "BOS", direction: "bearish", price: lastLow.price });
  }

  return { bias, events, lastHigh, lastLow };
}

// --- 3) Order Block: impulsiv harakatdan oldingi qarama-qarshi sham --------
export function detectOrderBlocks(candles, structureEvents, maxZones = 3) {
  const zones = [];
  const bosEvents = structureEvents.filter((e) => e.type === "BOS" || e.type === "CHoCH");

  for (const ev of bosEvents) {
    const breakoutIdx = ev.index;
    // breakoutIdx'dan orqaga qarab, harakat yo'nalishiga TESKARI so'nggi shamni topamiz
    for (let i = Math.max(0, breakoutIdx - 15); i < breakoutIdx; i++) {
      const c = candles[i];
      const isBearishCandle = c.close < c.open;
      const isBullishCandle = c.close > c.open;
      if (ev.direction === "bullish" && isBearishCandle) {
        zones.push({
          type: "bullish",
          top: c.high,
          bottom: c.low,
          index: i,
          sourceEvent: ev.type,
          mitigated: candles.slice(i + 1).some((k) => k.low <= c.high && k.low >= c.low),
        });
      }
      if (ev.direction === "bearish" && isBullishCandle) {
        zones.push({
          type: "bearish",
          top: c.high,
          bottom: c.low,
          index: i,
          sourceEvent: ev.type,
          mitigated: candles.slice(i + 1).some((k) => k.high >= c.low && k.high <= c.high),
        });
      }
    }
  }

  // eng yangilaridan boshlab, mitigatsiya bo'lmaganlarini ustun qo'yamiz
  const unique = [];
  const seen = new Set();
  for (const z of zones.slice().reverse()) {
    const key = `${z.type}:${z.top.toFixed(2)}:${z.bottom.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(z);
    if (unique.length >= maxZones * 2) break;
  }
  return unique.sort((a, b) => (a.mitigated === b.mitigated ? 0 : a.mitigated ? 1 : -1)).slice(0, maxZones);
}

// --- 4) Fair Value Gap (3 shamli narx bo'shlig'i) ---------------------------
export function detectFVG(candles, maxZones = 3) {
  const gaps = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const next = candles[i + 1];
    if (prev.high < next.low) {
      gaps.push({
        type: "bullish",
        top: next.low,
        bottom: prev.high,
        index: i,
        mitigated: candles.slice(i + 1).some((k) => k.low <= next.low),
      });
    } else if (prev.low > next.high) {
      gaps.push({
        type: "bearish",
        top: prev.low,
        bottom: next.high,
        index: i,
        mitigated: candles.slice(i + 1).some((k) => k.high >= next.high),
      });
    }
  }
  return gaps
    .slice()
    .reverse()
    .sort((a, b) => (a.mitigated === b.mitigated ? 0 : a.mitigated ? 1 : -1))
    .slice(0, maxZones);
}

// --- 5) Klassik Support/Resistance: takrorlangan swing darajalari ----------
export function detectSR(candles, swings, tolerancePct = 0.0015, minTouches = 2) {
  const levels = [];
  for (const s of swings) {
    let found = levels.find((l) => Math.abs(l.price - s.price) / s.price < tolerancePct);
    if (found) {
      found.touches += 1;
      found.price = (found.price + s.price) / 2;
    } else {
      levels.push({ price: s.price, type: s.type === "high" ? "resistance" : "support", touches: 1 });
    }
  }
  return levels.filter((l) => l.touches >= minTouches).sort((a, b) => b.touches - a.touches);
}

// --- 6) Hajm (tick-volume) signali ------------------------------------------
export function detectVolumeSignal(candles, lookback = 20, multiplier = 1.8) {
  if (candles.every((c) => !c.volume)) {
    return { available: false, spikes: [] };
  }
  const spikes = [];
  for (let i = lookback; i < candles.length; i++) {
    const window = candles.slice(i - lookback, i);
    const avg = window.reduce((s, c) => s + c.volume, 0) / window.length;
    const c = candles[i];
    if (avg > 0 && c.volume > avg * multiplier) {
      spikes.push({ index: i, volume: c.volume, avg, direction: c.close >= c.open ? "bullish" : "bearish" });
    }
  }
  return { available: true, spikes: spikes.slice(-5) };
}

// --- 7) EMA (eksponensial o'rtacha) -----------------------------------------
export function calcEMA(candles, period) {
  if (!candles || candles.length < period) return null;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

// --- 8) RSI (Relative Strength Index, Wilder usuli) -------------------------
export function calcRSI(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// --- 9) ATR (Average True Range) — volatillikka mos SL/TP uchun ------------
export function calcATR(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    trs.push(tr);
  }
  const recent = trs.slice(-period);
  return recent.reduce((s, v) => s + v, 0) / recent.length;
}

// --- 10) Likvidlik tutish (stop-hunt): BOS/CHoCH'dan oldin oldingi
// swing darajasi "tutib" (wick bilan) keyin teskari tomonga yopilgan bo'lsa —
// bu klassik SMC'dagi kuchli tasdiq hisoblanadi (real pul institutlari
// likvidlikni yig'ib olib keyin haqiqiy yo'nalishga ketadi).
export function detectLiquiditySweep(candles, swings, structureEvents) {
  const bosEvents = structureEvents.filter((e) => e.type === "BOS" || e.type === "CHoCH");
  if (bosEvents.length === 0) return false;
  const lastEv = bosEvents[bosEvents.length - 1];
  const idx = lastEv.index;
  const windowStart = Math.max(0, idx - 8);
  const priorSwings = swings.filter((s) => s.index < idx && s.index >= windowStart);
  if (priorSwings.length === 0) return false;

  for (let i = windowStart; i < idx; i++) {
    const c = candles[i];
    for (const s of priorSwings) {
      if (lastEv.direction === "bullish" && s.type === "low" && c.low < s.price && c.close > s.price) {
        return true; // pastki likvidlikni "tutib" keyin yuqoriga yopilgan — stop-hunt
      }
      if (lastEv.direction === "bearish" && s.type === "high" && c.high > s.price && c.close < s.price) {
        return true; // yuqori likvidlikni "tutib" keyin pastga yopilgan
      }
    }
  }
  return false;
}

// --- 11) Savdo sessiyasi (London/Nyu-York vaqtida bozor faolroq) -----------
// Twelve Data'dan UTC vaqt bilan so'ralgan shamlar asosida ishlaydi.
export function getTradingSession(isoTime) {
  if (!isoTime) return { label: "noma'lum", active: true };
  const normalized = isoTime.includes("T") ? isoTime : isoTime.replace(" ", "T") + "Z";
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return { label: "noma'lum", active: true };
  const hour = d.getUTCHours();
  if (hour >= 7 && hour < 12) return { label: "London sessiyasi", active: true };
  if (hour >= 12 && hour < 16) return { label: "London + Nyu-York (eng faol)", active: true };
  if (hour >= 16 && hour < 21) return { label: "Nyu-York sessiyasi", active: true };
  return { label: "Osiyo/tinch soatlar", active: false };
}

// --- 12) Retest tasdig'i: narx zonaga qaytib kirib, rad etish (wick bilan)
// ko'rsatganmi — shunchaki "yaqin" bo'lishdan ko'ra ishonchliroq signal.
export function detectRetest(recentCandles, zone, type, lookback = 6) {
  if (!recentCandles || !zone) return false;
  const recent = recentCandles.slice(-lookback);
  for (const c of recent) {
    if (type === "bullish") {
      const touchedZone = c.low <= zone.top && c.high >= zone.bottom;
      if (touchedZone && c.close > zone.top) return true;
    } else {
      const touchedZone = c.high >= zone.bottom && c.low <= zone.top;
      if (touchedZone && c.close < zone.bottom) return true;
    }
  }
  return false;
}

// --- Bitta timeframe uchun to'liq tahlil ------------------------------------
export function analyzeTimeframe(candles) {
  const swings = findSwings(candles);
  const structure = detectStructure(candles, swings);
  const orderBlocks = detectOrderBlocks(candles, structure.events);
  const fvg = detectFVG(candles);
  const sr = detectSR(candles, swings);
  const volume = detectVolumeSignal(candles);
  const last = candles[candles.length - 1];

  const indicators = {
    ema20: calcEMA(candles, 20),
    ema50: calcEMA(candles, 50),
    rsi: calcRSI(candles, 14),
    atr: calcATR(candles, 14),
  };
  const liquiditySweep = detectLiquiditySweep(candles, swings, structure.events);
  const session = getTradingSession(last.time);
  const recentCandles = candles.slice(-8).map((c) => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  return {
    lastClose: last.close,
    lastTime: last.time,
    bias: structure.bias,
    structureEvents: structure.events.slice(-5),
    orderBlocks,
    fvg,
    sr: sr.slice(0, 5),
    volume,
    indicators,
    liquiditySweep,
    session,
    recentCandles,
  };
}

// --- Uch timeframe'ni birlashtirib yakuniy signal chiqarish -----------------
// Tasdiqlovchi omillar: H1 trend, M15 struktura, OB/FVG zonasi, M5 tasdiq,
// hajm, EMA50 trend filtri, RSI haddan tashqari xarid/sotish filtri,
// likvidlik tutish (stop-hunt), savdo sessiyasi va retest tasdig'i.
export function combineSignal({ m5, m15, h1 }) {
  const price = m5.lastClose;
  const biasH1 = h1.bias;
  const biasM15 = m15.bias;
  const confluences = [];
  let confidence = 0;
  let direction = "WAIT";

  if (biasH1 === "neutral") {
    return {
      direction: "WAIT",
      confidence: 0,
      reasoning: "H1 trendida hali aniq yo'nalish shakllanmagan — kutish tavsiya etiladi.",
      entry: null,
      stop_loss: null,
      take_profit: null,
    };
  }

  const wantType = biasH1; // 'bullish' | 'bearish'

  confluences.push(`H1 trend: ${biasH1 === "bullish" ? "ko'tarilish" : "pasayish"}`);
  confidence += 20;

  if (biasM15 === biasH1) {
    confluences.push(`M15 strukturasi H1 bilan mos (${biasM15})`);
    confidence += 15;
  }

  // M15'dagi eng yaqin mitigatsiya bo'lmagan OB/FVG zonasi, H1 bias bilan bir xil turda
  const zoneCandidates = [
    ...m15.orderBlocks.filter((z) => z.type === wantType && !z.mitigated).map((z) => ({ ...z, kind: "Order Block" })),
    ...m15.fvg.filter((z) => z.type === wantType && !z.mitigated).map((z) => ({ ...z, kind: "FVG" })),
  ];
  const nearZone = zoneCandidates
    .map((z) => ({ ...z, dist: Math.min(Math.abs(price - z.top), Math.abs(price - z.bottom)) }))
    .sort((a, b) => a.dist - b.dist)[0];

  if (nearZone) {
    confluences.push(`M15 ${nearZone.kind} zonasi (${nearZone.bottom.toFixed(2)}-${nearZone.top.toFixed(2)}) ga yaqin`);
    confidence += 15;
  }

  // M5'da H1 bias yo'nalishida yaqinda BOS/CHoCH bo'lganmi (tasdiq)
  const m5Confirm = m5.structureEvents.some((e) => e.direction === wantType);
  if (m5Confirm) {
    confluences.push(`M5'da ${wantType === "bullish" ? "ko'tarilish" : "pasayish"} tasdiqlovchi struktura buzilishi (BOS/CHoCH)`);
    confidence += 15;
  }

  // Hajm signali
  const volSpike = m5.volume.available && m5.volume.spikes.some((s) => s.direction === wantType);
  if (volSpike) {
    confluences.push("So'nggi shamlarda yo'nalish bilan mos hajm sakrashi (taxminiy, tick-count)");
    confidence += 10;
  }

  // Trend filtri: narx M15 EMA50'dan to'g'ri tomondami
  const ema50 = m15.indicators?.ema50;
  if (ema50 != null) {
    const aligned = wantType === "bullish" ? price > ema50 : price < ema50;
    if (aligned) {
      confluences.push(`Narx M15 EMA50 (${ema50.toFixed(2)}) dan ${wantType === "bullish" ? "yuqorida" : "pastda"} — trend mos`);
      confidence += 15;
    } else {
      confluences.push("Diqqat: narx M15 EMA50'ga qarshi tomonda — trend hali to'liq mos emas");
      confidence -= 10;
    }
  }

  // RSI filtri: haddan tashqari xarid/sotish holatida yangi signalga ehtiyot
  const rsi = m15.indicators?.rsi;
  if (rsi != null) {
    if (wantType === "bullish" && rsi > 75) {
      confluences.push(`RSI ${rsi.toFixed(0)} — haddan tashqari xarid qilingan, ehtiyot bo'ling`);
      confidence -= 10;
    } else if (wantType === "bearish" && rsi < 25) {
      confluences.push(`RSI ${rsi.toFixed(0)} — haddan tashqari sotilgan, ehtiyot bo'ling`);
      confidence -= 10;
    } else {
      confidence += 5;
    }
  }

  // Likvidlik tutish (stop-hunt) — kuchli SMC tasdig'i
  if (m15.liquiditySweep) {
    confluences.push("M15'da likvidlik tutish (stop-hunt) aniqlandi — kuchli SMC tasdig'i");
    confidence += 15;
  }

  // Savdo sessiyasi filtri
  const session = m15.session;
  if (session) {
    if (session.active) {
      confluences.push(`Savdo sessiyasi: ${session.label}`);
      confidence += 10;
    } else {
      confluences.push(`Savdo sessiyasi: ${session.label} — hajm past, ehtiyot bo'ling`);
      confidence -= 10;
    }
  }

  // Retest tasdig'i: narx zonaga qaytib kirib rad etganmi
  let retestOk = false;
  if (nearZone && Array.isArray(m15.recentCandles)) {
    retestOk = detectRetest(m15.recentCandles, nearZone, wantType);
    if (retestOk) {
      confluences.push("Zonaga qaytib kelib rad etish (retest) tasdiqlandi");
      confidence += 15;
    }
  }

  confidence = Math.max(0, Math.min(confidence, 100));

  if (confidence >= 55 && nearZone) {
    direction = wantType === "bullish" ? "BUY" : "SELL";
  }

  let stopLoss = null;
  let takeProfit = null;
  if (direction !== "WAIT" && nearZone) {
    const atr = m15.indicators?.atr;
    const zoneHeight = nearZone.top - nearZone.bottom;
    const buffer = atr ? Math.max(atr * 0.5, zoneHeight * 0.3) : zoneHeight * 0.3 || price * 0.0015;
    if (direction === "BUY") {
      stopLoss = nearZone.bottom - buffer;
      const risk = price - stopLoss;
      takeProfit = price + risk * 2;
    } else {
      stopLoss = nearZone.top + buffer;
      const risk = stopLoss - price;
      takeProfit = price - risk * 2;
    }
  }

  return {
    direction,
    confidence: Math.round(confidence),
    reasoning: confluences.join(". ") + ".",
    entry: direction !== "WAIT" ? price : null,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    retestConfirmed: retestOk,
  };
}
