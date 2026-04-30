import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AdminIndex() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/dashboard')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1a' }}>
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/>
    </div>
  )
}
