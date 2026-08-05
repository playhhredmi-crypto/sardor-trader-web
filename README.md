# Sardor Trader — o'rnatish va joylashtirish

Bu M EDU loyihangizga o'xshab xuddi shunday tartibda ishlaydi: VS Code → GitHub → Vercel.

## 1. Fayllarni joylashtirish

1. Yuklab olingan `sardor-trader-web` papkasini Desktop'ga (yoki xohlagan joyga) joylang.
   Masalan: `C:\Users\Shacsim_Systems\Desktop\sardor-trader-web`
2. VS Code'ni oching → `File > Open Folder` → shu papkani tanlang.

## 2. Kerakli dasturlarni o'rnatish (terminal orqali)

VS Code ichida terminalni oching (`Terminal > New Terminal`), so'ng yozing:

```
npm install
```

Bu barcha kerakli kutubxonalarni yuklab oladi (bir necha daqiqa vaqt oladi).

## 3. Anthropic API kalitini olish

1. https://console.anthropic.com saytiga kiring, ro'yxatdan o'ting
2. Chap menyudan **API Keys** bo'limiga o'ting → **Create Key** bosing
3. Chiqqan kalitni nusxalab oling (masalan `sk-ant-...` bilan boshlanadi)
4. **Billing** bo'limida kartangizni bog'lang (foydalanilgan tahlillar uchun avtomatik yechib olinadi — bir tahlil taxminan 1-3 tiyin atrofida)

## 4. Kalitni loyihaga qo'shish (lokal test uchun)

1. Loyiha papkasidagi `.env.local.example` faylini nusxalang va nomini `.env.local` ga o'zgartiring
2. Faylni oching, `sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx` o'rniga o'z kalitingizni yozing va saqlang

## 5. Lokal sinab ko'rish

Terminalda:

```
npm run dev
```

Brauzerda `http://localhost:3000` manzilini oching — sayt ochilishi kerak. `/dashboard` sahifasida grafik yuklab, "Signal olish" tugmasini bosib sinang.

## 6. GitHub'ga yuklash

M EDU'da qilganingiz kabi xuddi shu qadamlar:

```
git init
git add .
git commit -m "Sardor Trader - birinchi versiya"
```

GitHub'da yangi bo'sh repository yarating (masalan `sardor-trader-web`), so'ng:

```
git remote add origin https://github.com/SIZNING_USERNAME/sardor-trader-web.git
git branch -M main
git push -u origin main
```

**Muhim:** `.env.local` fayli GitHub'ga hech qachon yuklanmaydi (`.gitignore` ichida shunday sozlangan) — bu xavfsizlik uchun to'g'ri, chunki u yerda maxfiy kalitingiz bor.

## 7. Vercel'ga joylashtirish

1. https://vercel.com ga kiring (GitHub hisobingiz bilan)
2. **Add New > Project** → GitHub repo ro'yxatidan `sardor-trader-web`ni tanlang → **Import**
3. **Environment Variables** bo'limida qo'shing:
   - Name: `ANTHROPIC_API_KEY`
   - Value: sizning API kalitingiz
4. **Deploy** tugmasini bosing

Bir necha daqiqadan so'ng saytingiz `https://sardor-trader-web.vercel.app` (yoki shunga o'xshash) manzilda tayyor bo'ladi.

## 8. Keyingi qadamlar

- **Click to'lov integratsiyasi**: Click.uz'da merchant (biznes) hisobi ochish kerak — buning uchun tashkilot/ID hujjatlari kerak bo'ladi. Hozircha `/pricing` sahifasidagi tugma vaqtinchalik — merchant hisobi tayyor bo'lgach, men to'liq to'lov oqimini (webhook, obuna tekshirish) qo'shib beraman.
- **Domen**: Vercel bepul `.vercel.app` domenini beradi. O'z domeningizni (masalan `sardortrader.uz`) ulash uchun Vercel loyihasining **Settings > Domains** bo'limidan qo'shsangiz bo'ladi.
- **Login/obuna tizimi**: Hozircha sayt ochiq — istalgan kishi `/dashboard`ga kirib foydalanishi mumkin. Pullik qilish uchun keyingi bosqichda foydalanuvchi ro'yxatdan o'tish va obuna tekshirish tizimini (M EDU'dagi Supabase kabi) qo'shamiz.

## 9. Supabase qo'shildi — login va signal tarixi

Endi saytda **ro'yxatdan o'tish/kirish** va **signal tarixi + aniqlik statistikasi** bor. Buni sozlash uchun:

### a) Yangi Supabase loyihasi yaratish
1. https://supabase.com ga kiring (M EDU'da ishlatgan hisobingiz bilan)
2. **New Project** — nomini masalan `sardor-trader` deb qo'ying, parol o'rnating, hudud tanlang

### b) Kalitlarni olish
1. Loyiha ochilgach, **Settings > API** bo'limiga o'ting
2. **Project URL** va **anon public key**ni nusxalang
3. `.env.local` fayliga qo'shing:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

### c) Jadval yaratish
1. Supabase'da **SQL Editor** bo'limiga o'ting
2. Loyiha ichidagi **`supabase-schema.sql`** faylini oching, ichidagi barcha matnni nusxalab, SQL Editor'ga joylang
3. **Run** tugmasini bosing — bu `signals` jadvalini va xavfsizlik siyosatlarini (RLS) yaratadi

### d) Yangi kutubxonani o'rnatish
Terminalda:
```
npm install
```
(chunki `@supabase/supabase-js` yangi qo'shildi)

### e) Sinash
1. `npm run dev`
2. `/signup` sahifasida ro'yxatdan o'ting (email tasdiqlash xati keladi — Supabase standart sozlamada shart, xohlasangiz **Authentication > Providers > Email**da "Confirm email"ni o'chirib qo'ysangiz bo'ladi, tezroq sinash uchun)
3. Kirib, `/dashboard`da signal oling — endi u avtomatik saqlanadi
4. `/history` sahifasida signalni ko'ring, "Yutdi/Yutqazdi" deb belgilang — aniqlik foizi hisoblanadi
