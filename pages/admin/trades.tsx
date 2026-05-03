import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import { 
  BarChart2, Search, Loader2, TrendingUp, TrendingDown,
  Filter, RefreshCw, DollarSign, Globe, Bitcoin, BarChart3
} from 'lucide-react'

export default function AdminTrades() {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'demo' | 'real'>('all')
  const [assetFilter, setAssetFilter] = useState<'all' | 'stock' | 'crypto' | 'forex'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadTrades()
  }, [filter, assetFilter])

  async function loadTrades() {
    setLoading(true)
    
    let query = supabase
      .from('trades')
      .select('*, user_profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (filter === 'buy' || filter === 'sell') {
      query = query.eq('type', filter)
    } else if (filter === 'demo' || filter === 'real') {
      query = query.eq('mode', filter)
    }

    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to load trades:', error)
    } else {
      setTrades(data || [])
    }
    setLoading(false)
  }

  // Filter trades by search and asset type
  const filteredTrades = trades.filter(trade => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSymbol = trade.symbol.toLowerCase().includes(searchLower)
      const matchesUser = trade.user_profiles?.display_name?.toLowerCase().includes(searchLower)
      if (!matchesSymbol && !matchesUser) return false
    }
    
    // Asset type filter
    if (assetFilter !== 'all') {
      const sym = trade.symbol
      const isCrypto = ['BTC','ETH','SOL','ADA','XRP','DOGE','BNB','MATIC','DOT','LINK','LTC','AVAX','UNI','ATOM'].some(c => sym.includes(c))
      const isForex = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD'].includes(sym)
      const tradeType = isCrypto ? 'crypto' : isForex ? 'forex' : 'stock'
      if (tradeType !== assetFilter) return false
    }
    
    return true
  })

  const stats = {
    total: filteredTrades.length,
    buy: filteredTrades.filter(t => t.type === 'buy').length,
    sell: filteredTrades.filter(t => t.type === 'sell').length,
    demo: filteredTrades.filter(t => t.mode === 'demo').length,
    real: filteredTrades.filter(t => t.mode === 'real').length,
    stock: filteredTrades.filter(t => {
      const sym = t.symbol
      const isCrypto = ['BTC','ETH','SOL','ADA','XRP','DOGE','BNB','MATIC','DOT','LINK','LTC','AVAX','UNI','ATOM'].some(c => sym.includes(c))
      const isForex = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD'].includes(sym)
      return !isCrypto && !isForex
    }).length,
    crypto: filteredTrades.filter(t => ['BTC','ETH','SOL','ADA','XRP','DOGE','BNB','MATIC','DOT','LINK','LTC','AVAX','UNI','ATOM'].some(c => t.symbol.includes(c))).length,
    forex: filteredTrades.filter(t => ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD'].includes(t.symbol)).length,
    totalVolume: filteredTrades.reduce((sum, t) => sum + (t.total || 0), 0)
  }

  return (
    <AdminLayout activeTab="trades">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">ประวัติการเทรด</h1>
          <p className="text-gray-500 text-sm">ดูการซื้อขายทั้งหมดในระบบ</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="ค้นหา Symbol หรือชื่อ..."
              className="input-sky pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTrades()}
            />
          </div>
          <button 
            onClick={loadTrades}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="ทั้งหมด" value={stats.total} color="blue" />
        <StatCard label="ซื้อ (Buy)" value={stats.buy} color="green" />
        <StatCard label="ขาย (Sell)" value={stats.sell} color="red" />
        <StatCard label="หุ้น" value={stats.stock} color="blue" icon={<BarChart3 size={14} />} />
        <StatCard label="คริปโต" value={stats.crypto} color="orange" icon={<Bitcoin size={14} />} />
        <StatCard label="ฟอเร็กซ์" value={stats.forex} color="purple" icon={<Globe size={14} />} />
      </div>

      {/* Asset Type Filter */}
      <div className="flex gap-2 mb-4">
        <span className="text-sm text-gray-500 py-2">ประเภทสินทรัพย์:</span>
        {[
          { id: 'all', label: 'ทั้งหมด', icon: null },
          { id: 'stock', label: 'หุ้น', icon: <BarChart3 size={14} /> },
          { id: 'crypto', label: 'คริปโต', icon: <Bitcoin size={14} /> },
          { id: 'forex', label: 'ฟอเร็กซ์', icon: <Globe size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAssetFilter(tab.id as any)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              assetFilter === tab.id
                ? tab.id === 'stock' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' :
                  tab.id === 'crypto' ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' :
                  tab.id === 'forex' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' :
                  'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'all', label: 'ทั้งหมด' },
          { id: 'buy', label: 'ซื้อ' },
          { id: 'sell', label: 'ขาย' },
          { id: 'demo', label: 'Demo' },
          { id: 'real', label: 'Real' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === tab.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trades Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-400" size={32} />
          </div>
        ) : trades.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart2 size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">ไม่มีรายการเทรด</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
                <th className="text-left p-4 font-medium">วันที่</th>
                <th className="text-left p-4 font-medium">ผู้ใช้</th>
                <th className="text-left p-4 font-medium">สินทรัพย์</th>
                <th className="text-center p-4 font-medium">ประเภท</th>
                <th className="text-center p-4 font-medium">Mode</th>
                <th className="text-right p-4 font-medium">จำนวน</th>
                <th className="text-right p-4 font-medium">ราคา</th>
                <th className="text-right p-4 font-medium">มูลค่า</th>
                <th className="text-center p-4 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => {
                // Determine asset type
                const sym = trade.symbol
                const isCrypto = ['BTC','ETH','SOL','ADA','XRP','DOGE','BNB','MATIC','DOT','LINK','LTC','AVAX','UNI','ATOM'].some(c => sym.includes(c))
                const isForex = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD'].includes(sym)
                const assetLabel = isCrypto ? 'คริปโต' : isForex ? 'ฟอเร็กซ์' : 'หุ้น'
                const assetColor = isCrypto ? 'bg-orange-500/20 text-orange-400' : isForex ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                return (
                <tr key={trade.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(59,127,212,0.06)' }}>
                  <td className="p-4">
                    <p className="text-sm text-white">{new Date(trade.created_at).toLocaleDateString('th-TH')}</p>
                    <p className="text-xs text-gray-500">{new Date(trade.created_at).toLocaleTimeString('th-TH')}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-white">{trade.user_profiles?.display_name || 'ไม่มีชื่อ'}</p>
                    <code className="text-xs text-gray-400">{trade.user_id.slice(0, 8)}...</code>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{trade.symbol}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${assetColor}`}>
                        {assetLabel}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      trade.type === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {trade.type === 'buy' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      trade.mode === 'demo' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {trade.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-white font-mono">{trade.quantity} {isForex ? 'lot' : ''}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-400 font-mono">฿{trade.price}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-white font-mono font-medium">฿{trade.total?.toLocaleString()}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      trade.status === 'open' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {trade.status === 'open' ? 'OPEN' : 'CLOSED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  color,
  icon
}: { 
  label: string
  value: number | string
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'
  icon?: React.ReactNode
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
  }

  return (
    <div className={`p-4 rounded-xl ${colors[color]}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon && <span className="opacity-80">{icon}</span>}
        <p className="text-xs opacity-80">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
