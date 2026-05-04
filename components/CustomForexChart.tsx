import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Activity } from 'lucide-react'

interface CustomForexChartProps {
  symbol: string
  height?: number
  isMarketOpen?: boolean
}

interface CandleData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
}

export default function CustomForexChart({ symbol, height = 280, isMarketOpen = true }: CustomForexChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [candles, setCandles] = useState<CandleData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<{value: number, percent: number} | null>(null)
  const subscriptionRef = useRef<any>(null)

  // Generate OHLC candles from price points
  const generateCandles = (pricePoints: {price: number, timestamp: string}[]): CandleData[] => {
    if (pricePoints.length === 0) return []
    
    const candles: CandleData[] = []
    const interval = 5 // 5 minute candles
    
    for (let i = 0; i < pricePoints.length - interval; i += interval) {
      const slice = pricePoints.slice(i, i + interval)
      const prices = slice.map(p => p.price)
      
      candles.push({
        timestamp: slice[Math.floor(slice.length / 2)].timestamp,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1]
      })
    }
    
    return candles
  }

  // Fetch price history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      
      // Get forex data
      const { data: forex } = await supabase
        .from('custom_forex_pairs')
        .select('id, current_price, base_price, price_volatility')
        .eq('symbol', symbol)
        .single()
      
      if (!forex) {
        setLoading(false)
        return
      }
      
      setCurrentPrice(forex.current_price)
      const baseChange = ((forex.current_price - forex.base_price) / forex.base_price) * 100
      setPriceChange({
        value: forex.current_price - forex.base_price,
        percent: baseChange
      })
      
      // Get last 200 price points for more candles
      const { data } = await supabase
        .from('custom_forex_price_history')
        .select('price, timestamp')
        .eq('forex_id', forex.id)
        .order('timestamp', { ascending: true })
        .limit(200)
      
      if (data && data.length > 10) {
        const candleData = generateCandles(data)
        setCandles(candleData)
      } else {
        // Generate realistic mock candles
        const mockCandles: CandleData[] = []
        const now = new Date()
        let lastClose = forex.current_price
        
        for (let i = 39; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 300000) // 5 minute intervals
          const volatility = forex.price_volatility * lastClose
          const trend = (i / 40) * (forex.current_price - forex.base_price) * 0.5
          
          const open = lastClose
          const close = open + (Math.random() - 0.5) * 2 * volatility + trend * 0.1
          const high = Math.max(open, close) + Math.random() * volatility * 0.5
          const low = Math.min(open, close) - Math.random() * volatility * 0.5
          
          mockCandles.push({
            timestamp: time.toISOString(),
            open,
            high,
            low,
            close
          })
          lastClose = close
        }
        setCandles(mockCandles)
      }
      setLoading(false)
    }
    
    fetchHistory()
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`forex-${symbol}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_forex_pairs',
        filter: `symbol=eq.${symbol}`
      }, (payload) => {
        if (payload.new && 'current_price' in payload.new) {
          setCurrentPrice(payload.new.current_price as number)
          // Add new candle point
          const newCandle: CandleData = {
            timestamp: new Date().toISOString(),
            open: payload.new.current_price as number,
            high: payload.new.current_price as number,
            low: payload.new.current_price as number,
            close: payload.new.current_price as number
          }
          setCandles(prev => [...prev.slice(-49), newCandle])
        }
      })
      .subscribe()
    
    subscriptionRef.current = channel
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [symbol])

  // Draw candlestick chart
  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size (retina)
    const dpr = window.devicePixelRatio || 2
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    
    const width = canvas.offsetWidth
    const chartHeight = height
    const padding = { top: 30, bottom: 25, left: 10, right: 60 }
    const chartW = width - padding.left - padding.right
    const chartH = chartHeight - padding.top - padding.bottom
    
    // Clear
    ctx.fillStyle = '#0b1121'
    ctx.fillRect(0, 0, width, chartHeight)
    
    // Calculate min/max
    const allPrices = candles.flatMap(c => [c.high, c.low])
    const minPrice = Math.min(...allPrices) * 0.998
    const maxPrice = Math.max(...allPrices) * 1.002
    const priceRange = maxPrice - minPrice
    
    const getY = (price: number) => padding.top + chartH - ((price - minPrice) / priceRange) * chartH
    const getX = (index: number) => padding.left + (index / (candles.length - 1)) * chartW
    
    // Draw grid
    ctx.strokeStyle = 'rgba(59, 127, 212, 0.06)'
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }
    
    // Draw candles
    const candleWidth = Math.max(2, (chartW / candles.length) * 0.6)
    
    candles.forEach((candle, i) => {
      const x = getX(i)
      const yOpen = getY(candle.open)
      const yClose = getY(candle.close)
      const yHigh = getY(candle.high)
      const yLow = getY(candle.low)
      
      const isGreen = candle.close >= candle.open
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444'
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444'
      
      // Draw wick
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, yHigh)
      ctx.lineTo(x, yLow)
      ctx.stroke()
      
      // Draw body
      const bodyTop = Math.min(yOpen, yClose)
      const bodyHeight = Math.max(1, Math.abs(yClose - yOpen))
      ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight)
    })
    
    // Draw current price line
    if (currentPrice) {
      const y = getY(currentPrice)
      ctx.strokeStyle = '#0ea5e9'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    // Draw price scale (right side)
    ctx.fillStyle = '#64748b'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    
    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (priceRange / 4) * i
      const y = padding.top + chartH - (chartH / 4) * i
      ctx.fillText(price.toFixed(4), width - padding.right + 5, y + 3)
    }
    
    // Draw time labels
    ctx.textAlign = 'center'
    const timeIndices = [0, Math.floor(candles.length / 2), candles.length - 1]
    timeIndices.forEach(i => {
      if (candles[i]) {
        const x = getX(i)
        const time = new Date(candles[i].timestamp)
        const label = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
        ctx.fillText(label, x, chartHeight - 8)
      }
    })
  }, [candles, height, currentPrice])

  if (loading) {
    return (
      <div className="h-[280px] bg-[#0b1121] rounded-lg flex flex-col items-center justify-center gap-3 border border-blue-500/20">
        <Activity size={32} className="text-blue-400 animate-pulse" />
        <p className="text-gray-400 text-sm">กำลังโหลดกราฟ...</p>
      </div>
    )
  }

  const isPositive = (priceChange?.value || 0) >= 0
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400'
  const changeBg = isPositive ? 'bg-green-400/10' : 'bg-red-400/10'

  return (
    <div className="relative h-[280px] bg-[#0b1121] rounded-lg overflow-hidden border border-blue-500/20">
      {/* Header with price info */}
      <div className="absolute top-0 left-0 right-0 px-3 py-2 flex items-center justify-between bg-gradient-to-b from-[#0b1121] to-transparent z-10">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">{symbol}</span>
          {!isMarketOpen && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-medium rounded">
              ตลาดปิด
            </span>
          )}
        </div>
        {currentPrice && priceChange && (
          <div className="flex items-center gap-2">
            <span className="text-white font-mono font-bold text-sm">
              ฿{currentPrice.toFixed(4)}
            </span>
            <span className={`px-2 py-0.5 ${changeBg} ${changeColor} text-[10px] font-medium rounded`}>
              {isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '280px' }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-1 right-2 flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-green-500"></span> ขึ้น
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-500"></span> ลง
        </span>
        <span>5นาที</span>
      </div>
    </div>
  )
}
