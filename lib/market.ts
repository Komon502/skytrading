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
