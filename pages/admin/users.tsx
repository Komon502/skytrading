import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import { 
  Users, Search, Loader2, Eye, Wallet, BarChart2,
  ArrowLeft, ArrowRight, User
} from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    loadUsers()
  }, [page, search])

  async function loadUsers() {
    setLoading(true)
    
    let query = supabase
      .from('user_profiles')
      .select('*, wallets(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,id.eq.${search}`)
    }
    
    const { data, count, error } = await query
    
    if (error) {
      console.error('Failed to load users:', error)
    } else {
      setUsers(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  async function viewUserDetails(user: any) {
    setSelectedUser(user)
    
    // Load user's trades
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    // Load user's deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    setUserDetails({ trades: trades || [], deposits: deposits || [] })
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <AdminLayout activeTab="users">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">จัดการผู้ใช้งาน</h1>
          <p className="text-gray-500 text-sm">ดูและจัดการบัญชีผู้ใช้ทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">ทั้งหมด {totalCount} คน</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อหรือ ID..."
            className="input-sky pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(0)}
          />
        </div>
        <button 
          onClick={() => { setPage(0); loadUsers() }}
          className="btn-primary px-4"
        >
          ค้นหา
        </button>
      </div>

      {/* Users Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-400" size={32} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">ไม่พบผู้ใช้งาน</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
                  <th className="text-left p-4 font-medium">ผู้ใช้</th>
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-right p-4 font-medium">Demo Balance</th>
                  <th className="text-right p-4 font-medium">Real Balance</th>
                  <th className="text-center p-4 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(59,127,212,0.06)' }}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center font-bold text-blue-400">
                          {user.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.display_name || 'ไม่มีชื่อ'}</p>
                          <p className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString('th-TH')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                        {user.id.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-yellow-400 font-mono">
                        ฿{user.wallets?.demo_balance?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-green-400 font-mono">
                        ฿{user.wallets?.real_balance?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="p-4 border-t flex justify-between items-center" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
              <span className="text-sm text-gray-500">
                หน้า {page + 1} / {totalPages || 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="glass rounded-xl w-full max-w-3xl max-h-[80vh] overflow-auto">
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center font-bold text-blue-400 text-xl">
                  {selectedUser.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedUser.display_name || 'ไม่มีชื่อ'}</h2>
                  <p className="text-xs text-gray-500">{selectedUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedUser(null); setUserDetails(null) }}
                className="p-2 rounded-lg text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* User Stats */}
            <div className="p-4 grid grid-cols-2 gap-4 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <p className="text-xs text-yellow-400 mb-1">Demo Balance</p>
                <p className="text-xl font-bold text-white">฿{selectedUser.wallets?.demo_balance?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-green-400 mb-1">Real Balance</p>
                <p className="text-xl font-bold text-white">฿{selectedUser.wallets?.real_balance?.toLocaleString() || 0}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <BarChart2 size={16} className="text-blue-400" />
                ประวัติการเทรด ({userDetails?.trades?.length || 0})
              </h3>
              {userDetails?.trades?.length === 0 ? (
                <p className="text-sm text-gray-500">ไม่มีประวัติการเทรด</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {userDetails?.trades?.map((trade: any) => (
                    <div key={trade.id} className="p-3 rounded-lg bg-white/5 flex justify-between items-center">
                      <div>
                        <span className={`text-sm font-medium ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.type.toUpperCase()}
                        </span>
                        <span className="text-white ml-2">{trade.symbol}</span>
                        <span className="text-gray-500 text-sm ml-2">@{trade.price}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{trade.quantity} หน่วย</p>
                        <p className={`text-xs ${trade.status === 'open' ? 'text-blue-400' : 'text-gray-500'}`}>
                          {trade.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="font-semibold text-white mt-6 mb-3 flex items-center gap-2">
                <Wallet size={16} className="text-blue-400" />
                ประวัติการฝากเงิน ({userDetails?.deposits?.length || 0})
              </h3>
              {userDetails?.deposits?.length === 0 ? (
                <p className="text-sm text-gray-500">ไม่มีประวัติการฝาก</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {userDetails?.deposits?.map((deposit: any) => (
                    <div key={deposit.id} className="p-3 rounded-lg bg-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-white font-medium">฿{deposit.amount.toLocaleString()}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          deposit.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                          deposit.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {deposit.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(deposit.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
