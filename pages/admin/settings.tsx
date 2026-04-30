import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { ADMIN_EMAILS } from '../../lib/admin'
import { 
  Settings, Shield, Users, Save, Loader2,
  Plus, Trash2, AlertTriangle
} from 'lucide-react'

export default function AdminSettings() {
  const [adminEmails, setAdminEmails] = useState<string[]>(ADMIN_EMAILS)
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Note: In a real app, you'd save this to a database or env variable
  // For now, this just updates the local state

  function handleAddEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'กรุณาใส่อีเมลที่ถูกต้อง' })
      return
    }
    if (adminEmails.includes(newEmail.toLowerCase())) {
      setMessage({ type: 'error', text: 'อีเมลนี้อยู่ในรายการแล้ว' })
      return
    }
    setAdminEmails([...adminEmails, newEmail.toLowerCase()])
    setNewEmail('')
    setMessage({ type: 'success', text: 'เพิ่มอีเมลสำเร็จ (อย่าลืมอัปเดตในไฟล์ lib/admin.ts)' })
  }

  function handleRemoveEmail(email: string) {
    if (adminEmails.length <= 1) {
      setMessage({ type: 'error', text: 'ต้องมีอีเมลแอดมินอย่างน้อย 1 อีเมล' })
      return
    }
    setAdminEmails(adminEmails.filter(e => e !== email))
    setMessage({ type: 'success', text: 'ลบอีเมลสำเร็จ (อย่าลืมอัปเดตในไฟล์ lib/admin.ts)' })
  }

  return (
    <AdminLayout activeTab="settings">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">ตั้งค่าระบบ</h1>
        <p className="text-gray-500">จัดการการตั้งค่าสำหรับผู้ดูแลระบบ</p>
      </div>

      {/* Alert */}
      <div className="p-4 mb-6 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-start gap-3">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">คำเตือน</p>
          <p className="text-sm opacity-80">
            การเปลี่ยนแปลงในหน้านี้จะมีผลเฉพาะในเซสชั่นปัจจุบันเท่านั้น 
            หากต้องการบันทึกถาวร กรุณาอัปเดตไฟล์ <code className="bg-yellow-500/20 px-1 rounded">lib/admin.ts</code> ด้วย
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Admin Emails Section */}
      <div className="glass rounded-xl overflow-hidden mb-6">
        <div className="p-6 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Shield size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">อีเมลผู้ดูแลระบบ</h2>
              <p className="text-sm text-gray-500">ผู้ใช้ที่มีอีเมลเหล่านี้จะสามารถเข้าถึงแผงควบคุมผู้ดูแลระบบได้</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Current Admins List */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">รายชื่อแอดมินปัจจุบัน</h3>
            <div className="space-y-2">
              {adminEmails.map((email) => (
                <div key={email} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Users size={14} className="text-red-400" />
                    </div>
                    <span className="text-white font-mono text-sm">{email}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="ลบออกจากรายการ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Admin */}
          <form onSubmit={handleAddEmail} className="flex gap-2">
            <input
              type="email"
              placeholder="เพิ่มอีเมลแอดมินใหม่..."
              className="input-sky flex-1"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 px-4"
            >
              <Plus size={18} />
              เพิ่ม
            </button>
          </form>
        </div>
      </div>

      {/* Code Reference */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings size={20} className="text-blue-400" />
            การตั้งค่าในโค้ด
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-4">
            หากต้องการบันทึกการเปลี่ยนแปลงถาวร กรุณาอัปเดตไฟล์:
          </p>
          <code className="block p-4 rounded-lg bg-black/50 text-green-400 font-mono text-sm overflow-x-auto">
            {`// lib/admin.ts
export const ADMIN_EMAILS = [
${adminEmails.map(e => `  '${e}',`).join('\n')}
]`}
          </code>
        </div>
      </div>
    </AdminLayout>
  )
}
