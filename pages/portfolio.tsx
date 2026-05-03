import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { formatPrice, formatTHB, getAssetType, getAssetDisplayName, US_STOCKS, CRYPTOS, FOREX_PAIRS } from '../lib/market'
import Navbar from '../components/Navbar'
import {
  PieChart, TrendingUp, TrendingDown, Wallet, Package,
  ArrowRight, Loader2, DollarSign, BarChart3,
  Globe, Bitcoin, BarChart2, Filter
} from 'lucide-react'

type AssetType = 'all' | 'stock' | 'crypto' | 'forex'

type Holding = {
  symbol: string
  quantity: number
  avgPrice: number
  totalCost: number
  currentPrice?: number
  currentValue?: number
  pnl?: number
  pnlPercent?: number
  type: 'stock' | 'crypto' | 'forex'
}

export default function PortfolioPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  const [loading, setLoading] = useState(true)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [filteredHoldings, setFilteredHoldings] = useState<Holding[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [filter, setFilter] = useState<AssetType>('all')
  const [assetTotals, setAssetTotals] = useState({
    stock: { value: 0, cost: 0 },
    crypto: { value: 0, cost: 0 },
    forex: { value: 0, cost: 0 },
  })

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

    const holdingsList: Holding[] = holdingsData.map((h: any) => ({
      symbol: h.symbol,
      quantity: parseFloat(h.quantity),
      avgPrice: parseFloat(h.avg_price),
      totalCost: parseFloat(h.total_cost),
      type: getAssetType(h.symbol),
    }))

    // Fetch current prices and calculate P&L
    let tValue = 0
    let tCost = 0
    const assetValues = {
      stock: { value: 0, cost: 0 },
      crypto: { value: 0, cost: 0 },
      forex: { value: 0, cost: 0 },
    }

    for (const h of holdingsList) {
      try {
        let price = h.avgPrice // Fallback
        
        if (h.type === 'crypto') {
          // Crypto: fetch from Binance
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${h.symbol}USDT`)
          const data = await res.json()
          price = parseFloat(data.price)
        } else if (h.type === 'stock') {
          // Stock: simulated for demo (in production use real API)
          price = h.avgPrice * (1 + (Math.random() * 0.1 - 0.05))
        } else {
          // Forex: simulated for demo
          price = h.avgPrice * (1 + (Math.random() * 0.02 - 0.01))
        }
        
        h.currentPrice = price
        h.currentValue = h.quantity * price
        h.pnl = h.currentValue - h.totalCost
        h.pnlPercent = (h.pnl / h.totalCost) * 100
        tValue += h.currentValue
        
        // Update asset type totals
        assetValues[h.type].value += h.currentValue
        assetValues[h.type].cost += h.totalCost
      } catch {
        h.currentPrice = h.avgPrice
        h.currentValue = h.totalCost
        h.pnl = 0
        h.pnlPercent = 0
        tValue += h.totalCost
        assetValues[h.type].value += h.totalCost
        assetValues[h.type].cost += h.totalCost
      }
      tCost += h.totalCost
    }

    setHoldings(holdingsList.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0)))
    setFilteredHoldings(holdingsList)
    setTotalValue(tValue)
    setTotalCost(tCost)
    setAssetTotals(assetValues)
  }

  const totalPnl = totalValue - totalCost
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  // Filter holdings based on selected type
  useEffect(() => {
    if (filter === 'all') {
      setFilteredHoldings(holdings)
    } else {
      setFilteredHoldings(holdings.filter(h => h.type === filter))
    }
  }, [filter, holdings])

  // Get icon for asset type
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'stock': return <BarChart2 size={16} className="text-blue-400" />
      case 'crypto': return <Bitcoin size={16} className="text-orange-400" />
      case 'forex': return <Globe size={16} className="text-green-400" />
      default: return <Package size={16} className="text-gray-400" />
    }
  }

  // Get color for asset type
  const getAssetColor = (type: string) => {
    switch (type) {
      case 'stock': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'crypto': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'forex': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Value */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Wallet size={20} className="text-blue-400"/>
              </div>
              <span className="text-sm text-gray-400">มูลค่าพอร์ต</span>
            </div>
            <p className="text-2xl font-bold text-white">฿{formatPrice(totalValue)}</p>
            <p className="text-sm text-gray-500">มูลค่าพอร์ตรวม</p>
          </div>

          {/* Total Cost */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <DollarSign size={20} className="text-purple-400"/>
              </div>
              <span className="text-sm text-gray-400">ต้นทุนรวม</span>
            </div>
            <p className="text-2xl font-bold text-white">฿{formatPrice(totalCost)}</p>
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
              {totalPnl >= 0 ? '+' : ''}฿{formatPrice(totalPnl)}
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

        {/* Asset Type Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass p-4 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 size={16} className="text-blue-400"/>
              <span className="text-sm text-gray-400">หุ้น (Stocks)</span>
            </div>
            <p className="text-xl font-bold text-white">฿{formatPrice(assetTotals.stock.value)}</p>
            <p className="text-xs text-gray-500">{holdings.filter(h => h.type === 'stock').length} รายการ</p>
          </div>
          <div className="glass p-4 rounded-xl border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Bitcoin size={16} className="text-orange-400"/>
              <span className="text-sm text-gray-400">คริปโต (Crypto)</span>
            </div>
            <p className="text-xl font-bold text-white">฿{formatPrice(assetTotals.crypto.value)}</p>
            <p className="text-xs text-gray-500">{holdings.filter(h => h.type === 'crypto').length} รายการ</p>
          </div>
          <div className="glass p-4 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-green-400"/>
              <span className="text-sm text-gray-400">ฟอเร็กซ์ (Forex)</span>
            </div>
            <p className="text-xl font-bold text-white">฿{formatPrice(assetTotals.forex.value)}</p>
            <p className="text-xs text-gray-500">{holdings.filter(h => h.type === 'forex').length} รายการ</p>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b flex flex-wrap justify-between items-center gap-3" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400"/>
              รายการทรัพย์สิน
            </h2>
            <div className="flex items-center gap-2">
              {/* Filter Buttons */}
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(6,13,26,0.8)' }}>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setFilter('stock')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                    filter === 'stock' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <BarChart2 size={12}/> หุ้น
                </button>
                <button
                  onClick={() => setFilter('crypto')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                    filter === 'crypto' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Bitcoin size={12}/> คริปโต
                </button>
                <button
                  onClick={() => setFilter('forex')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                    filter === 'forex' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Globe size={12}/> ฟอเร็กซ์
                </button>
              </div>
              <a href="/trade" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                ไปเทรด <ArrowRight size={14}/>
              </a>
            </div>
          </div>

          {filteredHoldings.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={48} className="text-gray-600 mx-auto mb-4"/>
              <p className="text-gray-500">
                {holdings.length === 0 
                  ? `ยังไม่มีทรัพย์สินใน${mode === 'demo' ? 'โหมดทดลอง' : 'บัญชีจริง'}`
                  : 'ไม่มีทรัพย์สินที่ตรงกับตัวกรอง'}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <a href="/trade" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  เทรดหุ้น
                </a>
                <a href="/crypto" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm">
                  เทรดคริปโต
                </a>
                <a href="/forex" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  เทรดฟอเร็กซ์
                </a>
              </div>
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
                  {filteredHoldings.map((h) => (
                    <tr key={h.symbol} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(59,127,212,0.08)' }}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${getAssetColor(h.type)}`}>
                            {getAssetIcon(h.type)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{h.symbol}</p>
                            <p className="text-xs text-gray-500 capitalize">{h.type === 'stock' ? 'หุ้น' : h.type === 'crypto' ? 'คริปโต' : 'ฟอเร็กซ์'} · {mode === 'demo' ? 'Demo' : 'Real'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-medium text-white">{h.quantity.toFixed(h.type === 'crypto' ? 6 : h.type === 'forex' ? 2 : 4)}</p>
                        <p className="text-xs text-gray-500">{h.type === 'forex' ? 'lot' : 'หน่วย'}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-white">฿{formatPrice(h.avgPrice)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-white">฿{formatPrice(h.currentPrice || h.avgPrice)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-medium text-white">฿{formatPrice(h.currentValue || h.totalCost)}</p>
                        <p className="text-xs text-gray-500">ทุน ฿{formatPrice(h.totalCost)}</p>
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
