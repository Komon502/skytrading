import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

interface CustomForexChartProps {
  symbol: string
  height?: number
}

interface PricePoint {
  timestamp: string
  price: number
}

export default function CustomForexChart({ symbol, height = 280 }: CustomForexChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch price history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      
      // Get forex ID first
      const { data: forex } = await supabase
        .from('custom_forex_pairs')
        .select('id')
        .eq('symbol', symbol)
        .single()
      
      if (!forex) {
        setLoading(false)
        return
      }
      
      // Get last 100 price points
      const { data } = await supabase
        .from('custom_forex_price_history')
        .select('price, timestamp')
        .eq('forex_id', forex.id)
        .order('timestamp', { ascending: true })
        .limit(100)
      
      if (data && data.length > 0) {
        setPriceHistory(data)
      } else {
        // If no history, create some mock data based on current price
        const { data: currentData } = await supabase
          .from('custom_forex_pairs')
          .select('current_price, base_price, price_volatility')
          .eq('symbol', symbol)
          .single()
        
        if (currentData) {
          const mockData: PricePoint[] = []
          const now = new Date()
          for (let i = 99; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60000) // 1 minute intervals
            const randomMove = (Math.random() - 0.5) * 2 * currentData.price_volatility * currentData.current_price
            mockData.push({
              timestamp: time.toISOString(),
              price: currentData.current_price + randomMove * (i / 50) // Trend towards current
            })
          }
          setPriceHistory(mockData)
        }
      }
      setLoading(false)
    }
    
    fetchHistory()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHistory, 30000)
    return () => clearInterval(interval)
  }, [symbol])

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || priceHistory.length === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * 2 // Retina display
    canvas.height = height * 2
    canvas.style.width = canvas.offsetWidth + 'px'
    canvas.style.height = height + 'px'
    
    // Scale for retina
    ctx.scale(2, 2)
    
    const width = canvas.offsetWidth
    const chartHeight = height
    
    // Clear
    ctx.fillStyle = '#060d1a'
    ctx.fillRect(0, 0, width, chartHeight)
    
    // Calculate min/max for scaling
    const prices = priceHistory.map(p => p.price)
    const minPrice = Math.min(...prices) * 0.999
    const maxPrice = Math.max(...prices) * 1.001
    const priceRange = maxPrice - minPrice
    
    // Draw grid
    ctx.strokeStyle = 'rgba(59, 127, 212, 0.08)'
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = (width / 5) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, chartHeight)
      ctx.stroke()
    }
    
    // Draw price line
    ctx.strokeStyle = '#0ea5e9'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    priceHistory.forEach((point, index) => {
      const x = (index / (priceHistory.length - 1)) * width
      const y = chartHeight - ((point.price - minPrice) / priceRange) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    // Draw gradient fill under line
    ctx.beginPath()
    priceHistory.forEach((point, index) => {
      const x = (index / (priceHistory.length - 1)) * width
      const y = chartHeight - ((point.price - minPrice) / priceRange) * chartHeight
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(width, chartHeight)
    ctx.lineTo(0, chartHeight)
    ctx.closePath()
    
    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight)
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)')
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0)')
    ctx.fillStyle = gradient
    ctx.fill()
    
    // Draw current price dot
    const lastPrice = priceHistory[priceHistory.length - 1].price
    const lastY = chartHeight - ((lastPrice - minPrice) / priceRange) * chartHeight
    
    ctx.fillStyle = '#0ea5e9'
    ctx.beginPath()
    ctx.arc(width - 10, lastY, 5, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw price labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    
    // Top price
    ctx.fillText(maxPrice.toFixed(4), width - 10, 15)
    // Bottom price
    ctx.fillText(minPrice.toFixed(4), width - 10, chartHeight - 5)
    
    // Draw time labels
    ctx.textAlign = 'center'
    const timeLabels = [0, Math.floor(priceHistory.length / 2), priceHistory.length - 1]
    timeLabels.forEach(index => {
      if (priceHistory[index]) {
        const x = (index / (priceHistory.length - 1)) * width
        const time = new Date(priceHistory[index].timestamp)
        const label = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
        ctx.fillText(label, x, chartHeight - 5)
      }
    })
  }, [priceHistory, height])

  if (loading) {
    return (
      <div className="h-[280px] bg-[#060d1a] rounded-lg flex items-center justify-center">
        <p className="text-gray-400">กำลังโหลดกราฟ...</p>
      </div>
    )
  }

  return (
    <div className="relative h-[280px] bg-[#060d1a] rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '280px' }}
      />
      {priceHistory.length > 0 && (
        <div className="absolute top-2 left-2 text-xs">
          <span className="text-gray-400">ราคาล่าสุด: </span>
          <span className="text-white font-mono font-bold">
            ฿{priceHistory[priceHistory.length - 1].price.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  )
}
