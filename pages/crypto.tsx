import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { CRYPTOS, getCryptoPrice, formatPrice, formatTHB } from '../lib/market'
import { isCryptoMarketOpen, formatCountdown } from '../lib/market-hours'
import Navbar from '../components/Navbar'
import {
  TrendingUp, TrendingDown, Search, Bitcoin, Clock,
  ArrowUpCircle, ArrowDownCircle, Wallet, Loader2
} from 'lucide-react'

const TradingChart = dynamic(() => import('../components/TradingChart'), { ssr: false })

type OrderType = 'buy' | 'sell'

export default function CryptoPage() {
  const router = useRouter()

  // Auth
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  const [authLoading, setAuthLoading] = useState(true)

  // Market
  const [search, setSearch] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number>(0)
  const [changePct, setChangePct] = useState<number>(0)
  const [priceLoading, setPriceLoading] = useState(false)

  // Order
  const [orderType, setOrderType] = useState<OrderType>('buy')
  const [quantity, setQuantity] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Market Hours
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; message: string } | null>(null)

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
  }, [router])

  // Check market status every minute
  useEffect(() => {
    const checkMarket = () => {
      setMarketStatus(isCryptoMarketOpen())
    }
    checkMarket()
    const interval = setInterval(checkMarket, 60000)
    return () => clearInterval(interval)
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

  // Calculate holdings
  const holdings = positions.reduce((acc, pos) => {
    const key = pos.symbol
    if (!acc[key]) {
      acc[key] = { symbol: pos.symbol, quantity: 0, avgPrice: 0, totalCost: 0 }
    }
    const qty = parseFloat(pos.quantity)
    if (pos.type === 'buy') {
      const newTotalCost = acc[key].totalCost + (qty * pos.price)
      const newQty = acc[key].quantity + qty
      acc[key].quantity = newQty
      acc[key].totalCost = newTotalCost
      acc[key].avgPrice = newQty > 0 ? newTotalCost / newQty : 0
    }
    return acc
  }, {} as Record<string, { symbol: string; quantity: number; avgPrice: number; totalCost: number }>)

  const holdingsList = Object.values(holdings).filter((h: any) => h.quantity > 0)

  const fetchPrice = useCallback(async (sym: string) => {
    setPriceLoading(true)
    try {
      const data = await getCryptoPrice(sym)
      setPrice(data.price)
      setChange(data.change)
      setChangePct(data.changePercent)
    } catch { /* silent fail */ }
    setPriceLoading(false)
  }, [])

  useEffect(() => {
    fetchPrice(selectedSymbol)
    const t = setInterval(() => fetchPrice(selectedSymbol), 15000)
    return () => clearInterval(t)
  }, [selectedSymbol, fetchPrice])

  async function handleOrder() {
    if (!user || !wallet || !price) return
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) { setOrderMsg({ type: 'error', text: 'ใส่จำนวนให้ถูกต้อง' }); return }

    const totalTHB = qty * price  // Price now in THB directly
    const balance = mode === 'demo' ? wallet.demo_balance : wallet.real_balance

    if (orderType === 'buy' && totalTHB > balance) {
      setOrderMsg({ type: 'error', text: `ยอดเงินไม่เพียงพอ (ต้องการ ฿${totalTHB.toLocaleString('th-TH', {maximumFractionDigits: 2})}, มี ฿${balance.toLocaleString('th-TH', {maximumFractionDigits: 2})})` })
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
      total: totalTHB,
      status: 'open',
    })

    if (error) {
      setOrderMsg({ type: 'error', text: 'เกิดข้อผิดพลาด' })
    } else {
      // Update wallet balance
      const balKey = mode === 'demo' ? 'demo_balance' : 'real_balance'
      const newBal = orderType === 'buy' ? balance - totalTHB : balance + totalTHB
      await supabase.from('wallets').update({ [balKey]: newBal }).eq('user_id', user.id)

      await loadWallet(user.id)
      await loadPositions(user.id)
      setOrderMsg({ type: 'success', text: `${orderType === 'buy' ? 'ซื้อ' : 'ขาย'} ${qty} ${selectedSymbol} @ ฿${formatPrice(price)} สำเร็จ` })
      setQuantity('')
    }
    setOrderLoading(false)
  }

  const filteredCryptos = search
    ? CRYPTOS.filter(c =>
        c.symbol.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : CRYPTOS

  const currentCrypto = CRYPTOS.find(c => c.symbol === selectedSymbol)

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1a' }}>
      <Loader2 className="animate-spin text-blue-400" size={32}/>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#060d1a' }}>
      <Navbar user={user} wallet={wallet} mode={mode} onModeChange={setMode}/>

      {/* Mode warning banner */}
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

      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Left: crypto list */}
        <div className="w-64 border-r flex flex-col shrink-0 hidden md:flex"
          style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.4)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Bitcoin size={16} className="text-orange-400"/>
              <span className="text-sm font-semibold text-white">Cryptocurrency</span>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input className="input-sky text-xs pl-7 py-1.5 w-full" placeholder="ค้นหา..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCryptos.map(c => (
              <button key={c.symbol} onClick={() => setSelectedSymbol(c.symbol)}
                className={`w-full text-left p-3 border-b transition-all hover:bg-white/5 flex items-center justify-between ${
                  selectedSymbol === c.symbol ? 'bg-white/5 border-blue-400/30' : 'border-transparent'
                }`}>
                <div>
                  <div className="text-xs font-semibold text-white">{c.display}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[100px]">{c.name}</div>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">Crypto</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: chart + order form */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile crypto selector */}
          <div className="md:hidden px-3 py-2 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.5)' }}>
            <select className="input-sky text-sm w-full"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}>
              {CRYPTOS.map(c => (
                <option key={c.symbol} value={c.symbol}>{c.display} - {c.name}</option>
              ))}
            </select>
          </div>

          {/* Chart header */}
          <div className="px-4 py-3 border-b flex items-center gap-4"
            style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{currentCrypto?.display || selectedSymbol}</span>
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
                    ฿{formatPrice(price, price < 1 ? 6 : 2)}
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
            <div className="ml-auto flex items-center gap-3">
              {/* Market Status Indicator - Crypto is always open */}
              {marketStatus && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                  <Clock size={12} />
                  <span>24/7</span>
                </div>
              )}
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${mode === 'demo' ? 'mode-demo' : 'mode-real'}`}>
                {mode.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 relative">
            <TradingChart symbol={selectedSymbol} isCrypto={true} height={320}/>

            {/* Improved Order Panel */}
            <div className="border-t" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(6,13,26,0.98)' }}>

              {/* Order Type Selector - Large Buttons */}
              <div className="p-4 pb-2">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setOrderType('buy')}
                    className={`py-4 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 border-2 ${
                      orderType === 'buy'
                        ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-lg shadow-green-500/10'
                        : 'text-gray-500 border-gray-700 hover:border-green-500/30 hover:text-green-400/70'
                    }`}>
                    <ArrowUpCircle size={24} className={orderType === 'buy' ? 'text-green-400' : 'text-gray-500'}/>
                    <span>ซื้อ (BUY)</span>
                    <span className="text-xs font-normal opacity-70">คาดว่าราคาจะขึ้น</span>
                  </button>
                  <button onClick={() => setOrderType('sell')}
                    className={`py-4 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 border-2 ${
                      orderType === 'sell'
                        ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-lg shadow-red-500/10'
                        : 'text-gray-500 border-gray-700 hover:border-red-500/30 hover:text-red-400/70'
                    }`}>
                    <ArrowDownCircle size={24} className={orderType === 'sell' ? 'text-red-400' : 'text-gray-500'}/>
                    <span>ขาย (SELL)</span>
                    <span className="text-xs font-normal opacity-70">คาดว่าราคาจะลง</span>
                  </button>
                </div>
              </div>

              {/* Order Input */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-2 block">จำนวน ({currentCrypto?.display || selectedSymbol})</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="input-sky text-center font-mono"
                        placeholder="0.00"
                        step="0.0001"
                        min="0"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                      />
                    </div>
                    {/* Quick amount buttons */}
                    <div className="flex gap-1 mt-2">
                      {['10', '50', '100', '500', '1000'].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            if (price) {
                              const qty = (parseFloat(amount) / price).toFixed(6)
                              setQuantity(qty)
                            }
                          }}
                          disabled={!price}
                          className="flex-1 py-1 rounded text-xs transition-colors bg-white/5 text-gray-500 hover:bg-white/10 disabled:opacity-50"
                        >
                          ฿${amount}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-2 block">ราคาปัจจุบัน</label>
                    <div className="input-sky text-center font-mono text-gray-300">
                      {price ? `฿${formatPrice(price, price < 1 ? 6 : 2)}` : '-'}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      ราคาอัพเดทเรียลไทม์
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-2 block">มูลค่ารวม (ประมาณ)</label>
                    <div className="input-sky text-center font-mono text-white font-semibold">
                      {price && quantity ? `฿${formatTHB(parseFloat(quantity || '0') * price)}` : '-'}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      คงเหลือ: ฿{formatTHB(mode === 'demo' ? wallet?.demo_balance || 0 : wallet?.real_balance || 0)}
                    </div>
                  </div>
                </div>

                {/* Message */}
                {orderMsg && (
                  <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${
                    orderMsg.type === 'success'
                      ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                      : 'bg-red-400/10 text-red-400 border border-red-400/20'
                  }`}>
                    {orderMsg.text}
                  </div>
                )}

                <button 
                  onClick={handleOrder} 
                  disabled={orderLoading || !price}
                  className={`mt-4 w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                    orderType === 'buy'
                      ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/20'
                      : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20'
                  } disabled:opacity-40`}>
                  {orderLoading && <Loader2 size={18} className="animate-spin"/>}
                  {`${orderType === 'buy' ? '🟢 ซื้อ' : '🔴 ขาย'} ${currentCrypto?.display || selectedSymbol}`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop positions sidebar */}
        <div className="w-72 border-l flex-col hidden lg:flex"
          style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.3)' }}>

          {/* Holdings Panel */}
          <div className="border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div className="p-3 border-b text-xs font-semibold text-gray-400 flex justify-between"
              style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
              <span className="flex items-center gap-1"><Wallet size={12}/> การถือครอง ({mode.toUpperCase()})</span>
              <span className="text-gray-500">{holdingsList.length} รายการ</span>
            </div>
            <div className="max-h-40 overflow-y-auto p-2">
              {holdingsList.length === 0 ? (
                <div className="text-center text-xs text-gray-600 py-3">ยังไม่มีการถือครอง</div>
              ) : (
                holdingsList.map((h: any) => (
                  <div key={h.symbol} className="glass p-2 mb-2 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-white">{h.symbol}</span>
                      <span className="text-green-400">{h.quantity.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>ราคาเฉลี่ย</span>
                      <span className="font-mono">฿{formatPrice(h.avgPrice, 2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Open Positions */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b text-xs font-semibold text-gray-400"
              style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
              ออเดอร์ที่เปิดอยู่ ({mode.toUpperCase()})
            </div>
            <div className="p-2">
              {positions.filter(p => p.mode === mode).length === 0 ? (
                <div className="text-center text-xs text-gray-600 mt-4">ยังไม่มีออเดอร์ที่เปิดอยู่</div>
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
                      <span className="font-mono">@฿{formatPrice(pos.price, 2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mobile holdings panel */}
        <div className="lg:hidden border-t" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.5)' }}>
          <div className="p-2 border-b text-xs font-semibold text-gray-400 flex justify-between"
            style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <span>การถือครอง ({mode.toUpperCase()})</span>
            <span className="text-gray-500">{holdingsList.length} รายการ</span>
          </div>
          <div className="max-h-24 overflow-y-auto p-2">
            {holdingsList.length === 0 ? (
              <div className="text-center text-xs text-gray-600 py-2">ยังไม่มีการถือครอง</div>
            ) : (
              holdingsList.map((h: any) => (
                <div key={h.symbol} className="glass p-2 mb-1 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{h.symbol}</span>
                    <span className="text-green-400">{h.quantity.toFixed(4)}</span>
                  </div>
                  <div className="text-gray-400 font-mono">@${formatPrice(h.avgPrice, 2)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
