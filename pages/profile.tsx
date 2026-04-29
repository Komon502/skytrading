import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { User, BarChart2, Shield, Wallet, TrendingUp, TrendingDown, Loader2, Eye, EyeOff } from 'lucide-react'
import { formatTHB } from '../lib/market'

type ProfileTab = 'overview' | 'history' | 'security'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [trades, setTrades] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
  const [loading, setLoading] = useState(true)

  // Security form
  const [newPass, setNewPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passLoading, setPassLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      setUser(data.session.user)
      loadData(data.session.user.id)
    })
    if (router.query.tab) setActiveTab(router.query.tab as ProfileTab)
  }, [router.query.tab])

  async function loadData(userId: string) {
    const [w, t] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', userId).single(),
      supabase.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    ])
    setWallet(w.data)
    setTrades(t.data || [])
    setLoading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPass.length < 6) { setPassMsg({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว' }); return }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) setPassMsg({ type: 'error', text: error.message })
    else { setPassMsg({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จ' }); setNewPass('') }
    setPassLoading(false)
  }

  const totalTrades = trades.length
  const closedTrades = trades.filter(t => t.status === 'closed')
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

  const TABS = [
    { id: 'overview', label: 'ภาพรวม', icon: <Wallet size={15}/> },
    { id: 'history', label: 'ประวัติเทรด', icon: <BarChart2 size={15}/> },
    { id: 'security', label: 'ความปลอดภัย', icon: <Shield size={15}/> },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1a' }}>
      <Loader2 className="animate-spin text-blue-400" size={32}/>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#060d1a' }}>
      <Navbar user={user} wallet={wallet}/>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #1b4070, #3b7fd4)' }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user?.email}</h1>
            <p className="text-sm text-gray-500">สมาชิกตั้งแต่ {new Date(user?.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b pb-3" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => setActiveTab(t.id as ProfileTab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && wallet && (
          <div className="space-y-4 animate-fadein">
            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-5">
                <p className="text-xs text-yellow-400 font-semibold mb-1">💛 DEMO BALANCE</p>
                <p className="text-2xl font-mono font-bold text-white">฿{formatTHB(wallet.demo_balance)}</p>
                <p className="text-xs text-gray-600 mt-1">เริ่มต้น ฿5,000.00</p>
              </div>
              <div className="glass p-5">
                <p className="text-xs text-green-400 font-semibold mb-1">💚 REAL BALANCE</p>
                <p className="text-2xl font-mono font-bold text-white">฿{formatTHB(wallet.real_balance)}</p>
                <p className="text-xs text-gray-600 mt-1">เงินจริง</p>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'คำสั่งทั้งหมด', value: totalTrades, color: 'text-blue-400' },
                { label: 'P&L รวม', value: `${totalPnl >= 0 ? '+' : ''}฿${formatTHB(totalPnl)}`, color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
                { label: 'Trades ปิดแล้ว', value: closedTrades.length, color: 'text-gray-300' },
              ].map((s, i) => (
                <div key={i} className="glass p-4 text-center">
                  <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="animate-fadein">
            {trades.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <BarChart2 size={48} className="mx-auto mb-3 opacity-20"/>
                <p>ยังไม่มีประวัติการเทรด</p>
              </div>
            ) : (
              <div className="glass overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
                      {['วันที่', 'Symbol', 'Mode', 'ประเภท', 'จำนวน', 'ราคา', 'รวม', 'สถานะ'].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id} className="border-b ticker-row"
                        style={{ borderColor: 'rgba(59,127,212,0.06)' }}>
                        <td className="px-3 py-2.5 text-gray-400">{new Date(t.created_at).toLocaleDateString('th-TH')}</td>
                        <td className="px-3 py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="px-3 py-2.5">
                          <span className={t.mode === 'demo' ? 'mode-demo' : 'mode-real'}>{t.mode.toUpperCase()}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={t.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {t.type === 'buy' ? <TrendingUp size={12} className="inline mr-1"/> : <TrendingDown size={12} className="inline mr-1"/>}
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-300 font-mono">{t.quantity}</td>
                        <td className="px-3 py-2.5 text-gray-300 font-mono">${t.price?.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-white font-mono">${t.total?.toFixed(2)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            t.status === 'open' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 bg-gray-500/10'
                          }`}>{t.status === 'open' ? 'เปิดอยู่' : 'ปิดแล้ว'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="animate-fadein max-w-md">
            <div className="glass p-6">
              <h3 className="font-semibold text-white mb-1">เปลี่ยนรหัสผ่าน</h3>
              <p className="text-xs text-gray-500 mb-5">รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร</p>

              {passMsg && (
                <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm ${
                  passMsg.type === 'success'
                    ? 'bg-green-400/10 border border-green-400/20 text-green-400'
                    : 'bg-red-400/10 border border-red-400/20 text-red-400'
                }`}>{passMsg.text}</div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">รหัสผ่านใหม่</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input-sky pr-10"
                      placeholder="รหัสผ่านใหม่"
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={passLoading}>
                  {passLoading && <Loader2 size={15} className="animate-spin"/>}
                  บันทึกรหัสผ่านใหม่
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
