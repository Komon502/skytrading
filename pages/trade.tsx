import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { US_STOCKS, CRYPTOS, FOREX_PAIRS, getStockQuote, getCryptoPrice, getForexPrice, formatPrice, formatTHB } from '../lib/market'
import { isUSStockMarketOpen, formatCountdown } from '../lib/market-hours'
import Navbar from '../components/Navbar'
import {
  TrendingUp, TrendingDown, Search, Loader2,
  BarChart2, Clock, ArrowUpCircle, ArrowDownCircle, Wallet
} from 'lucide-react'

const TradingChart = dynamic(() => import('../components/TradingChart'), { ssr: false })

type OrderType = 'buy' | 'sell'
type AssetType = 'stocks' | 'crypto' | 'forex'

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

  // Check market status every minute
  useEffect(() => {
    const checkMarket = () => {
      setMarketStatus(isUSStockMarketOpen())
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
  
  // Get current holding for selected symbol
  const currentHolding = holdings[selectedSymbol]
  const ownedQuantity = currentHolding?.quantity || 0
  const avgBuyPrice = currentHolding?.avgPrice || 0
  
  // Calculate potential profit/loss for sell
  const potentialSellPnL = price && ownedQuantity > 0 ? (price - avgBuyPrice) * ownedQuantity : 0

  // Get current asset list based on asset type
  const getCurrentAssets = useCallback(() => {
    switch (assetType) {
      case 'crypto': return CRYPTOS
      case 'forex': return FOREX_PAIRS
      default: return US_STOCKS
    }
  }, [assetType])

  const fetchPrice = useCallback(async (sym: string, type: AssetType = assetType) => {
    setPriceLoading(true)
    try {
      let data
      if (type === 'crypto') {
        data = await getCryptoPrice(sym)
      } else if (type === 'forex') {
        data = await getForexPrice(sym)
      } else {
        // Stocks only
        data = await getStockQuote(sym)
      }
      setPrice(data.price)
      setChange(data.change)
      setChangePct(data.changePercent)
    } catch { /* silent fail */ }
    setPriceLoading(false)
  }, [assetType])

  useEffect(() => {
    fetchPrice(selectedSymbol, assetType)
    const t = setInterval(() => fetchPrice(selectedSymbol, assetType), 15000)
    return () => clearInterval(t)
  }, [selectedSymbol, assetType, fetchPrice])

  async function handleOrder() {
    // Check market hours first
    const marketCheck = isUSStockMarketOpen()
    if (!marketCheck.isOpen) {
      setOrderMsg({ type: 'error', text: `ไม่สามารถซื้อขายได้: ${marketCheck.message}` })
      return
    }

    if (!user || !wallet || !price) return
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) { setOrderMsg({ type: 'error', text: 'ใส่จำนวนให้ถูกต้อง' }); return }

    const totalTHB = qty * price  // Price now in THB directly
    const balance = mode === 'demo' ? wallet.demo_balance : wallet.real_balance

    if (orderType === 'buy' && totalTHB > balance) {
      setOrderMsg({ type: 'error', text: `ยอดเงินไม่เพียงพอ (ต้องการ ฿${totalTHB.toLocaleString('th-TH', {maximumFractionDigits: 2})}, มี ฿${balance.toLocaleString('th-TH', {maximumFractionDigits: 2})})` })
      return
    }

    // Check if selling more than owned (net position: buys - sells)
    if (orderType === 'sell') {
      const symbolPositions = positions.filter(p => p.mode === mode && p.symbol === selectedSymbol)
      const boughtQty = symbolPositions.filter(p => p.type === 'buy').reduce((sum, p) => sum + parseFloat(p.quantity), 0)
      const soldQty = symbolPositions.filter(p => p.type === 'sell').reduce((sum, p) => sum + parseFloat(p.quantity), 0)
      const netOwned = boughtQty - soldQty
      if (qty > netOwned) {
        setOrderMsg({ type: 'error', text: `ขายเกินจำนวนที่มี (มี ${netOwned.toFixed(2)} ${selectedSymbol}, จะขาย ${qty})` })
        return
      }
    }

    setOrderLoading(true); setOrderMsg(null)

    // Insert trade (store both USD and THB values)
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
      // Update wallet balance (in THB)
      const balKey = mode === 'demo' ? 'demo_balance' : 'real_balance'
      const newBal = orderType === 'buy' ? balance - totalTHB : balance + totalTHB
      await supabase.from('wallets').update({ [balKey]: newBal }).eq('user_id', user.id)

      // If selling, close the oldest buy position(s)
      if (orderType === 'sell') {
        const buyPositions = positions
          .filter(p => p.mode === mode && p.symbol === selectedSymbol && p.type === 'buy' && p.status === 'open')
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        
        let remainingQtyToClose = qty
        for (const pos of buyPositions) {
          if (remainingQtyToClose <= 0) break
          const posQty = parseFloat(pos.quantity)
          const closeQty = Math.min(remainingQtyToClose, posQty)
          
          if (closeQty >= posQty) {
            // Close entire position
            await supabase.from('trades').update({ 
              status: 'closed', 
              closed_at: new Date().toISOString(),
              close_price: price
            }).eq('id', pos.id)
          }
          remainingQtyToClose -= closeQty
        }
      }

      await loadWallet(user.id)
      await loadPositions(user.id)
      setOrderMsg({ type: 'success', text: `${orderType === 'buy' ? 'ซื้อ' : 'ขาย'} ${qty} ${selectedSymbol} @ ฿${formatPrice(price)} สำเร็จ` })
      setQuantity('')
    }
    setOrderLoading(false)
  }

  const currentAssets = getCurrentAssets()
  const filteredAssets = search
    ? currentAssets.filter(a =>
        a.symbol.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : currentAssets

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
        {/* Left: asset list */}
        <div className="w-64 border-r flex flex-col shrink-0 hidden md:flex"
          style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.4)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            {/* Asset Type Tabs */}
            <div className="flex gap-1 mb-2">
              {[
                { id: 'stocks', label: 'หุ้น', icon: BarChart2 },
                { id: 'crypto', label: 'คริปโต', icon: TrendingUp },
                { id: 'forex', label: 'Forex', icon: TrendingDown },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setAssetType(id as AssetType)
                    const assets = id === 'stocks' ? US_STOCKS : id === 'crypto' ? CRYPTOS : FOREX_PAIRS
                    setSelectedSymbol(assets[0].symbol)
                    setSearch('')
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                    assetType === id
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input className="input-sky text-xs pl-7 py-1.5 w-full" placeholder="ค้นหา..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredAssets.map(a => (
              <button key={a.symbol} onClick={() => setSelectedSymbol(a.symbol)}
                className={`w-full text-left p-3 border-b transition-all hover:bg-white/5 flex items-center justify-between ${
                  selectedSymbol === a.symbol ? 'bg-white/5 border-blue-400/30' : 'border-transparent'
                }`}>
                <div>
                  <div className="text-xs font-semibold text-white">{a.symbol}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[100px]">{a.name}</div>
                </div>
                <span className="text-xs text-gray-600">{(a as any).sector?.slice(0,4) || (a as any).display?.slice(0,4)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: chart + order form */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile asset selector */}
          <div className="md:hidden px-3 py-2 border-b" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.5)' }}>
            {/* Mobile Asset Type Tabs */}
            <div className="flex gap-1 mb-2">
              {[
                { id: 'stocks', label: 'หุ้น' },
                { id: 'crypto', label: 'คริปโต' },
                { id: 'forex', label: 'Forex' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setAssetType(id as AssetType)
                    const assets = id === 'stocks' ? US_STOCKS : id === 'crypto' ? CRYPTOS : FOREX_PAIRS
                    setSelectedSymbol(assets[0].symbol)
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                    assetType === id
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select 
              className="input-sky text-sm w-full"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              {filteredAssets.map(a => (
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
                {changePct !== null && changePct !== undefined && changePct !== 0 && (
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
                    ฿{formatPrice(price, 2)}
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
            <TradingChart symbol={selectedSymbol} isCrypto={assetType === 'crypto'} isForex={assetType === 'forex'} height={320}/>

            {/* Improved Order Panel */}
            <div className="border-t" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(6,13,26,0.98)' }}>
              {/* Market Status Banner */}
              {marketStatus && !marketStatus.isOpen && (
                <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <Clock size={16} />
                    <span className="font-medium">{marketStatus.message}</span>
                    {marketStatus.nextOpen && (
                      <span className="ml-auto text-xs">{formatCountdown(marketStatus.nextOpen)}</span>
                    )}
                  </div>
                </div>
              )}

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
                    <label className="text-xs text-gray-400 mb-2 block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Wallet size={12}/> จำนวน ({selectedSymbol})
                      </span>
                      {orderType === 'sell' && ownedQuantity > 0 && (
                        <button 
                          onClick={() => setQuantity(ownedQuantity.toFixed(4))}
                          className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                        >
                          MAX ({ownedQuantity.toFixed(2)})
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="input-sky text-center font-mono text-white"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max={orderType === 'sell' ? ownedQuantity : undefined}
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                      />
                    </div>
                    {/* Quick amount buttons - Buy: ฿ amounts, Sell: % of holdings */}
                    {orderType === 'buy' ? (
                      <div className="flex gap-1 mt-2">
                        {['1000', '5000', '10000', '50000'].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => {
                              if (price) {
                                const qty = (parseFloat(amount) / price).toFixed(4)
                                setQuantity(qty)
                              }
                            }}
                            disabled={!price}
                            className="flex-1 py-1.5 rounded text-xs font-medium transition-all bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50"
                          >
                            ฿{(parseInt(amount)/1000).toFixed(0)}K
                          </button>
                        ))}
                      </div>
                    ) : (
                      ownedQuantity > 0 && (
                        <div className="flex gap-1 mt-2">
                          {[
                            { pct: 25, label: '25%' },
                            { pct: 50, label: '50%' },
                            { pct: 75, label: '75%' },
                            { pct: 100, label: 'ทั้งหมด' }
                          ].map(({ pct, label }) => (
                            <button
                              key={pct}
                              onClick={() => setQuantity((ownedQuantity * pct / 100).toFixed(4))}
                              className="flex-1 py-1.5 rounded text-xs font-medium transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-2 block">ราคาปัจจุบัน</label>
                    <div className="input-sky text-center font-mono text-gray-300">
                      {price ? `฿${formatPrice(price)}` : '-'}
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

                {/* Preview Info */}
                {orderType === 'sell' && ownedQuantity > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">คุณมีอยู่:</span>
                      <span className="text-white font-medium">{ownedQuantity.toFixed(4)} {selectedSymbol}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">ราคาซื้อเฉลี่ย:</span>
                      <span className="text-white">฿{formatPrice(avgBuyPrice)}</span>
                    </div>
                    {quantity && parseFloat(quantity) > 0 && price && (
                      <>
                        <div className="flex justify-between text-xs mb-1 pt-1 border-t border-white/5">
                          <span className="text-gray-400">จำนวนที่ขาย:</span>
                          <span className="text-white">{parseFloat(quantity).toFixed(4)} {selectedSymbol}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">กำไร/ขาดทุน:</span>
                          <span className={((price - avgBuyPrice) * parseFloat(quantity)) >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {((price - avgBuyPrice) * parseFloat(quantity)) >= 0 ? '+' : ''}฿{formatPrice((price - avgBuyPrice) * parseFloat(quantity))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {orderType === 'buy' && quantity && parseFloat(quantity) > 0 && price && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">จำนวน:</span>
                      <span className="text-white font-medium">{parseFloat(quantity).toFixed(4)} {selectedSymbol}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">ราคาต่อหน่วย:</span>
                      <span className="text-white">฿{formatPrice(price)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                      <span className="text-gray-400">ยอดรวม:</span>
                      <span className="text-blue-400 font-medium">฿{formatPrice(parseFloat(quantity) * price)}</span>
                    </div>
                  </div>
                )}

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
                  disabled={orderLoading || !price || !marketStatus?.isOpen || (orderType === 'sell' && parseFloat(quantity) > ownedQuantity)}
                  className={`mt-4 w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                    !marketStatus?.isOpen
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : orderType === 'buy'
                        ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/20'
                        : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20'
                  } disabled:opacity-40`}>
                  {orderLoading && <Loader2 size={18} className="animate-spin"/>}
                  {!marketStatus?.isOpen 
                    ? '⏸️ ตลาดปิด' 
                    : orderType === 'buy'
                      ? `🟢 ซื้อ ${selectedSymbol} จำนวน ${quantity || 0} หน่วย`
                      : `🔴 ขาย ${selectedSymbol} จำนวน ${quantity || 0} หน่วย`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop positions sidebar */}
        <div className="w-72 border-l flex-col hidden lg:flex"
          style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.3)' }}>

          {/* Holdings Panel - My Assets */}
          <div className="border-b" style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <div className="p-3 border-b text-xs font-semibold text-gray-400 flex justify-between"
              style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
              <span>ทรัพย์สินของฉัน ({mode.toUpperCase()})</span>
              <span className="text-gray-500">{holdingsList.length} รายการ</span>
            </div>
            <div className="max-h-40 overflow-y-auto p-2">
              {holdingsList.length === 0 ? (
                <div className="text-center text-xs text-gray-600 py-3">ยังไม่มีทรัพย์สิน</div>
              ) : (
                holdingsList.map((h: any) => (
                  <div key={h.symbol} className="glass p-2 mb-2 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-white">{h.symbol}</span>
                      <span className="text-green-400">{h.quantity.toFixed(4)} หน่วย</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>ราคาเฉลี่ย</span>
                      <span>฿{formatPrice(h.avgPrice)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 mt-1">
                      <span>มูลค่า</span>
                      <span className="text-white">${formatPrice(h.totalCost)}</span>
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
              OPEN POSITIONS ({mode.toUpperCase()})
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
        </div>

        {/* Mobile holdings panel */}
        <div className="lg:hidden border-t" style={{ borderColor: 'rgba(59,127,212,0.12)', background: 'rgba(10,22,40,0.5)' }}>
          <div className="p-2 border-b text-xs font-semibold text-gray-400 flex justify-between"
            style={{ borderColor: 'rgba(59,127,212,0.12)' }}>
            <span>ทรัพย์สิน ({mode.toUpperCase()})</span>
            <span className="text-gray-500">{holdingsList.length} รายการ</span>
          </div>
          <div className="max-h-24 overflow-y-auto p-2">
            {holdingsList.length === 0 ? (
              <div className="text-center text-xs text-gray-600 py-2">ยังไม่มีทรัพย์สิน</div>
            ) : (
              holdingsList.map((h: any) => (
                <div key={h.symbol} className="glass p-2 mb-1 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{h.symbol}</span>
                    <span className="text-green-400">{h.quantity.toFixed(2)} หน่วย</span>
                  </div>
                  <div className="text-gray-400">Avg: ${formatPrice(h.avgPrice)}</div>
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
