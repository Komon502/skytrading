import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import { 
  BarChart2, Search, Loader2, TrendingUp, TrendingDown,
  Filter, RefreshCw, DollarSign
} from 'lucide-react'

export default function AdminTrades() {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'demo' | 'real'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadTrades()
  }, [filter])

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

    if (search) {
      query = query.or(`symbol.ilike.%${search}%,user_profiles.display_name.ilike.%${search}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to load trades:', error)
    } else {
      setTrades(data || [])
    }
    setLoading(false)
  }

  const stats = {
    total: trades.length,
    buy: trades.filter(t => t.type === 'buy').length,
    sell: trades.filter(t => t.type === 'sell').length,
    demo: trades.filter(t => t.mode === 'demo').length,
    real: trades.filter(t => t.mode === 'real').length,
    totalVolume: trades.reduce((sum, t) => sum + (t.total || 0), 0)
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
        <StatCard label="Demo Mode" value={stats.demo} color="yellow" />
        <StatCard label="Real Mode" value={stats.real} color="purple" />
        <StatCard label="Volume รวม" value={`$${stats.totalVolume.toLocaleString()}`} color="blue" />
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
                <th className="text-left p-4 font-medium">Symbol</th>
                <th className="text-center p-4 font-medium">ประเภท</th>
                <th className="text-center p-4 font-medium">Mode</th>
                <th className="text-right p-4 font-medium">จำนวน</th>
                <th className="text-right p-4 font-medium">ราคา</th>
                <th className="text-right p-4 font-medium">มูลค่า</th>
                <th className="text-center p-4 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
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
                    <span className="font-bold text-white">{trade.symbol}</span>
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
                    <span className="text-white font-mono">{trade.quantity}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-400 font-mono">${trade.price}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-white font-mono font-medium">${trade.total?.toLocaleString()}</span>
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
  color
}: { 
  label: string
  value: number | string
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }

  return (
    <div className={`p-4 rounded-xl ${colors[color]}`}>
      <p className="text-xs opacity-80 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
