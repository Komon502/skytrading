import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { US_STOCKS, CRYPTOS, getStockQuote, getCryptoPrice, formatPrice, formatTHB } from '../lib/market'
import Navbar from '../components/Navbar'
import {
  TrendingUp, TrendingDown, Search, ChevronDown, Loader2,
  Bitcoin, BarChart2
} from 'lucide-react'

const TradingChart = dynamic(() => import('../components/TradingChart'), { ssr: false })

type AssetType = 'stocks' | 'crypto'
type OrderType = 'buy' | 'sell'

export default function TradePage() {
  const router = useRouter()

  // Auth
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  const [authLoading, setAuthLoading] = useState(true)

  // Market
  const [assetType, setAssetType] = useState<AssetType>('stocks')
  const [search, setSearch] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [isCrypto, setIsCrypto] = useState(false)
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number>(0)
  const [changePct, setChangePct] = useState<number>(0)
  const [priceLoading, setPriceLoading] = useState(false)

  // Order
  const [orderType, setOrderType] = useState<OrderType>('buy')
  const [quantity, setQuantity] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Positions
  const [positions, setPositions] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      setUser(data.session.user)
      loadWallet(data.session.user.id)
      loadPositions(data.session.user.id)
      setAuthLoading(false)
    })
  }, [])

  async function loadWallet(userId: string) {
    const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single()
    setWallet(data)
  }

  async function loadPositions(userId: string) {
    const { data } = await supabase.from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    setPositions(data || [])
  }

  const fetchPrice = useCallback(async (sym: string, crypto: boolean) => {
    setPriceLoading(true)
    try {
      const data = crypto ? await getCryptoPrice(sym) : await getStockQuote(sym)
      setPrice(data.price)
      setChange(data.change)
      setChangePct(data.changePercent)
    } catch { /* silent fail */ }
    setPriceLoading(false)
  }, [])

  useEffect(() => {
    fetchPrice(selectedSymbol, isCrypto)
    const t = setInterval(() => fetchPrice(selectedSymbol, isCrypto), 15000)
    return () => clearInterval(t)
  }, [selectedSymbol, isCrypto, fetchPrice])

  async function handleOrder() {
    if (!user || !wallet || !price) return
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) { setOrderMsg({ type: 'error', text: 'ใส่จำนวนให้ถูกต้อง' }); return }

    const total = qty * price
    const balance = mode === 'demo' ? wallet.demo_balance : wallet.real_balance

    if (orderType === 'buy' && total > balance) {
      setOrderMsg({ type: 'error', text: 'ยอดเงินไม่เพียงพอ' })
      return
    }

    setOrderLoading(true); setOrderMsg(null)

    // Insert trade
    const { error } = await supabase.from('trades').insert({
      user_id: user.id,
      mode,
      symbol: selectedSymbol,
      type: orderType,
      quantity: qty,
      price,
      total,
      status: 'open',
    })

    if (error) {
      setOrderMsg({ type: 'error', text: 'เกิดข้อผิดพลาด' })
    } else {
      // Update wallet balance
      const balKey = mode === 'demo' ? 'demo_balance' : 'real_balance'
      const newBal = orderType === 'buy' ? balance - total : balance + total
      await supabase.from('wallets').update({ [balKey]: newBal }).eq('user_id', user.id)
      await loadWallet(user.id)
      await loadPositions(user.id)
      setOrderMsg({ type: 'success', text: `${orderType === 'buy' ? 'ซื้อ' : 'ขาย'} ${qty} ${selectedSymbol} @ $${formatPrice(price)} สำเร็จ` })
      setQuantity('')
    }
    setOrderLoading(false)
  }

  const assets = assetType === 'stocks' ? US_STOCKS : CRYPTOS
  const filteredAssets = search
    ? assets.filter(a =>
        a.symbol.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : assets

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1a' }}>
      <Loader2 className="animate-spin text-blue-400" size={32}/>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#060d1a' }}>
      <Navbar user={user} wallet={wallet} mode={mode} onModeChange={setMode}/>

      {/* Mode warning banner for REAL */}
      {mode === 'real' && (
        <div className="px-4 py-2 text-xs font-semibold text-center"
          style={{ background: 'rgba(0,208,132,0.08)', borderBottom: '1px solid rgba(0,208,132,0.15)', color: '#00d084' }}>
          REAL MODE · ใช้เงินจริง · ยอด Real: ฿{wallet ? formatTHB(wallet.real_balance) : '0.00'}
        </div>
      )}
      {mode === 'demo' && (
        <div className="px-4 py-2 text-xs font-semibold text-center"
          style={{ background: 'rgba(250,199,117,0.06)', borderBottom: '1px solid rgba(250,199,117,0.12)', color: '#fac775' }}>
          DEMO MODE · เงินสมมติ · ยอด Demo: ฿{wallet ? formatTHB(wallet.demo_balance) : '5,000.00'}
        </div>
      )}

      {/* Main trading layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Left: asset list - collapsible on mobile */}
        <div className="w-64 border-r flex flex-col shrink-0 hidden md:flex"
          style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.4)' }}>
          {/* Asset type toggle */}
          <div className="p-3 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div className="flex rounded-lg p-0.5" style={{ background: 'rgba(6,13,26,0.8)' }}>
              <button onClick={() => setAssetType('stocks')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  assetType === 'stocks' ? 'bg-blue-600 text-white' : 'text-gray-500'
                }`}>
                <BarChart2 size={12}/> หุ้น
              </button>
              <button onClick={() => setAssetType('crypto')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  assetType === 'crypto' ? 'bg-blue-600 text-white' : 'text-gray-500'
                }`}>
                <Bitcoin size={12}/> Crypto
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: 'rgba(59,127,212,0.08)' }}>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input className="input-sky text-xs pl-7 py-1.5" placeholder="ค้นหา..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          {/* Asset list */}
          <div className="flex-1 overflow-y-auto">
            {(assetType === 'stocks' ? US_STOCKS : CRYPTOS).filter(a =>
              a.symbol.toLowerCase().includes(search.toLowerCase()) ||
              a.name.toLowerCase().includes(search.toLowerCase())
            ).map(a => (
              <button key={a.symbol} onClick={() => { setSelectedSymbol(a.symbol); setIsCrypto(assetType === 'crypto') }}
                className={`w-full text-left p-3 border-b transition-all hover:bg-white/5 flex items-center justify-between ${
                  selectedSymbol === a.symbol ? 'bg-white/5 border-blue-400/30' : 'border-transparent'
                }`}>
                <div>
                  <div className="text-xs font-semibold text-white">{a.symbol}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[100px]">{a.name}</div>
                </div>
                {assetType === 'stocks' && (a as any).sector && (
                  <span className="text-xs text-gray-600">{(a as any).sector?.slice(0,4)}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center: chart + order form */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile asset selector */}
          <div className="md:hidden px-3 py-2 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.5)' }}>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setAssetType('stocks')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold ${assetType === 'stocks' ? 'bg-blue-600 text-white' : 'text-gray-500 bg-gray-800/50'}`}>
                หุ้น
              </button>
              <button onClick={() => setAssetType('crypto')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold ${assetType === 'crypto' ? 'bg-blue-600 text-white' : 'text-gray-500 bg-gray-800/50'}`}>
                Crypto
              </button>
            </div>
            <select 
              className="input-sky text-sm"
              value={selectedSymbol}
              onChange={(e) => {
                const symbol = e.target.value;
                const isCryptoSymbol = CRYPTOS.some(c => c.symbol === symbol);
                setSelectedSymbol(symbol);
                setIsCrypto(isCryptoSymbol);
              }}
            >
              {(assetType === 'stocks' ? US_STOCKS : CRYPTOS).map(a => (
                <option key={a.symbol} value={a.symbol}>{a.symbol} - {a.name}</option>
              ))}
            </select>
          </div>

          {/* Chart header */}
          <div className="px-4 py-3 border-b flex items-center gap-4"
            style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{selectedSymbol}</span>
                {changePct !== 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    changePct >= 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                  }`}>
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                  </span>
                )}
              </div>
              {price !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-white">
                    {isCrypto ? '$' : '$'}{formatPrice(price, isCrypto ? (price < 1 ? 6 : 2) : 2)}
                  </span>
                  {change !== 0 && (
                    <span className={change >= 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                      {change >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                    </span>
                  )}
                  {priceLoading && <Loader2 size={14} className="animate-spin text-blue-400"/>}
                </div>
              )}
            </div>
            <div className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${mode === 'demo' ? 'mode-demo' : 'mode-real'}`}>
              {mode.toUpperCase()} MODE
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 relative">
            <TradingChart symbol={selectedSymbol} isCrypto={isCrypto} height={320}/>

            {/* Order form overlay at bottom */}
            <div className="border-t p-4" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(6,13,26,0.95)' }}>
              {/* Buy/Sell tabs */}
              <div className="flex gap-2 mb-3">
                <button onClick={() => setOrderType('buy')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${
                    orderType === 'buy'
                      ? 'bg-green-400/15 text-green-400 border-green-400/30'
                      : 'text-gray-500 border-gray-700'
                  }`}>
                  ซื้อ (BUY)
                </button>
                <button onClick={() => setOrderType('sell')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${
                    orderType === 'sell'
                      ? 'bg-red-400/15 text-red-400 border-red-400/30'
                      : 'text-gray-500 border-gray-700'
                  }`}>
                  ขาย (SELL)
                </button>
              </div>

              {/* Order input - responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">จำนวน ({selectedSymbol})</label>
                  <input
                    type="number"
                    className="input-sky"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">ราคา ($)</label>
                  <input className="input-sky" readOnly value={price ? formatPrice(price) : '-'}/>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">รวม (THB ≈)</label>
                  <input className="input-sky" readOnly
                    value={price && quantity ? `฿${formatTHB(parseFloat(quantity || '0') * price * 36)}` : '-'}/>
                </div>
              </div>

              {/* Message */}
              {orderMsg && (
                <div className={`mt-2 px-3 py-2 rounded text-xs ${
                  orderMsg.type === 'success'
                    ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                    : 'bg-red-400/10 text-red-400 border border-red-400/20'
                }`}>
                  {orderMsg.text}
                </div>
              )}

              <button onClick={handleOrder} disabled={orderLoading || !price}
                className={`mt-3 w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  orderType === 'buy'
                    ? 'bg-green-500/80 hover:bg-green-500 text-white border border-green-400/30'
                    : 'bg-red-500/80 hover:bg-red-500 text-white border border-red-400/30'
                } disabled:opacity-40`}>
                {orderLoading && <Loader2 size={16} className="animate-spin"/>}
                {orderType === 'buy' ? '🟢 ซื้อ' : '🔴 ขาย'} {selectedSymbol}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop positions sidebar */}
        <div className="w-72 border-l flex-col hidden lg:flex"
          style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.3)' }}>
          <div className="p-3 border-b text-xs font-semibold text-gray-400"
            style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            OPEN POSITIONS ({mode.toUpperCase()})
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {positions.filter(p => p.mode === mode).length === 0 ? (
              <div className="text-center text-xs text-gray-600 mt-8">ยังไม่มีออเดอร์ที่เปิดอยู่</div>
            ) : (
              positions.filter(p => p.mode === mode).map(pos => (
                <div key={pos.id} className="glass p-3 mb-2 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-white">{pos.symbol}</span>
                    <span className={pos.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {pos.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Qty: {pos.quantity}</span>
                    <span>@ ${formatPrice(pos.price)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 mt-1">
                    <span>Total</span>
                    <span className="text-white">${formatPrice(pos.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile positions panel */}
        <div className="lg:hidden border-t" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.5)' }}>
          <div className="p-2 border-b text-xs font-semibold text-gray-400 flex justify-between"
            style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <span>OPEN POSITIONS ({mode.toUpperCase()})</span>
            <span className="text-gray-500">{positions.filter(p => p.mode === mode).length} รายการ</span>
          </div>
          <div className="max-h-32 overflow-y-auto p-2">
            {positions.filter(p => p.mode === mode).length === 0 ? (
              <div className="text-center text-xs text-gray-600 py-3">ยังไม่มีออเดอร์ที่เปิดอยู่</div>
            ) : (
              positions.filter(p => p.mode === mode).map(pos => (
                <div key={pos.id} className="glass p-2 mb-1 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{pos.symbol}</span>
                    <span className={pos.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {pos.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-400">
                    {pos.quantity} @ ${formatPrice(pos.price)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
