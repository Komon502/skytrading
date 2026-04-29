# SkyTrading 🚀

แพลตฟอร์มเทรดหุ้น US & Crypto แบบ Real-time พร้อม Demo & Real mode

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (Pages Router) |
| Styling | Tailwind CSS |
| Database | **Supabase** (Postgres + Auth + Storage) |
| Hosting | Vercel |
| Stock Data | Finnhub (free 60 req/min) |
| Crypto Data | Binance Public API (free) |
| Chart | TradingView Widget (free embed) |
| Payment | SlipOk (Thai slip verification) |

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/auth` | Login / Register / Reset Password (1 page) |
| `/trade` | Main trading page (Demo & Real mode) |
| `/deposit` | Deposit with SlipOk verification |
| `/profile` | Profile, trade history, security settings |

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/yourname/skytrading
cd skytrading
npm install
```

### 2. Supabase Setup

1. ไปที่ [supabase.com](https://supabase.com) → สร้าง project ใหม่
2. ไปที่ **SQL Editor** → วาง content จากไฟล์ `supabase-schema.sql` → กด Run
3. ไปที่ **Storage** → สร้าง bucket ชื่อ `slips` (private)
4. Copy `Project URL` และ `anon key` จาก Settings > API

### 3. Finnhub API Key

1. สมัครที่ [finnhub.io](https://finnhub.io) (ฟรี)
2. Copy API key จาก dashboard

### 4. SlipOk API Key

1. สมัครที่ [slipok.com](https://slipok.com)
2. สร้าง Branch → Copy Branch ID
3. สร้าง API Key → Copy key

### 5. Environment Variables

```bash
cp .env.example .env.local
# แก้ไข .env.local ใส่ค่าจริงทั้งหมด
```

### 6. Run Dev

```bash
npm run dev
# เปิด http://localhost:3000
```

## Deploy to Vercel

```bash
# 1. Push to GitHub
git add . && git commit -m "Initial SkyTrading" && git push

# 2. ไปที่ vercel.com → Import GitHub repo
# 3. เพิ่ม Environment Variables ทั้งหมดใน Vercel Dashboard
# 4. Deploy!
```

## Database Schema

```
wallets     - demo_balance / real_balance แยกกันชัดเจน
trades      - ทุก order มี mode: 'demo' | 'real'
deposits    - ประวัติการฝากเงิน + slipok_ref (unique = ป้องกัน slip ซ้ำ)
```

## SlipOk Flow

```
User อัพโหลด slip
→ อัพไปยัง Supabase Storage
→ Call /api/verify-slip (server-side)
→ ส่งรูปไป SlipOk API
→ ตรวจสอบยอดเงิน + transRef
→ ถ้าผ่าน: update real_balance + บันทึก deposit
→ ถ้าไม่ผ่าน: reject พร้อมแสดงเหตุผล
```

## Asset Coverage

**US Stocks (29 ตัว):** AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, NFLX, AMD, INTC, CRM, ORCL, JPM, BAC, GS, V, MA, JNJ, PFE, UNH, WMT, KO, MCD, SBUX, XOM, CVX, SPY, QQQ, DIA

**Crypto (14 ตัว):** BTC, ETH, BNB, SOL, XRP, ADA, DOGE, MATIC, DOT, LINK, LTC, AVAX, UNI, ATOM

---

> ⚠️ ข้อมูลราคาและระบบนี้มีไว้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
"# skytrading" 
