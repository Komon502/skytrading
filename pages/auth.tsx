import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Tab = 'login' | 'register' | 'reset'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/trade')
    })
    // Set tab from query
    if (router.query.tab === 'register') setTab('register')
    if (router.query.tab === 'reset') setTab('reset')
  }, [router.query.tab])

  async function handleLogin() {
    setLoading(true); setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage({ type: 'error', text: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
    } else {
      router.replace('/trade')
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
      return
    }
    setLoading(true); setMessage(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'สมัครสมาชิกสำเร็จ! กรุณายืนยันอีเมล แล้วเข้าสู่ระบบ' })
    }
    setLoading(false)
  }

  async function handleReset() {
    setLoading(true); setMessage(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?tab=updatepass`
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย' })
    }
    setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (tab === 'login') handleLogin()
    else if (tab === 'register') handleRegister()
    else handleReset()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#060d1a' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b7fd4, transparent 70%)' }} />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1b4070, #3b7fd4)' }}>
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Sky<span style={{ color: '#3b7fd4' }}>Trading</span></span>
          </Link>
        </div>

        <div className="glass p-8" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          {/* Tabs */}
          <div className="flex rounded-lg p-1 mb-6" style={{ background: 'rgba(10,22,40,0.8)' }}>
            {[
              { id: 'login', label: 'เข้าสู่ระบบ' },
              { id: 'register', label: 'สมัครสมาชิก' },
              { id: 'reset', label: 'ลืมรหัสผ่าน' },
            ].map(t => (
              <button key={t.id}
                onClick={() => { setTab(t.id as Tab); setMessage(null) }}
                className={`flex-1 py-2 rounded text-xs font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-400/10 border border-green-400/20 text-green-400'
                : 'bg-red-400/10 border border-red-400/20 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">อีเมล</label>
              <input
                type="email"
                className="input-sky"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {tab !== 'reset' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  รหัสผ่าน {tab === 'register' && <span className="text-gray-600">(อย่างน้อย 6 ตัว)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input-sky pr-10"
                    placeholder={tab === 'register' ? 'สร้างรหัสผ่าน' : 'รหัสผ่าน'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            )}

            {tab === 'register' && (
              <div className="px-3 py-2 rounded-lg text-xs text-gray-500"
                style={{ background: 'rgba(59,127,212,0.05)', border: '1px solid rgba(59,127,212,0.1)' }}>
                สมัครสมาชิกฟรี รับ Demo Balance 5,000 บาท ทันที
              </div>
            )}

            <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin"/>}
              {tab === 'login' ? 'เข้าสู่ระบบ' : tab === 'register' ? 'สมัครสมาชิกฟรี' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          ข้อมูลราคาจาก Finnhub & Binance · ข้อมูลมีไว้เพื่อการศึกษาเท่านั้น
        </p>
      </div>
    </div>
  )
}
