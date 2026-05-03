import { useEffect, useRef } from 'react'

interface TradingChartProps {
  symbol: string
  isCrypto?: boolean
  isForex?: boolean
  height?: number
  isMobile?: boolean
}

// Maps our symbols to TradingView format
function getTVSymbol(symbol: string, isCrypto: boolean, isForex?: boolean): string {
  if (isCrypto) {
    // Binance crypto: BTCUSDT -> BINANCE:BTCUSDT
    return `BINANCE:${symbol}`
  }
  if (isForex) {
    // Forex: EURUSD -> OANDA:EURUSD (OANDA broker on TradingView)
    return `OANDA:${symbol}`
  }
  // US stocks: AAPL -> NASDAQ:AAPL or NYSE:AAPL
  const nasdaq = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL']
  if (nasdaq.includes(symbol)) return `NASDAQ:${symbol}`
  // ETFs
  if (['SPY', 'QQQ', 'DIA'].includes(symbol)) return `AMEX:${symbol}`
  return `NYSE:${symbol}`
}

export default function TradingChart({ symbol, isCrypto = false, isForex = false, height = 400, isMobile = false }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clean up previous widget
    if (widgetRef.current) {
      containerRef.current.innerHTML = ''
    }

    const tvSymbol = getTVSymbol(symbol, isCrypto, isForex)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Asia/Bangkok',
      theme: 'dark',
      style: '1', // Candlestick
      locale: 'th_TH',
      enable_publishing: false,
      allow_symbol_change: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: 'rgba(6, 13, 26, 1)',
      gridColor: 'rgba(59, 127, 212, 0.08)',
      hide_top_toolbar: isMobile, // Hide on mobile - toolbar buttons don't work on touch
      hide_side_toolbar: isMobile, // Hide side toolbar on mobile too
      hide_legend: false,
      save_image: false,
      studies: isMobile ? [] : ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'], // Remove studies on mobile for cleaner view
    })

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.height = `${height}px`
    container.style.width = '100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.height = `${height}px`
    inner.style.width = '100%'

    container.appendChild(inner)
    container.appendChild(script)

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(container)

    widgetRef.current = container
  }, [symbol, isCrypto, isForex, height, isMobile])

  return (
    <div ref={containerRef} style={{ height, width: '100%', background: '#060d1a', borderRadius: 8, overflow: 'hidden' }} />
  )
}
