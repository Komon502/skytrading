import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { isAdmin } from '../lib/admin'
import {
  BarChart2, User, Wallet, LogOut, Settings,
  ChevronDown, Menu, X, TrendingUp, Home,
  CreditCard, Shield, PieChart, LayoutDashboard,
  Globe, DollarSign, Bitcoin
} from 'lucide-react'

interface NavbarProps {
  user: any
  wallet?: { demo_balance: number; real_balance: number } | null
  mode?: 'demo' | 'real'
  onModeChange?: (mode: 'demo' | 'real') => void
}

export default function Navbar({ user, wallet, mode, onModeChange }: NavbarProps) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userIsAdmin = isAdmin(user?.email)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b" style={{
        background: 'rgba(6,13,26,0.95)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(59,127,212,0.15)'
      }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1b4070, #3b7fd4)' }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-white tracking-wide text-lg">
              Sky<span style={{ color: '#3b7fd4' }}>Trading</span>
            </span>
          </Link>

          {/* Center nav links (desktop) */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              <Link href="/trade" className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                router.pathname === '/' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white'
              }`}>
                <span className="flex items-center gap-1.5"><Home size={14}/> หน้าหลัก</span>
              </Link>
              <Link href="/trade" className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                router.pathname === '/trade' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white'
              }`}>
                <span className="flex items-center gap-1.5"><BarChart2 size={14}/> เทรดหุ้น</span>
              </Link>
              <Link href="/forex" className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                router.pathname === '/forex' ? 'text-white bg-purple-500/20 border border-purple-500/30' : 'text-purple-400 hover:text-purple-300'
              }`}>
                <span className="flex items-center gap-1.5"><Globe size={14}/> Forex Synthetic</span>
              </Link>
              <Link href="/crypto" className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                router.pathname === '/crypto' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white'
              }`}>
                <span className="flex items-center gap-1.5"><Bitcoin size={14}/> Crypto</span>
              </Link>
              <Link href="/portfolio" className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                router.pathname === '/portfolio' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white'
              }`}>
                <span className="flex items-center gap-1.5"><PieChart size={14}/> พอร์ต</span>
              </Link>
              <Link href="/deposit" className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                router.pathname === '/deposit' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white'
              }`}>
                <span className="flex items-center gap-1.5"><CreditCard size={14}/> ฝากเงิน</span>
              </Link>
              {userIsAdmin && (
                <Link href="/admin/dashboard" className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  router.pathname.startsWith('/admin') ? 'text-white bg-red-500/20 border border-red-500/30' : 'text-red-400 hover:text-red-300'
                }`}>
                  <span className="flex items-center gap-1.5"><LayoutDashboard size={14}/> แอดมิน</span>
                </Link>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Mode toggle */}
            {user && mode && onModeChange && (
              <div className="hidden sm:flex items-center rounded-lg p-1" style={{
                background: 'rgba(10,22,40,0.8)',
                border: '1px solid rgba(59,127,212,0.2)'
              }}>
                <button
                  onClick={() => onModeChange('demo')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    mode === 'demo'
                      ? 'text-yellow-300 bg-yellow-400/10 border border-yellow-400/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  DEMO
                </button>
                <button
                  onClick={() => onModeChange('real')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    mode === 'real'
                      ? 'text-green-400 bg-green-400/10 border border-green-400/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  REAL
                </button>
              </div>
            )}

            {/* Balance display */}
            {user && wallet && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid rgba(59,127,212,0.15)' }}>
                <Wallet size={12} className="text-blue-400" />
                <span className="text-gray-400">{mode === 'demo' ? 'Demo:' : 'Real:'}</span>
                <span className="font-mono font-semibold text-white">
                  ฿{(mode === 'demo' ? wallet.demo_balance : wallet.real_balance).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Profile burger (user signed in) */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #1b4070, #3b7fd4)' }}>
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl py-1 z-50 animate-fadein"
                    style={{
                      background: 'rgba(10,22,40,0.98)',
                      border: '1px solid rgba(59,127,212,0.2)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                    }}>
                    {/* User info */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(59,127,212,0.1)' }}>
                      <p className="text-xs text-gray-400">ล็อกอินในชื่อ</p>
                      <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    </div>
                    {/* Balances */}
                    {wallet && (
                      <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(59,127,212,0.1)' }}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-yellow-400 font-semibold">DEMO</span>
                          <span className="text-gray-300 font-mono">฿{wallet.demo_balance.toLocaleString('th-TH', {maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-400 font-semibold">REAL</span>
                          <span className="text-gray-300 font-mono">฿{wallet.real_balance.toLocaleString('th-TH', {maximumFractionDigits: 2})}</span>
                        </div>
                      </div>
                    )}
                    {/* Menu items */}
                    <Link href="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setProfileOpen(false)}>
                      <User size={15}/> โปรไฟล์
                    </Link>
                    <Link href="/deposit" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setProfileOpen(false)}>
                      <CreditCard size={15}/> ฝากเงิน
                    </Link>
                    <Link href="/profile?tab=history" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setProfileOpen(false)}>
                      <BarChart2 size={15}/> ประวัติเทรด
                    </Link>
                    <Link href="/profile?tab=security" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setProfileOpen(false)}>
                      <Shield size={15}/> ความปลอดภัย
                    </Link>
                    <div className="border-t my-1" style={{ borderColor: 'rgba(59,127,212,0.1)' }}/>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/5 transition-colors w-full text-left">
                      <LogOut size={15}/> ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth" className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }}>
                เข้าสู่ระบบ
              </Link>
            )}

            {/* Mobile hamburger */}
            {user && (
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
                {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && user && (
          <div className="md:hidden border-t animate-fadein" style={{ borderColor: 'rgba(59,127,212,0.1)', background: 'rgba(6,13,26,0.98)' }}>
            <div className="px-4 py-3 space-y-1">
              {mode && onModeChange && (
                <div className="flex gap-2 mb-3">
                  <button onClick={() => onModeChange('demo')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'demo' ? 'mode-demo' : 'text-gray-500 border border-gray-700'}`}>
                    DEMO MODE
                  </button>
                  <button onClick={() => onModeChange('real')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'real' ? 'mode-real' : 'text-gray-500 border border-gray-700'}`}>
                    REAL MODE
                  </button>
                </div>
              )}
              <Link href="/" className="flex items-center gap-2 py-2.5 text-gray-300" onClick={() => setMobileOpen(false)}><Home size={16}/>หน้าหลัก</Link>
              <Link href="/trade" className="flex items-center gap-2 py-2.5 text-gray-300" onClick={() => setMobileOpen(false)}><BarChart2 size={16}/>เทรดหุ้น</Link>
              <Link href="/forex" className="flex items-center gap-2 py-2.5 text-gray-300" onClick={() => setMobileOpen(false)}><Globe size={16}/>Forex</Link>
              <Link href="/crypto" className="flex items-center gap-2 py-2.5 text-gray-300" onClick={() => setMobileOpen(false)}><Bitcoin size={16}/>Crypto</Link>
              <Link href="/portfolio" className="flex items-center gap-2 py-2.5 text-gray-300" onClick={() => setMobileOpen(false)}><PieChart size={16}/>พอร์ต</Link>
              <Link href="/deposit" className="flex items-center gap-2 py-2.5 text-gray-300" onClick={() => setMobileOpen(false)}><CreditCard size={16}/>ฝากเงิน</Link>
              <Link href="/profile" className="flex items-center gap-2 py-2.5 text-gray-300" onClick={() => setMobileOpen(false)}><User size={16}/>โปรไฟล์</Link>
              {userIsAdmin && (
                <Link href="/admin/dashboard" className="flex items-center gap-2 py-2.5 text-red-400" onClick={() => setMobileOpen(false)}><LayoutDashboard size={16}/>แอดมิน</Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
