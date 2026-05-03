import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { FOREX_PAIRS, getSyntheticForexPrice, subscribeSyntheticForex, formatPrice, formatTHB } from '../lib/market'
import { getSyntheticForexMarketStatus, formatCountdown } from '../lib/market-hours'
import Navbar from '../components/Navbar'
import {
  TrendingUp, TrendingDown, Search, Globe, Clock,
  DollarSign, ArrowUpCircle, ArrowDownCircle,
  Wallet, PieChart, Loader2
} from 'lucide-react'

const TradingChart = dynamic(() => import('../components/TradingChart'), { ssr: false })

type OrderType = 'buy' | 'sell'

export default function ForexPage() {
  const router = useRouter()

  // Auth
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  const [authLoading, setAuthLoading] = useState(true)

  // Market
  const [search, setSearch] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD')
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number>(0)
  const [changePct, setChangePct] = useState<number>(0)
  const [priceLoading, setPriceLoading] = useState(false)

  // Order
  const [orderType, setOrderType] = useState<OrderType>('buy')
  const [lotSize, setLotSize] = useState('0.01')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Market Hours
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; nextOpen?: Date; nextClose?: Date; message: string } | null>(null)

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

  // Synthetic market status - always open 24/7
  useEffect(() => {
    const checkMarket = () => {
      setMarketStatus(getSyntheticForexMarketStatus())
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

  // Calculate holdings (net quantity per symbol)
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
      const data = await getSyntheticForexPrice(sym)
      setPrice(data.price)
      setChange(data.change)
      setChangePct(data.changePercent)
    } catch { /* silent fail */ }
    setPriceLoading(false)
  }, [])

  // Use synthetic forex subscription for real-time updates
  useEffect(() => {
    fetchPrice(selectedSymbol)
    const unsubscribe = subscribeSyntheticForex(selectedSymbol, (data) => {
      setPrice(data.price)
      setChange(data.change)
      setChangePct(data.changePercent)
    })
    return () => unsubscribe()
  }, [selectedSymbol, fetchPrice])

  async function handleOrder() {
    // Synthetic market is always open 24/7
    // No need to check market hours

    if (!user || !wallet || !price) return
    const lots = parseFloat(lotSize)
    if (!lots || lots <= 0) { setOrderMsg({ type: 'error', text: 'ใส่ขนาด Lot ให้ถูกต้อง' }); return }

    // Forex: 1 lot = 100,000 units
    const quantity = lots * 100000
    const totalTHB = lots * price * 1000 // Price already in THB

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
      quantity: lots,
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
      setOrderMsg({ type: 'success', text: `${orderType === 'buy' ? 'ซื้อ' : 'ขาย'} ${lots} lot ${selectedSymbol} @ ฿${formatPrice(price, 5)} สำเร็จ` })
    }
    setOrderLoading(false)
  }

  const filteredPairs = search
    ? FOREX_PAIRS.filter(p =>
        p.symbol.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : FOREX_PAIRS

  const currentPair = FOREX_PAIRS.find(p => p.symbol === selectedSymbol)

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
        {/* Left: currency pair list */}
        <div className="w-64 border-r flex flex-col shrink-0 hidden md:flex"
          style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.4)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-blue-400"/>
              <span className="text-sm font-semibold text-white">คู่สกุลเงิน</span>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input className="input-sky text-xs pl-7 py-1.5 w-full" placeholder="ค้นหา..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPairs.map(p => (
              <button key={p.symbol} onClick={() => setSelectedSymbol(p.symbol)}
                className={`w-full text-left p-3 border-b transition-all hover:bg-white/5 flex items-center justify-between ${
                  selectedSymbol === p.symbol ? 'bg-white/5 border-blue-400/30' : 'border-transparent'
                }`}>
                <div>
                  <div className="text-xs font-semibold text-white">{p.display}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[100px]">{p.name}</div>
                </div>
                {p.isMetal ? (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Metal</span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">FX</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center: chart + order form */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile pair selector */}
          <div className="md:hidden px-3 py-2 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.5)' }}>
            <select className="input-sky text-sm w-full"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}>
              {FOREX_PAIRS.map(p => (
                <option key={p.symbol} value={p.symbol}>{p.display} - {p.name}</option>
              ))}
            </select>
          </div>

          {/* Chart header */}
          <div className="px-4 py-3 border-b flex items-center gap-4"
            style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{currentPair?.display || selectedSymbol}</span>
                {changePct !== 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    changePct >= 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                  }`}>
                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(3)}%
                  </span>
                )}
              </div>
              {price !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-white">
                    {formatPrice(price, 5)}
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
              {/* Synthetic Market Status - Always Open */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Clock size={12} />
                <span>24/7 Synthetic</span>
              </div>
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${mode === 'demo' ? 'mode-demo' : 'mode-real'}`}>
                {mode.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 relative">
            <TradingChart symbol={selectedSymbol} isCrypto={false} isForex={true} height={320}/>

            {/* Improved Order Panel */}
            <div className="border-t" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(6,13,26,0.98)' }}>
              {/* Synthetic Market Badge */}
              <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(147,51,234,0.2)', background: 'rgba(147,51,234,0.05)' }}>
                <div className="flex items-center gap-2 text-purple-400 text-sm">
                  <Globe size={16} />
                  <span className="font-medium">ตลาดสังเคราะห์ 24/7</span>
                  <span className="ml-auto text-xs text-gray-400">เทรดได้ตลอดเวลาเหมือน Olymp Trade / MT5</span>
                </div>
              </div>

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
                    <label className="text-xs text-gray-400 mb-2 block flex items-center gap-1">
                      <DollarSign size={12}/> ขนาด Lot
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="input-sky text-center font-mono"
                        placeholder="0.01"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={lotSize}
                        onChange={e => setLotSize(e.target.value)}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                        lot
                      </div>
                    </div>
                    {/* Quick lot size buttons */}
                    <div className="flex gap-1 mt-2">
                      {['0.01', '0.1', '0.5', '1', '5'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setLotSize(size)}
                          className={`flex-1 py-1 rounded text-xs transition-colors ${
                            lotSize === size
                              ? 'bg-blue-500/30 text-blue-400'
                              : 'bg-white/5 text-gray-500 hover:bg-white/10'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-2 block">ราคาปัจจุบัน</label>
                    <div className="input-sky text-center font-mono text-gray-300">
                      {price ? formatPrice(price, 5) : '-'}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      1 lot = 100,000 หน่วย
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-2 block">มูลค่ารวม (ประมาณ)</label>
                    <div className="input-sky text-center font-mono text-white font-semibold">
                      {price && lotSize ? `฿${formatTHB(parseFloat(lotSize || '0') * price * 1000)}` : '-'}
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
                  {`${orderType === 'buy' ? '🟢 ซื้อ' : '🔴 ขาย'} ${currentPair?.display || selectedSymbol}`}
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
                      <span className="text-green-400">{h.quantity.toFixed(2)} lot</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>ราคาเฉลี่ย</span>
                      <span className="font-mono">{formatPrice(h.avgPrice, 5)}</span>
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
                      <span>Lot: {pos.quantity}</span>
                      <span className="font-mono">@{formatPrice(pos.price, 5)}</span>
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
                    <span className="text-green-400">{h.quantity.toFixed(2)} lot</span>
                  </div>
                  <div className="text-gray-400 font-mono">@{formatPrice(h.avgPrice, 5)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
