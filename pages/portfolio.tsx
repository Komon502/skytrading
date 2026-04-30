import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTHB } from '../lib/market'
import Navbar from '../components/Navbar'
import {
  PieChart, TrendingUp, TrendingDown, Wallet, Package,
  ArrowRight, Loader2, DollarSign, BarChart3
} from 'lucide-react'

type Holding = {
  symbol: string
  quantity: number
  avgPrice: number
  totalCost: number
  currentPrice?: number
  currentValue?: number
  pnl?: number
  pnlPercent?: number
}

export default function PortfolioPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  const [loading, setLoading] = useState(true)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalCost, setTotalCost] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      setUser(data.session.user)
      loadWallet(data.session.user.id)
      loadHoldings(data.session.user.id)
    })
  }, [mode])

  async function loadWallet(userId: string) {
    const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single()
    setWallet(data)
    setLoading(false)
  }

  async function loadHoldings(userId: string) {
    // Query from holdings table (auto-updated by trigger)
    const { data: holdingsData } = await supabase.from('holdings')
      .select('*')
      .eq('user_id', userId)
      .eq('mode', mode)

    if (!holdingsData || holdingsData.length === 0) {
      setHoldings([])
      setTotalValue(0)
      setTotalCost(0)
      return
    }

    const holdingsList = holdingsData.map((h: any) => ({
      symbol: h.symbol,
      quantity: parseFloat(h.quantity),
      avgPrice: parseFloat(h.avg_price),
      totalCost: parseFloat(h.total_cost),
    })) as Holding[]

    // Fetch current prices and calculate P&L
    let tValue = 0
    let tCost = 0

    for (const h of holdingsList) {
      // Try to fetch current price (simplified - in real app use WebSocket)
      const isCrypto = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'FTM', 'NEAR', 'ATOM'].includes(h.symbol)
      try {
        let price = h.avgPrice // Fallback to avg price
        if (isCrypto) {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${h.symbol}USDT`)
          const data = await res.json()
          price = parseFloat(data.price)
        } else {
          // For stocks, use Finnhub or fallback
          price = h.avgPrice * (1 + (Math.random() * 0.1 - 0.05)) // Simulated for demo
        }
        h.currentPrice = price
        h.currentValue = h.quantity * price
        h.pnl = h.currentValue - h.totalCost
        h.pnlPercent = (h.pnl / h.totalCost) * 100
        tValue += h.currentValue
      } catch {
        h.currentPrice = h.avgPrice
        h.currentValue = h.totalCost
        h.pnl = 0
        h.pnlPercent = 0
        tValue += h.totalCost
      }
      tCost += h.totalCost
    }

    setHoldings(holdingsList.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0)))
    setTotalValue(tValue)
    setTotalCost(tCost)
  }

  const totalPnl = totalValue - totalCost
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1a' }}>
      <Loader2 className="animate-spin text-blue-400" size={32}/>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#060d1a' }}>
      <Navbar user={user} wallet={wallet} mode={mode} onModeChange={setMode}/>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <PieChart size={28} className="text-blue-400"/>
              พอร์ตโฟลิโอของฉัน
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'demo' ? 'โหมดทดลอง (Demo)' : 'โหมดจริง (Real)'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('demo')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'demo' 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Demo
            </button>
            <button
              onClick={() => setMode('real')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'real' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Real
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Value */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Wallet size={20} className="text-blue-400"/>
              </div>
              <span className="text-sm text-gray-400">มูลค่าพอร์ต</span>
            </div>
            <p className="text-2xl font-bold text-white">${formatPrice(totalValue)}</p>
            <p className="text-sm text-gray-500">≈ ฿{formatTHB(totalValue * 36)}</p>
          </div>

          {/* Total Cost */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <DollarSign size={20} className="text-purple-400"/>
              </div>
              <span className="text-sm text-gray-400">ต้นทุนรวม</span>
            </div>
            <p className="text-2xl font-bold text-white">${formatPrice(totalCost)}</p>
            <p className="text-sm text-gray-500">ทุนเฉลี่ยทั้งหมด</p>
          </div>

          {/* P&L */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                totalPnl >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {totalPnl >= 0 ? <TrendingUp size={20} className="text-green-400"/> : <TrendingDown size={20} className="text-red-400"/>}
              </div>
              <span className="text-sm text-gray-400">กำไร/ขาดทุน</span>
            </div>
            <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{formatPrice(totalPnl)}
            </p>
            <p className={`text-sm ${totalPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
            </p>
          </div>

          {/* Number of Assets */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Package size={20} className="text-orange-400"/>
              </div>
              <span className="text-sm text-gray-400">จำนวนสินทรัพย์</span>
            </div>
            <p className="text-2xl font-bold text-white">{holdings.length}</p>
            <p className="text-sm text-gray-500">หลักทรัพย์</p>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400"/>
              รายการทรัพย์สิน
            </h2>
            <a href="/trade" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              ไปเทรด <ArrowRight size={14}/>
            </a>
          </div>

          {holdings.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={48} className="text-gray-600 mx-auto mb-4"/>
              <p className="text-gray-500">ยังไม่มีทรัพย์สินใน{mode === 'demo' ? 'โหมดทดลอง' : 'บัญชีจริง'}</p>
              <a href="/trade" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                เริ่มเทรด
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
                    <th className="text-left p-4 font-medium">สินทรัพย์</th>
                    <th className="text-right p-4 font-medium">จำนวน</th>
                    <th className="text-right p-4 font-medium">ราคาเฉลี่ย</th>
                    <th className="text-right p-4 font-medium">ราคาปัจจุบัน</th>
                    <th className="text-right p-4 font-medium">มูลค่า</th>
                    <th className="text-right p-4 font-medium">กำไร/ขาดทุน</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.symbol} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(59,127,212,0.08)' }}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center font-bold text-blue-400 text-sm">
                            {h.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{h.symbol}</p>
                            <p className="text-xs text-gray-500">{mode === 'demo' ? 'Demo' : 'Real'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-medium text-white">{h.quantity.toFixed(4)}</p>
                        <p className="text-xs text-gray-500">หน่วย</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-white">${formatPrice(h.avgPrice)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-white">${formatPrice(h.currentPrice || h.avgPrice)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-medium text-white">${formatPrice(h.currentValue || h.totalCost)}</p>
                        <p className="text-xs text-gray-500">ทุน ${formatPrice(h.totalCost)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                          (h.pnl || 0) >= 0 
                            ? 'bg-green-500/10 text-green-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {(h.pnl || 0) >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                          {(h.pnl || 0) >= 0 ? '+' : ''}{formatPrice(h.pnl || 0)}
                        </div>
                        <p className={`text-xs mt-1 ${(h.pnlPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(h.pnlPercent || 0) >= 0 ? '+' : ''}{(h.pnlPercent || 0).toFixed(2)}%
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/trade" className="glass p-4 rounded-xl flex items-center gap-4 hover:bg-white/5 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <BarChart3 size={24} className="text-blue-400"/>
            </div>
            <div>
              <h3 className="font-semibold text-white">ไปหน้าเทรด</h3>
              <p className="text-sm text-gray-500">ซื้อ/ขายสินทรัพย์</p>
            </div>
            <ArrowRight size={20} className="text-gray-500 ml-auto group-hover:text-blue-400 transition-colors"/>
          </a>

          <a href="/deposit" className="glass p-4 rounded-xl flex items-center gap-4 hover:bg-white/5 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <Wallet size={24} className="text-green-400"/>
            </div>
            <div>
              <h3 className="font-semibold text-white">ฝากเงิน</h3>
              <p className="text-sm text-gray-500">เติมเงินเข้าบัญชีจริง</p>
            </div>
            <ArrowRight size={20} className="text-gray-500 ml-auto group-hover:text-green-400 transition-colors"/>
          </a>
        </div>
      </div>
    </div>
  )
}
