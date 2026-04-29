import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { Upload, CheckCircle, XCircle, Loader2, AlertCircle, CreditCard } from 'lucide-react'

type DepositStatus = 'idle' | 'uploading' | 'verifying' | 'success' | 'error'

export default function DepositPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      setUser(data.session.user)
      loadWallet(data.session.user.id)
      loadHistory(data.session.user.id)
    })
  }, [])

  async function loadWallet(userId: string) {
    const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single()
    setWallet(data)
  }

  async function loadHistory(userId: string) {
    const { data } = await supabase.from('deposits').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    setHistory(data || [])
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('ขนาดไฟล์ต้องไม่เกิน 5MB')
      return
    }
    setSlipFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setSlipPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setMessage('')
  }

  async function handleDeposit() {
    if (!slipFile || !user) return
    const amt = parseFloat(amount)
    if (!amt || amt < 100) {
      setMessage('ยอดฝากขั้นต่ำ 100 บาท')
      return
    }

    setStatus('uploading')
    setMessage('กำลังอัพโหลด slip...')

    // Upload slip to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_slip.jpg`
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('slips')
      .upload(fileName, slipFile, { contentType: slipFile.type })

    if (uploadError) {
      setStatus('error')
      setMessage('อัพโหลดไม่สำเร็จ: ' + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from('slips').getPublicUrl(fileName)

    setStatus('verifying')
    setMessage('กำลังตรวจสอบ slip ด้วย SlipOk...')

    // Call our API to verify with SlipOk
    const base64 = await fileToBase64(slipFile)
    const res = await fetch('/api/verify-slip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slipBase64: base64,
        amount: amt,
        slipUrl: urlData.publicUrl,
        userId: user.id,
      })
    })

    const result = await res.json()

    if (result.success) {
      setStatus('success')
      setMessage(`ยืนยันสำเร็จ! เติมเงิน ฿${amt.toLocaleString()} เข้า Real Balance แล้ว`)
      await loadWallet(user.id)
      await loadHistory(user.id)
      setSlipFile(null)
      setSlipPreview(null)
      setAmount('')
    } else {
      setStatus('error')
      setMessage(result.message || 'ตรวจสอบ slip ไม่สำเร็จ กรุณาลองใหม่หรือติดต่อ support')
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const statusColor = {
    idle: '', uploading: 'text-blue-400', verifying: 'text-yellow-400',
    success: 'text-green-400', error: 'text-red-400'
  }

  return (
    <div className="min-h-screen" style={{ background: '#060d1a' }}>
      <Navbar user={user} wallet={wallet}/>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <CreditCard size={24} className="text-blue-400"/> ฝากเงินเข้า Real Account
        </h1>
        <p className="text-sm text-gray-500 mb-8">ฝากเงินผ่านการโอนพร้อมเพย์ แล้วแนบสลิปเพื่อยืนยัน</p>

        {/* Bank info */}
        <div className="glass p-5 mb-6">
          <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wide">บัญชีปลายทาง</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'rgba(59,127,212,0.1)' }}>🏦</div>
            <div>
              <p className="font-semibold text-white">ธนาคารกรุงไทย</p>
              <p className="text-blue-300 font-mono text-lg font-bold">XXX-X-XXXXX-X</p>
              <p className="text-xs text-gray-500">SkyTrading Co., Ltd.</p>
            </div>
          </div>
          <div className="mt-3 px-3 py-2 rounded text-xs"
            style={{ background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.15)', color: '#fac775' }}>
            ⚠️ ระบุชื่อ-นามสกุลในโน้ตการโอน เพื่อความรวดเร็วในการตรวจสอบ
          </div>
        </div>

        {/* Deposit form */}
        <div className="glass p-6 mb-6">
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1.5 block">ยอดที่โอน (บาท)</label>
            <input
              type="number"
              className="input-sky text-lg font-mono"
              placeholder="1000"
              min="100"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Slip upload */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1.5 block">แนบสลิปการโอน</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-xl cursor-pointer flex flex-col items-center justify-center py-8 transition-colors"
              style={{ border: '2px dashed rgba(59,127,212,0.3)', background: 'rgba(59,127,212,0.03)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) {
                  const fakeEvent = { target: { files: [file] } } as any
                  handleFileChange(fakeEvent)
                }
              }}
            >
              {slipPreview ? (
                <img src={slipPreview} alt="slip" className="max-h-48 rounded-lg object-contain"/>
              ) : (
                <>
                  <Upload size={32} className="text-blue-400 mb-2"/>
                  <p className="text-sm text-gray-400">คลิกหรือลาก slip มาวาง</p>
                  <p className="text-xs text-gray-600 mt-1">PNG, JPG สูงสุด 5MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
          </div>

          {/* Status message */}
          {message && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
              status === 'success' ? 'bg-green-400/10 border border-green-400/20' :
              status === 'error' ? 'bg-red-400/10 border border-red-400/20' :
              'bg-blue-400/10 border border-blue-400/20'
            } ${statusColor[status]}`}>
              {status === 'success' && <CheckCircle size={16}/>}
              {status === 'error' && <XCircle size={16}/>}
              {(status === 'uploading' || status === 'verifying') && <Loader2 size={16} className="animate-spin"/>}
              {message}
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={!slipFile || !amount || status === 'uploading' || status === 'verifying'}
            className="btn-primary flex items-center justify-center gap-2">
            {(status === 'uploading' || status === 'verifying') && <Loader2 size={16} className="animate-spin"/>}
            ยืนยันการฝากเงิน
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="glass p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">ประวัติการฝากเงิน</h3>
            <div className="space-y-2">
              {history.map(dep => (
                <div key={dep.id} className="flex items-center justify-between text-xs py-2 border-b"
                  style={{ borderColor: 'rgba(59,127,212,0.08)' }}>
                  <div>
                    <span className="text-white font-mono">฿{dep.amount?.toLocaleString('th-TH')}</span>
                    <span className="text-gray-600 ml-2">{new Date(dep.created_at).toLocaleDateString('th-TH')}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${
                    dep.status === 'verified' ? 'text-green-400 bg-green-400/10' :
                    dep.status === 'rejected' ? 'text-red-400 bg-red-400/10' :
                    'text-yellow-400 bg-yellow-400/10'
                  }`}>
                    {dep.status === 'verified' ? 'ยืนยันแล้ว' : dep.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
