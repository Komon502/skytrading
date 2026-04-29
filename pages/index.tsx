import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, Zap, Shield, BarChart2, ArrowRight } from 'lucide-react'

const TICKER_ITEMS = [
  { s: 'AAPL', p: 189.45, c: 1.23 }, { s: 'NVDA', p: 875.20, c: 3.45 },
  { s: 'BTC', p: 68420, c: -0.82 }, { s: 'TSLA', p: 175.30, c: -2.10 },
  { s: 'ETH', p: 3850, c: 2.15 }, { s: 'GOOGL', p: 172.80, c: 0.67 },
  { s: 'MSFT', p: 415.60, c: 1.89 }, { s: 'SOL', p: 182.50, c: 4.32 },
]

export default function IndexPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tickerIdx, setTickerIdx] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    // Ticker animation
    const t = setInterval(() => setTickerIdx(i => i + 1), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#060d1a' }}>
      {/* Ticker bar */}
      <div className="border-b overflow-hidden py-2"
        style={{ borderColor: 'rgba(59,127,212,0.1)', background: 'rgba(10,22,40,0.8)' }}>
        <div className="flex gap-6 px-4 overflow-x-auto no-scrollbar">
          {TICKER_ITEMS.map(t => (
            <div key={t.s} className="flex items-center gap-2 shrink-0 text-xs">
              <span className="text-gray-400 font-medium">{t.s}</span>
              <span className="text-white font-mono">{t.p.toLocaleString()}</span>
              <span className={t.c >= 0 ? 'text-green-400' : 'text-red-400'}>
                {t.c >= 0 ? '+' : ''}{t.c}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navbar minimal */}
      <nav className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1b4070, #3b7fd4)' }}>
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">Sky<span style={{ color: '#3b7fd4' }}>Trading</span></span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={() => router.push('/trade')}
              className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }}>
              เข้าสู่แพลตฟอร์ม
            </button>
          ) : (
            <>
              <Link href="/auth" className="text-sm text-gray-400 hover:text-white transition-colors">เข้าสู่ระบบ</Link>
              <Link href="/auth?tab=register"
                className="btn-primary text-sm" style={{ width: 'auto', padding: '8px 20px' }}>
                สมัครฟรี
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Background grid */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8"
            style={{ background: 'rgba(59,127,212,0.1)', border: '1px solid rgba(59,127,212,0.2)', color: '#7ab5ea' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-green" />
            Real-time data · US Stocks & Crypto
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            เทรดอย่างมืออาชีพ<br/>
            <span style={{ color: '#3b7fd4' }}>บนแพลตฟอร์มระดับโลก</span>
          </h1>

          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            เริ่มทดลองเทรดฟรีกับ Demo 5,000 บาท หรืออัปเกรดเป็น Real mode ด้วยเงินจริง
            พร้อมกราฟ Real-time และข้อมูลหุ้น + Crypto ทั้งหมด
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? '/trade' : '/auth?tab=register'}
              className="btn-primary flex items-center justify-center gap-2" style={{ width: 'auto', padding: '14px 32px', fontSize: '16px' }}>
              เริ่มเทรด Demo ฟรี <ArrowRight size={18}/>
            </Link>
            <Link href="/auth"
              className="px-8 py-3 rounded-lg text-gray-300 hover:text-white transition-colors border"
              style={{ borderColor: 'rgba(59,127,212,0.2)' }}>
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: <Zap size={20} className="text-yellow-400"/>,
            title: 'Demo Mode',
            desc: 'ทดลองเทรดด้วยเงิน Demo 5,000 บาท โดยไม่เสียเงินจริง ฝึกฝนกลยุทธ์ได้ตลอด',
            badge: 'ฟรี',
            badgeColor: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
          },
          {
            icon: <Shield size={20} className="text-green-400"/>,
            title: 'Real Mode',
            desc: 'เทรดด้วยเงินจริง ฝากเงินผ่าน SlipOk ตรวจสอบ slip อัตโนมัติ ปลอดภัย 100%',
            badge: 'LIVE',
            badgeColor: 'text-green-400 bg-green-400/10 border-green-400/20'
          },
          {
            icon: <BarChart2 size={20} className="text-blue-400"/>,
            title: 'กราฟ Real-time',
            desc: 'กราฟ Candlestick จาก TradingView พร้อม indicator ครบครัน อัปเดตทันที',
            badge: 'LIVE',
            badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
          },
        ].map((f, i) => (
          <div key={i} className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59,127,212,0.1)' }}>
                {f.icon}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${f.badgeColor}`}>{f.badge}</span>
            </div>
            <h3 className="font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-xs text-gray-600"
        style={{ borderColor: 'rgba(59,127,212,0.1)' }}>
        © 2024 SkyTrading · ข้อมูลจาก Finnhub & Binance · สำหรับการศึกษาและทดสอบเท่านั้น
      </footer>
    </div>
  )
}
