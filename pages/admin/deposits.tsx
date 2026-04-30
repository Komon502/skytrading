import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import { 
  CreditCard, Search, Loader2, Check, X, Eye, Download,
  Filter, RefreshCw
} from 'lucide-react'

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all')
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadDeposits()
  }, [filter])

  async function loadDeposits() {
    setLoading(true)
    
    let query = supabase
      .from('deposits')
      .select('*, user_profiles(id, display_name)')
      .order('created_at', { ascending: false })
    
    if (filter !== 'all') {
      query = query.eq('status', filter)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to load deposits:', error)
    } else {
      setDeposits(data || [])
    }
    setLoading(false)
  }

  async function handleVerify(depositId: string, action: 'verified' | 'rejected') {
    setProcessing(depositId)
    
    const deposit = deposits.find(d => d.id === depositId)
    if (!deposit) return

    // Update deposit status
    const { error: depositError } = await supabase
      .from('deposits')
      .update({ 
        status: action,
        verified_at: new Date().toISOString()
      })
      .eq('id', depositId)

    if (depositError) {
      alert('เกิดข้อผิดพลาด: ' + depositError.message)
      setProcessing(null)
      return
    }

    // If verified, add to user's real_balance
    if (action === 'verified') {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('real_balance')
        .eq('user_id', deposit.user_id)
        .single()

      if (wallet) {
        const newBalance = (wallet.real_balance || 0) + deposit.amount
        await supabase
          .from('wallets')
          .update({ real_balance: newBalance })
          .eq('user_id', deposit.user_id)
      }
    }

    // Reload deposits
    await loadDeposits()
    setProcessing(null)
    setSelectedDeposit(null)
  }

  const stats = {
    total: deposits.length,
    pending: deposits.filter(d => d.status === 'pending').length,
    verified: deposits.filter(d => d.status === 'verified').length,
    rejected: deposits.filter(d => d.status === 'rejected').length,
    totalAmount: deposits
      .filter(d => d.status === 'verified')
      .reduce((sum, d) => sum + d.amount, 0)
  }

  return (
    <AdminLayout activeTab="deposits">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">ตรวจสอบการฝากเงิน</h1>
          <p className="text-gray-500 text-sm">ยืนยันหรือปฏิเสธรายการฝากเงิน</p>
        </div>
        <button 
          onClick={loadDeposits}
          className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="ทั้งหมด" value={stats.total} color="blue" />
        <StatCard label="รอตรวจสอบ" value={stats.pending} color="yellow" alert={stats.pending > 0} />
        <StatCard label="ยืนยันแล้ว" value={stats.verified} color="green" />
        <StatCard label="ถูกปฏิเสธ" value={stats.rejected} color="red" />
        <StatCard label="ยอดรวมที่ยืนยัน" value={`฿${stats.totalAmount.toLocaleString()}`} color="purple" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'all', label: 'ทั้งหมด', count: stats.total },
          { id: 'pending', label: 'รอตรวจสอบ', count: stats.pending },
          { id: 'verified', label: 'ยืนยันแล้ว', count: stats.verified },
          { id: 'rejected', label: 'ถูกปฏิเสธ', count: stats.rejected },
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
            <span className="ml-2 text-xs text-gray-500">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Deposits Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-400" size={32} />
          </div>
        ) : deposits.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">ไม่มีรายการฝากเงิน</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
                <th className="text-left p-4 font-medium">วันที่</th>
                <th className="text-left p-4 font-medium">ผู้ใช้</th>
                <th className="text-right p-4 font-medium">จำนวน</th>
                <th className="text-center p-4 font-medium">สถานะ</th>
                <th className="text-center p-4 font-medium">สลิป</th>
                <th className="text-center p-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(59,127,212,0.06)' }}>
                  <td className="p-4">
                    <p className="text-sm text-white">{new Date(deposit.created_at).toLocaleDateString('th-TH')}</p>
                    <p className="text-xs text-gray-500">{new Date(deposit.created_at).toLocaleTimeString('th-TH')}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-white">{deposit.user_profiles?.display_name || 'ไม่มีชื่อ'}</p>
                    <code className="text-xs text-gray-400">{deposit.user_id.slice(0, 8)}...</code>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-lg font-bold text-white">฿{deposit.amount.toLocaleString()}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      deposit.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      deposit.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {deposit.status === 'pending' ? '⏳ รอตรวจสอบ' :
                       deposit.status === 'verified' ? '✓ ยืนยันแล้ว' : '✕ ถูกปฏิเสธ'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {deposit.slip_url ? (
                      <button
                        onClick={() => setSelectedDeposit(deposit)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      >
                        <Eye size={16} />
                      </button>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {deposit.status === 'pending' ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleVerify(deposit.id, 'verified')}
                          disabled={processing === deposit.id}
                          className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm font-medium disabled:opacity-50"
                        >
                          {processing === deposit.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          ยืนยัน
                        </button>
                        <button
                          onClick={() => handleVerify(deposit.id, 'rejected')}
                          disabled={processing === deposit.id}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium disabled:opacity-50"
                        >
                          <X size={14} />
                          ปฏิเสธ
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {new Date(deposit.verified_at || deposit.created_at).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slip Modal */}
      {selectedDeposit?.slip_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="glass rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
              <div>
                <h3 className="font-bold text-white">สลิปการโอนเงิน</h3>
                <p className="text-sm text-gray-500">฿{selectedDeposit.amount.toLocaleString()} - {selectedDeposit.user_profiles?.display_name}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={selectedDeposit.slip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => setSelectedDeposit(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4">
              <img 
                src={selectedDeposit.slip_url} 
                alt="Slip" 
                className="w-full rounded-lg"
              />
            </div>
            {selectedDeposit.status === 'pending' && (
              <div className="p-4 border-t flex gap-3" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
                <button
                  onClick={() => handleVerify(selectedDeposit.id, 'verified')}
                  disabled={processing === selectedDeposit.id}
                  className="flex-1 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  ยืนยันการฝากเงิน
                </button>
                <button
                  onClick={() => handleVerify(selectedDeposit.id, 'rejected')}
                  disabled={processing === selectedDeposit.id}
                  className="flex-1 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  ปฏิเสธ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  color,
  alert
}: { 
  label: string
  value: number | string
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  alert?: boolean
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
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs opacity-80">{label}</span>
        {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
