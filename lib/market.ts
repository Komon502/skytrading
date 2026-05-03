// Real-time market data
// Stocks: Finnhub (free tier: 60 API calls/min)
// Crypto: Binance public API (free, no key needed)

const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY!

// ============ US STOCKS (S&P500 + popular) ============
export const US_STOCKS = [
  // Tech
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Technology' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology' },
  { symbol: 'ORCL', name: 'Oracle Corp.', sector: 'Technology' },
  // Finance
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Finance' },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Finance' },
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  // Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer' },
  { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer' },
  { symbol: 'MCD', name: "McDonald's Corp.", sector: 'Consumer' },
  { symbol: 'SBUX', name: 'Starbucks Corp.', sector: 'Consumer' },
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy' },
  // ETFs
  { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', sector: 'ETF' },
  { symbol: 'DIA', name: 'Dow Jones ETF', sector: 'ETF' },
]

// ============ CRYPTO ============
export const CRYPTOS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', display: 'BTC/USDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum', display: 'ETH/USDT' },
  { symbol: 'BNBUSDT', name: 'BNB', display: 'BNB/USDT' },
  { symbol: 'SOLUSDT', name: 'Solana', display: 'SOL/USDT' },
  { symbol: 'XRPUSDT', name: 'XRP', display: 'XRP/USDT' },
  { symbol: 'ADAUSDT', name: 'Cardano', display: 'ADA/USDT' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', display: 'DOGE/USDT' },
  { symbol: 'MATICUSDT', name: 'Polygon', display: 'MATIC/USDT' },
  { symbol: 'DOTUSDT', name: 'Polkadot', display: 'DOT/USDT' },
  { symbol: 'LINKUSDT', name: 'Chainlink', display: 'LINK/USDT' },
  { symbol: 'LTCUSDT', name: 'Litecoin', display: 'LTC/USDT' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', display: 'AVAX/USDT' },
  { symbol: 'UNIUSDT', name: 'Uniswap', display: 'UNI/USDT' },
  { symbol: 'ATOMUSDT', name: 'Cosmos', display: 'ATOM/USDT' },
]

// ============ FOREX ============
// Major currency pairs with USD
export const FOREX_PAIRS = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', display: 'EUR/USD', base: 'EUR', quote: 'USD' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', display: 'GBP/USD', base: 'GBP', quote: 'USD' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', display: 'USD/JPY', base: 'USD', quote: 'JPY' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', display: 'USD/CHF', base: 'USD', quote: 'CHF' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', display: 'AUD/USD', base: 'AUD', quote: 'USD' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', display: 'USD/CAD', base: 'USD', quote: 'CAD' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', display: 'NZD/USD', base: 'NZD', quote: 'USD' },
  { symbol: 'EURGBP', name: 'Euro / British Pound', display: 'EUR/GBP', base: 'EUR', quote: 'GBP' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen', display: 'EUR/JPY', base: 'EUR', quote: 'JPY' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', display: 'GBP/JPY', base: 'GBP', quote: 'JPY' },
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', display: 'XAU/USD', base: 'XAU', quote: 'USD', isMetal: true },
  { symbol: 'XAGUSD', name: 'Silver / US Dollar', display: 'XAG/USD', base: 'XAG', quote: 'USD', isMetal: true },
]

// Fetch Forex price from Alpha Vantage (free tier available)
// Note: Using a free API - in production you'd want a proper forex data provider
export async function getForexPrice(symbol: string) {
  // For demo purposes, using simulated data with realistic values
  // In production, integrate with real forex API like Alpha Vantage, Finnhub, or OANDA
  const basePrices: Record<string, number> = {
    'EURUSD': 1.0850,
    'GBPUSD': 1.2650,
    'USDJPY': 151.50,
    'USDCHF': 0.9050,
    'AUDUSD': 0.6550,
    'USDCAD': 1.3850,
    'NZDUSD': 0.5950,
    'EURGBP': 0.8580,
    'EURJPY': 164.20,
    'GBPJPY': 191.50,
    'XAUUSD': 2320.50,
    'XAGUSD': 27.80,
  }
  
  const basePrice = basePrices[symbol] || 1.0
  // Add small random fluctuation for realism
  const fluctuation = (Math.random() - 0.5) * 0.002
  const price = basePrice * (1 + fluctuation)
  
  return {
    symbol,
    price,
    change: price - basePrice,
    changePercent: ((price - basePrice) / basePrice) * 100,
    high: price * 1.005,
    low: price * 0.995,
    open: basePrice,
  }
}

// Fetch stock quote from Finnhub
export async function getStockQuote(symbol: string) {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`
  )
  if (!res.ok) throw new Error('Finnhub error')
  const data = await res.json()
  return {
    symbol,
    price: data.c,          // current price
    change: data.d,          // change
    changePercent: data.dp,  // change percent
    high: data.h,
    low: data.l,
    open: data.o,
    prevClose: data.pc,
  }
}

// Fetch crypto price from Binance
export async function getCryptoPrice(symbol: string) {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
  )
  if (!res.ok) throw new Error('Binance error')
  const data = await res.json()
  return {
    symbol,
    price: parseFloat(data.lastPrice),
    change: parseFloat(data.priceChange),
    changePercent: parseFloat(data.priceChangePercent),
    high: parseFloat(data.highPrice),
    low: parseFloat(data.lowPrice),
    volume: parseFloat(data.volume),
  }
}

// WebSocket for real-time crypto (Binance)
export function subscribeCrypto(symbol: string, onPrice: (price: number) => void) {
  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`
  )
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    onPrice(parseFloat(msg.p))
  }
  return () => ws.close()
}

// Finnhub WebSocket for real-time stocks
export function subscribeStock(symbol: string, onPrice: (price: number) => void) {
  const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`)
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'subscribe', symbol }))
  }
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.type === 'trade' && msg.data?.length > 0) {
      onPrice(msg.data[msg.data.length - 1].p)
    }
  }
  return () => {
    ws.send(JSON.stringify({ type: 'unsubscribe', symbol }))
    ws.close()
  }
}

// ============ SYNTHETIC FOREX MARKET (24/7) ============
// For trading anytime like Olymp Trade / MT5 Demo
// Uses realistic price simulation with random walk

interface SyntheticPriceState {
  price: number
  basePrice: number
  volatility: number
  trend: number
  lastUpdate: number
}

// Store synthetic price states in memory
const syntheticPriceStates: Map<string, SyntheticPriceState> = new Map()

// Base prices for synthetic forex (in THB - converted from USD at rate 36)
const THB_RATE = 36
const SYNTHETIC_BASE_PRICES: Record<string, number> = {
  'EURUSD': 1.0850 * THB_RATE,   // ~39.06 THB
  'GBPUSD': 1.2650 * THB_RATE,   // ~45.54 THB
  'USDJPY': 151.50 * THB_RATE,  // ~5454 THB (USDJPY is different - actually this is JPY per USD)
  'USDCHF': 0.9050 * THB_RATE,   // ~32.58 THB
  'AUDUSD': 0.6550 * THB_RATE,   // ~23.58 THB
  'USDCAD': 1.3850 * THB_RATE,   // ~49.86 THB
  'NZDUSD': 0.5950 * THB_RATE,   // ~21.42 THB
  'EURGBP': 0.8580 * THB_RATE,   // ~30.89 THB
  'EURJPY': 164.20 * THB_RATE,   // ~5911 THB
  'GBPJPY': 191.50 * THB_RATE,   // ~6894 THB
  'XAUUSD': 2320.50 * THB_RATE,  // ~83538 THB (Gold)
  'XAGUSD': 27.80 * THB_RATE,    // ~1000.8 THB (Silver)
}

// Volatility settings per pair (daily volatility %)
const PAIR_VOLATILITY: Record<string, number> = {
  'EURUSD': 0.008,    // 0.8% daily
  'GBPUSD': 0.010,    // 1.0% daily
  'USDJPY': 0.007,    // 0.7% daily
  'USDCHF': 0.009,    // 0.9% daily
  'AUDUSD': 0.012,    // 1.2% daily
  'USDCAD': 0.009,    // 0.9% daily
  'NZDUSD': 0.013,    // 1.3% daily
  'EURGBP': 0.008,    // 0.8% daily
  'EURJPY': 0.011,    // 1.1% daily
  'GBPJPY': 0.014,    // 1.4% daily
  'XAUUSD': 0.018,    // 1.8% daily (gold more volatile)
  'XAGUSD': 0.025,    // 2.5% daily (silver most volatile)
}

// Get synthetic forex price (24/7 market)
export async function getSyntheticForexPrice(symbol: string) {
  const now = Date.now()
  const basePrice = SYNTHETIC_BASE_PRICES[symbol] || 1.0
  const volatility = PAIR_VOLATILITY[symbol] || 0.01

  // Get or create price state
  let state = syntheticPriceStates.get(symbol)
  if (!state) {
    state = {
      price: basePrice,
      basePrice,
      volatility,
      trend: 0,
      lastUpdate: now,
    }
    syntheticPriceStates.set(symbol, state)
  }

  // Calculate time elapsed (in seconds)
  const elapsed = (now - state.lastUpdate) / 1000

  // Update price based on elapsed time (only update if enough time passed)
  if (elapsed > 0) {
    // Random walk with mean reversion
    // dP/P = volatility * sqrt(dt) * Z + trend * dt - meanReversion * (P - basePrice)/basePrice * dt
    const dt = elapsed / (24 * 3600) // Convert to days
    const meanReversion = 0.1 // Pull back to base price
    const trendChange = (Math.random() - 0.5) * 0.02 // Small trend changes

    state.trend += trendChange * dt
    state.trend *= 0.99 // Trend decay

    const randomWalk = volatility * Math.sqrt(dt) * (Math.random() - 0.5) * 2
    const meanRev = -meanReversion * (state.price - state.basePrice) / state.basePrice * dt

    const priceChange = state.price * (randomWalk + state.trend * dt + meanRev)
    state.price += priceChange
    state.lastUpdate = now

    // Keep price in reasonable bounds
    const maxPrice = state.basePrice * 1.15
    const minPrice = state.basePrice * 0.85
    state.price = Math.max(minPrice, Math.min(maxPrice, state.price))
  }

  // Calculate OHLC from current price
  const price = state.price
  const change = price - basePrice
  const changePercent = (change / basePrice) * 100

  // Generate realistic high/low based on volatility
  const intradayRange = volatility * price * 0.5
  const high = price + intradayRange * (0.5 + Math.random() * 0.5)
  const low = price - intradayRange * (0.5 + Math.random() * 0.5)

  return {
    symbol,
    price,
    change,
    changePercent,
    high,
    low,
    open: basePrice,
    basePrice,
    isSynthetic: true,
    timestamp: now,
  }
}

// WebSocket-like subscription for synthetic forex (updates every 1-3 seconds)
export function subscribeSyntheticForex(symbol: string, onPrice: (data: {
  price: number
  change: number
  changePercent: number
  high: number
  low: number
}) => void) {
  let lastPrice = 0

  const interval = setInterval(async () => {
    const data = await getSyntheticForexPrice(symbol)
    // Only notify if price changed
    if (data.price !== lastPrice) {
      lastPrice = data.price
      onPrice({
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        high: data.high,
        low: data.low,
      })
    }
  }, 1000 + Math.random() * 2000) // Random interval 1-3 seconds for realism

  return () => clearInterval(interval)
}

// Get market status for synthetic forex (always open)
export function getSyntheticForexMarketStatus() {
  const now = new Date()
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))

  return {
    isOpen: true,
    message: 'ตลาดสังเคราะห์เปิด 24/7 (Synthetic Market)',
    nextOpen: null,
    nextClose: null,
    isSynthetic: true,
    timestamp: thailandTime.toISOString(),
  }
}

export function formatPrice(price: number, decimals = 2) {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatTHB(amount: number) {
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Get asset type from symbol
export function getAssetType(symbol: string): 'stock' | 'crypto' | 'forex' {
  if (FOREX_PAIRS.some(f => f.symbol === symbol)) return 'forex'
  if (CRYPTOS.some(c => c.symbol === symbol)) return 'crypto'
  return 'stock'
}

// Format asset display name
export function getAssetDisplayName(symbol: string): string {
  const stock = US_STOCKS.find(s => s.symbol === symbol)
  if (stock) return stock.name
  
  const crypto = CRYPTOS.find(c => c.symbol === symbol)
  if (crypto) return crypto.name
  
  const forex = FOREX_PAIRS.find(f => f.symbol === symbol)
  if (forex) return forex.name
  
  return symbol
}
