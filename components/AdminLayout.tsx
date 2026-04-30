import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { isAdmin, ADMIN_NAV } from '../lib/admin'
import {
  LayoutDashboard, Users, CreditCard, BarChart2, Settings,
  LogOut, Shield, Menu, X, ChevronRight
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, CreditCard, BarChart2, Settings
}

export default function AdminLayout({ children, activeTab = 'dashboard' }: AdminLayoutProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth')
        return
      }
      
      const email = data.session.user.email
      if (!isAdmin(email)) {
        router.replace('/') // Not admin, redirect to home
        return
      }
      
      setUser(data.session.user)
      setLoading(false)
    })
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1a' }}>
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#060d1a' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        border-r flex flex-col
      `} style={{ 
        background: 'rgba(6,13,26,0.98)',
        borderColor: 'rgba(59,127,212,0.15)'
      }}>
        {/* Admin Header */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(59,127,212,0.15)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">SkyTrading</h1>
              <p className="text-xs text-red-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Admin Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {ADMIN_NAV.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard
            const isActive = activeTab === item.id
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                {item.label}
                {isActive && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User info & Logout */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(59,127,212,0.15)' }}>
          <div className="mb-3">
            <p className="text-sm text-white font-medium truncate">{user?.email}</p>
            <p className="text-xs text-red-400">Administrator</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-gray-700"
            >
              หน้าเว็บ
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 px-3 py-2 rounded-lg text-xs text-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border border-red-500/30"
            >
              <LogOut size={12} className="inline mr-1" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b" style={{ 
          background: 'rgba(6,13,26,0.95)',
          borderColor: 'rgba(59,127,212,0.15)'
        }}>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-red-500" />
            <span className="font-bold text-white">Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
