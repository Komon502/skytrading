import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { User, BarChart2, Shield, Wallet, TrendingUp, TrendingDown, Loader2, Eye, EyeOff, Camera, Edit2, Check, X } from 'lucide-react'
import { formatTHB } from '../lib/market'

type ProfileTab = 'overview' | 'history' | 'security' | 'profile'

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

  // Profile form
  const [profile, setProfile] = useState<any>(null)
  const [editingName, setEditingName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      setUser(data.session.user)
      loadData(data.session.user.id)
    })
    if (router.query.tab) setActiveTab(router.query.tab as ProfileTab)
  }, [router.query.tab])

  async function loadData(userId: string) {
    const [w, t, p] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', userId).single(),
      supabase.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('user_profiles').select('*').eq('id', userId).single()
    ])
    setWallet(w.data)
    setTrades(t.data || [])
    setProfile(p.data)
    setDisplayName(p.data?.display_name || '')
    setLoading(false)
  }

  async function handleUpdateProfile(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setProfileLoading(true)
    setProfileMsg(null)
    
    const { error } = await supabase.from('user_profiles').upsert({
      id: user?.id,
      display_name: displayName,
      updated_at: new Date().toISOString()
    })
    
    if (error) {
      setProfileMsg({ type: 'error', text: 'บันทึกไม่สำเร็จ' })
    } else {
      setProfileMsg({ type: 'success', text: 'บันทึกโปรไฟล์สำเร็จ' })
      setEditingName(false)
      loadData(user?.id)
    }
    setProfileLoading(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'ไฟล์ใหญ่เกินไป (สูงสุด 2MB)' })
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'ต้องเป็นไฟล์รูปภาพเท่านั้น' })
      return
    }

    setUploadingAvatar(true)
    setProfileMsg(null)

    const fileExt = file.name.split('.').pop()
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`

    // Upload to storage with upsert option
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
      upsert: true,
      cacheControl: '3600'
    })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setProfileMsg({ type: 'error', text: `อัปโหลดรูปไม่สำเร็จ: ${uploadError.message}` })
      setUploadingAvatar(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

    // Update profile
    const { error } = await supabase.from('user_profiles').upsert({
      id: user?.id,
      avatar_url: publicUrl,
      updated_at: new Date().toISOString()
    })

    if (error) {
      console.error('Profile update error:', error)
      setProfileMsg({ type: 'error', text: `บันทึกรูปภาพไม่สำเร็จ: ${error.message}` })
    } else {
      setProfileMsg({ type: 'success', text: 'อัปโหลดรูปภาพสำเร็จ' })
      loadData(user?.id)
    }
    setUploadingAvatar(false)
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
    { id: 'profile', label: 'โปรไฟล์', icon: <User size={15}/> },
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
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-2xl object-cover"/>
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #1b4070, #3b7fd4)' }}>
                {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {profile?.display_name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-600">สมาชิกตั้งแต่ {new Date(user?.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="animate-fadein max-w-md">
            <div className="glass p-6">
              <h3 className="font-semibold text-white mb-1">แก้ไขโปรไฟล์</h3>
              <p className="text-xs text-gray-500 mb-5">อัปเดตชื่อและรูปโปรไฟล์ของคุณ</p>

              {profileMsg && (
                <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm ${
                  profileMsg.type === 'success'
                    ? 'bg-green-400/10 border border-green-400/20 text-green-400'
                    : 'bg-red-400/10 border border-red-400/20 text-red-400'
                }`}>{profileMsg.text}</div>
              )}

              {/* Avatar Upload */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-24 h-24 rounded-2xl object-cover"/>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold"
                      style={{ background: 'linear-gradient(135deg, #1b4070, #3b7fd4)' }}>
                      {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <label className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                    uploadingAvatar ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
                  }`}>
                    {uploadingAvatar ? <Loader2 size={14} className="animate-spin text-white"/> : <Camera size={14} className="text-white"/>}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar}/>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-3">คลิกที่กล้องเพื่อเปลี่ยนรูป</p>
              </div>

              {/* Display Name */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1.5 block">ชื่อที่แสดง</label>
                {editingName ? (
                  <form onSubmit={handleUpdateProfile} className="flex gap-2">
                    <input
                      type="text"
                      className="input-sky flex-1"
                      placeholder="ชื่อที่แสดง"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      maxLength={30}
                    />
                    <button type="submit" className="btn-primary px-3" disabled={profileLoading}>
                      {profileLoading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                    </button>
                    <button type="button" onClick={() => {setEditingName(false); setDisplayName(profile?.display_name || '')}}
                      className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600">
                      <X size={16}/>
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-white">{profile?.display_name || '-'}</span>
                    <button onClick={() => setEditingName(true)} className="text-blue-400 hover:text-blue-300">
                      <Edit2 size={16}/>
                    </button>
                  </div>
                )}
              </div>

              {/* Email (read only) */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1.5 block">อีเมล</label>
                <div className="p-3 rounded-lg bg-white/5 text-gray-400">
                  {user?.email}
                </div>
              </div>

              {/* User ID */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">รหัสผู้ใช้</label>
                <div className="p-3 rounded-lg bg-white/5 text-gray-500 text-xs font-mono truncate">
                  {user?.id}
                </div>
              </div>
            </div>
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
