import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import { 
  Users, Wallet, CreditCard, BarChart2, TrendingUp, TrendingDown,
  ArrowRight, Loader2, Globe, Bitcoin, BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrades: 0,
    totalDeposits: 0,
    pendingDeposits: 0,
    demoVolume: 0,
    realVolume: 0,
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentDeposits, setRecentDeposits] = useState<any[]>([])
  const [recentTrades, setRecentTrades] = useState<any[]>([])
  const [tradeStats, setTradeStats] = useState({
    stockTrades: 0,
    cryptoTrades: 0,
    forexTrades: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      // Get counts
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
      
      const { count: tradeCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
      
      const { count: depositCount } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
      
      const { count: pendingCount } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Get recent users
      const { data: users } = await supabase
        .from('user_profiles')
        .select('*, wallets(demo_balance, real_balance)')
        .order('updated_at', { ascending: false })
        .limit(5)

      // Get recent deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*, user_profiles(display_name)')
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent trades with user info
      const { data: trades } = await supabase
        .from('trades')
        .select('*, user_profiles(display_name)')
        .order('created_at', { ascending: false })
        .limit(10)

      // Calculate trade stats by asset type
      const { data: allTrades } = await supabase
        .from('trades')
        .select('symbol')

      let stockCount = 0, cryptoCount = 0, forexCount = 0
      allTrades?.forEach(trade => {
        const sym = trade.symbol
        if (['BTC','ETH','SOL','ADA','XRP','DOGE','BNB','MATIC','DOT','LINK','LTC','AVAX','UNI','ATOM'].some(c => sym.includes(c))) {
          cryptoCount++
        } else if (['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD'].includes(sym)) {
          forexCount++
        } else {
          stockCount++
        }
      })

      setStats({
        totalUsers: userCount || 0,
        totalTrades: tradeCount || 0,
        totalDeposits: depositCount || 0,
        pendingDeposits: pendingCount || 0,
        demoVolume: 0,
        realVolume: 0,
      })
      setTradeStats({
        stockTrades: stockCount,
        cryptoTrades: cryptoCount,
        forexTrades: forexCount,
      })
      setRecentUsers(users || [])
      setRecentDeposits(deposits || [])
      setRecentTrades(trades || [])
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <AdminLayout activeTab="dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-400" size={32} />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout activeTab="dashboard">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Admin ดูแลระบบ</h1>
        <p className="text-gray-500">ภาพรวมระบบและสถิติสำคัญ</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users size={20} />}
          label="ผู้ใช้ทั้งหมด"
          value={stats.totalUsers}
          color="blue"
          href="/admin/users"
        />
        <StatCard
          icon={<BarChart2 size={20} />}
          label="การเทรดทั้งหมด"
          value={stats.totalTrades}
          color="purple"
          href="/admin/trades"
        />
        <StatCard
          icon={<CreditCard size={20} />}
          label="การฝากเงิน"
          value={stats.totalDeposits}
          color="green"
          href="/admin/deposits"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="รอตรวจสอบ"
          value={stats.pendingDeposits}
          color="yellow"
          alert={stats.pendingDeposits > 0}
          href="/admin/deposits"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              ผู้ใช้ล่าสุด
            </h2>
            <Link href="/admin/users" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              ดูทั้งหมด <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,127,212,0.08)' }}>
            {recentUsers.length === 0 ? (
              <p className="p-4 text-center text-gray-500 text-sm">ยังไม่มีผู้ใช้</p>
            ) : (
              recentUsers.map((user: any) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-medium text-white">{user.display_name || 'ไม่มีชื่อ'}</p>
                    <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-yellow-400">Demo: ฿{user.wallets?.demo_balance?.toLocaleString() || 0}</p>
                    <p className="text-xs text-green-400">Real: ฿{user.wallets?.real_balance?.toLocaleString() || 0}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Deposits */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <h2 className="font-semibold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-blue-400" />
              การฝากเงินล่าสุด
            </h2>
            <Link href="/admin/deposits" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              ดูทั้งหมด <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,127,212,0.08)' }}>
            {recentDeposits.length === 0 ? (
              <p className="p-4 text-center text-gray-500 text-sm">ยังไม่มีรายการฝาก</p>
            ) : (
              recentDeposits.map((deposit: any) => (
                <div key={deposit.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-medium text-white">฿{deposit.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{deposit.user_profiles?.display_name || 'ไม่มีชื่อ'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    deposit.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                    deposit.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {deposit.status === 'pending' ? 'รอตรวจสอบ' :
                     deposit.status === 'verified' ? 'ยืนยันแล้ว' : 'ถูกปฏิเสธ'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trade Stats & Recent Trades */}
      <div className="mt-6">
        {/* Trade Stats by Type */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={<BarChart3 size={20} />}
            label="เทรดหุ้น"
            value={tradeStats.stockTrades}
            color="blue"
            href="/admin/trades"
          />
          <StatCard
            icon={<Bitcoin size={20} />}
            label="เทรดคริปโต"
            value={tradeStats.cryptoTrades}
            color="orange"
            href="/admin/trades"
          />
          <StatCard
            icon={<Globe size={20} />}
            label="เทรดฟอเร็กซ์"
            value={tradeStats.forexTrades}
            color="purple"
            href="/admin/trades"
          />
        </div>

        {/* Recent Trades */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-400" />
              ออเดอร์ล่าสุด (Orders)
            </h2>
            <Link href="/admin/trades" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              ดูทั้งหมด <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(59,127,212,0.08)' }}>
            {recentTrades.length === 0 ? (
              <p className="p-4 text-center text-gray-500 text-sm">ยังไม่มีรายการเทรด</p>
            ) : (
              recentTrades.map((trade: any) => {
                // Determine asset type
                const sym = trade.symbol
                const isCrypto = ['BTC','ETH','SOL','ADA','XRP','DOGE','BNB','MATIC','DOT','LINK','LTC','AVAX','UNI','ATOM'].some(c => sym.includes(c))
                const isForex = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD'].includes(sym)
                const assetType = isCrypto ? 'crypto' : isForex ? 'forex' : 'stock'
                const assetLabel = isCrypto ? 'คริปโต' : isForex ? 'ฟอเร็กซ์' : 'หุ้น'
                const assetColor = isCrypto ? 'bg-orange-500/20 text-orange-400' : isForex ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'

                return (
                  <div key={trade.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.type === 'buy' ? 'B' : 'S'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{trade.symbol}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${assetColor}`}>
                            {assetLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{trade.user_profiles?.display_name || 'ไม่มีชื่อ'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white">{parseFloat(trade.quantity).toFixed(4)} {isForex ? 'lot' : 'หน่วย'}</p>
                      <p className="text-xs text-gray-500">฿{trade.price} · {trade.mode === 'demo' ? 'Demo' : 'Real'}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  color,
  alert,
  href 
}: { 
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'orange'
  alert?: boolean
  href: string
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }

  return (
    <Link href={href} className="glass p-4 rounded-xl hover:bg-white/5 transition-colors block">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </Link>
  )
}
