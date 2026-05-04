import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { 
  getCustomForexPairs, getCustomForexPrice, placeCustomForexTrade, 
  closeCustomForexTrade, CustomForexPair, formatPrice 
} from '../lib/market'
import Navbar from '../components/Navbar'

const CustomForexChart = dynamic(() => import('../components/CustomForexChart'), { ssr: false })
import { 
  TrendingUp, TrendingDown, Loader2, ArrowUpCircle, ArrowDownCircle,
  Clock, DollarSign, BarChart3, History, X, RefreshCw
} from 'lucide-react'

interface ForexTrade {
  id: string
  type: 'buy' | 'sell'
  quantity: number
  entry_price: number
  exit_price?: number
  status: 'open' | 'closed' | 'cancelled'
  profit_loss?: number
  created_at: string
  closed_at?: string
  forex: {
    symbol: string
    name: string
  }
}

export default function CustomForexPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [mode, setMode] = useState<'demo' | 'real'>('demo')
  
  const [forexList, setForexList] = useState<CustomForexPair[]>([])
  const [selectedForex, setSelectedForex] = useState<CustomForexPair | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [trades, setTrades] = useState<ForexTrade[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth')
        return
      }
      setUser(data.session.user)
      loadWallet(data.session.user.id)
      loadForexList()
      loadTrades(data.session.user.id)
    })
  }, [router])

  const loadWallet = async (userId: string) => {
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single()
    setWallet(data)
  }

  const loadForexList = async () => {
    const pairs = await getCustomForexPairs()
    setForexList(pairs)
    if (pairs.length > 0 && !selectedForex) {
      setSelectedForex(pairs[0])
    }
  }

  const loadTrades = async (userId: string) => {
    const { data } = await supabase
      .from('custom_forex_trades')
      .select('*, forex:custom_forex_pairs(symbol, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    setTrades(data || [])
  }

  // Fetch price
  const fetchPrice = useCallback(async () => {
    if (!selectedForex) return
    setPriceLoading(true)
    try {
      const data = await getCustomForexPrice(selectedForex.symbol)
      setPrice(data.price)
    } catch {
      setPrice(null)
    }
    setPriceLoading(false)
  }, [selectedForex])

  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, 5000)
    return () => clearInterval(interval)
  }, [fetchPrice])

  const handleOrder = async () => {
    if (!user || !wallet || !selectedForex || !price) return
    
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) {
      setOrderMsg({ type: 'error', text: 'ใส่จำนวนให้ถูกต้อง' })
      return
    }

    const total = qty * price
    const balance = mode === 'demo' ? wallet.demo_balance : wallet.real_balance

    if (orderType === 'buy' && total > balance) {
      setOrderMsg({ type: 'error', text: 'ยอดเงินไม่เพียงพอ' })
      return
    }

    setOrderLoading(true)
    try {
      await placeCustomForexTrade(user.id, selectedForex.id, orderType, qty, mode)
      
      // Deduct balance
      const balKey = mode === 'demo' ? 'demo_balance' : 'real_balance'
      const newBal = orderType === 'buy' ? balance - total : balance + total
      await supabase.from('wallets').update({ [balKey]: newBal }).eq('user_id', user.id)
      
      await loadWallet(user.id)
      await loadTrades(user.id)
      setOrderMsg({ type: 'success', text: `${orderType === 'buy' ? 'ซื้อ' : 'ขาย'} ${qty} ${selectedForex.symbol} สำเร็จ` })
      setQuantity('')
    } catch (error: any) {
      setOrderMsg({ type: 'error', text: error.message })
    }
    setOrderLoading(false)
  }

  const handleCloseTrade = async (tradeId: string) => {
    try {
      const result = await closeCustomForexTrade(tradeId)
      
      // Update wallet with P&L
      if (result && result.profit_loss) {
        const balKey = mode === 'demo' ? 'demo_balance' : 'real_balance'
        const newBal = wallet[balKey] + result.profit_loss
        await supabase.from('wallets').update({ [balKey]: newBal }).eq('user_id', user.id)
      }
      
      await loadWallet(user.id)
      await loadTrades(user.id)
      setOrderMsg({ type: 'success', text: 'ปิดการเทรดสำเร็จ' })
    } catch (error: any) {
      setOrderMsg({ type: 'error', text: error.message })
    }
  }

  const openTrades = trades.filter(t => t.status === 'open' && t.forex?.symbol === selectedForex?.symbol)
  const hasOpenTrade = openTrades.length > 0

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar user={user} wallet={wallet} mode={mode} onModeChange={setMode} />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="text-blue-400" />
              ตลาด Forex กำหนดเอง
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              เทรด Forex ที่ผู้ดูแลระบบสร้างขึ้น พร้อมโอกาสชนะที่ควบคุมได้
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-secondary flex items-center gap-2"
            >
              <History size={18} />
              ประวัติ
            </button>
            <div className={`px-4 py-2 rounded-lg font-medium ${mode === 'demo' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
              {mode === 'demo' ? 'DEMO MODE' : 'REAL MODE'}
            </div>
            <button
              onClick={() => setMode(mode === 'demo' ? 'real' : 'demo')}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              สลับโหมด
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Forex List */}
          <div className="glass rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-400" />
              คู่เงินที่เปิดให้เทรด
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {forexList.map((forex) => (
                <button
                  key={forex.id}
                  onClick={() => setSelectedForex(forex)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedForex?.id === forex.id
                      ? 'bg-blue-500/20 border border-blue-500/40'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{forex.symbol}</span>
                      <span className="text-xs text-gray-400 ml-2">{forex.name}</span>
                    </div>
                    {forex.is_demo_only && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-gray-500">
                      โอกาสชนะ: {(forex.player_win_rate * 100).toFixed(0)}%
                    </span>
                    <span className={forex.is_market_open ? 'text-green-400' : 'text-red-400'}>
                      {forex.is_market_open ? 'เปิด' : 'ปิด'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Trading Panel */}
          <div className="lg:col-span-2 space-y-4">
            {selectedForex && (
              <>
                {/* Price Card */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedForex.symbol}</h2>
                      <p className="text-gray-400">{selectedForex.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-3xl font-mono font-bold text-white">
                          {price ? `฿${formatPrice(price, 4)}` : '-'}
                        </span>
                        {priceLoading && <Loader2 size={20} className="animate-spin text-blue-400" />}
                      </div>
                      <button
                        onClick={fetchPrice}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mt-1"
                      >
                        <RefreshCw size={12} />
                        รีเฟรชราคา
                      </button>
                    </div>
                  </div>

                  {selectedForex.description && (
                    <p className="text-sm text-gray-500 mb-4">{selectedForex.description}</p>
                  )}

                  {/* Market Status */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className={selectedForex.is_market_open ? 'text-green-400' : 'text-red-400'} />
                        <span className={selectedForex.is_market_open ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                          ตลาด{selectedForex.is_market_open ? 'เปิด' : 'ปิด'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-400" />
                        <span className="text-gray-400">
                          โอกาสชนะ: {(selectedForex.player_win_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    {/* Admin market hours */}
                    <div className="text-xs text-gray-500 bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-gray-400">เวลาตลาด (ตั้งค่าโดยแอดมิน): </span>
                      <span className="text-gray-300 font-mono">
                        {selectedForex.market_open_time?.slice(0, 5)} - {selectedForex.market_close_time?.slice(0, 5)}
                      </span>
                      <span className="mx-2 text-gray-600">|</span>
                      <span className="text-gray-400">
                        {selectedForex.trading_days?.map((d: number) => ['', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'][d]).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <CustomForexChart symbol={selectedForex.symbol} height={280} isMarketOpen={selectedForex.is_market_open} />

                {/* Order Panel */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">สั่งซื้อ/ขาย</h3>
                  
                  {/* Order Type */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => setOrderType('buy')}
                      className={`py-4 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 border-2 ${
                        orderType === 'buy'
                          ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-lg shadow-green-500/10'
                          : 'text-gray-500 border-gray-700 hover:border-green-500/30 hover:text-green-400/70'
                      }`}
                    >
                      <ArrowUpCircle size={24} className={orderType === 'buy' ? 'text-green-400' : 'text-gray-500'} />
                      <span>ซื้อ (BUY)</span>
                      <span className="text-xs font-normal opacity-70">คาดว่าราคาจะขึ้น</span>
                    </button>
                    <button
                      onClick={() => setOrderType('sell')}
                      className={`py-4 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 border-2 ${
                        orderType === 'sell'
                          ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-lg shadow-red-500/10'
                          : 'text-gray-500 border-gray-700 hover:border-red-500/30 hover:text-red-400/70'
                      }`}
                    >
                      <ArrowDownCircle size={24} className={orderType === 'sell' ? 'text-red-400' : 'text-gray-500'} />
                      <span>ขาย (SELL)</span>
                      <span className="text-xs font-normal opacity-70">คาดว่าราคาจะลง</span>
                    </button>
                  </div>

                  {/* Quantity Input */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">จำนวน (หน่วย)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="input-sky w-full text-center text-lg"
                      placeholder="0.00"
                    />
                    {price && quantity && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        มูลค่ารวม: ฿{formatPrice(parseFloat(quantity) * price, 2)}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  {orderMsg && (
                    <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
                      orderMsg.type === 'success'
                        ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                        : 'bg-red-400/10 text-red-400 border border-red-400/20'
                    }`}>
                      {orderMsg.text}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleOrder}
                    disabled={orderLoading || !price || !selectedForex.is_market_open || (selectedForex.is_demo_only && mode !== 'demo')}
                    className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                      !selectedForex.is_market_open
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : orderType === 'buy'
                          ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/20'
                          : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20'
                    } disabled:opacity-40`}
                  >
                    {orderLoading && <Loader2 size={18} className="animate-spin" />}
                    {!selectedForex.is_market_open
                      ? '⏸️ ตลาดปิด'
                      : selectedForex.is_demo_only && mode !== 'demo'
                        ? '🔒 DEMO ONLY'
                        : `${orderType === 'buy' ? '🟢 ซื้อ' : '🔴 ขาย'} ${selectedForex.symbol}`
                    }
                  </button>
                </div>

                {/* Open Trades */}
                {hasOpenTrade && (
                  <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">การเทรดที่เปิดอยู่</h3>
                    <div className="space-y-3">
                      {openTrades.map((trade) => (
                        <div key={trade.id} className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {trade.type.toUpperCase()}
                                </span>
                                <span className="text-white font-medium">{trade.quantity} หน่วย</span>
                              </div>
                              <p className="text-sm text-gray-400">
                                ราคาเข้า: ฿{formatPrice(trade.entry_price, 4)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(trade.created_at).toLocaleString('th-TH')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCloseTrade(trade.id)}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              ปิดการเทรด
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Trade History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-blue-500/30 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-blue-500/20 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">ประวัติการเทรด</h3>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {trades.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">ยังไม่มีการเทรด</p>
                ) : (
                  <div className="space-y-2">
                    {trades.map((trade) => (
                      <div key={trade.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.type.toUpperCase()}
                            </span>
                            <span className="text-white font-medium">{trade.forex?.symbol}</span>
                            <span className="text-gray-400 text-sm">{trade.quantity} หน่วย</span>
                          </div>
                          <span className={`text-sm font-medium ${
                            trade.status === 'open' ? 'text-blue-400' :
                            (trade.profit_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.status === 'open' ? 'เปิดอยู่' :
                             trade.profit_loss ? `${(trade.profit_loss >= 0 ? '+' : '')}฿${formatPrice(trade.profit_loss, 2)}` : ''
                            }
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          เข้า: ฿{formatPrice(trade.entry_price, 4)}
                          {trade.exit_price && ` → ออก: ฿${formatPrice(trade.exit_price, 4)}`}
                          <span className="ml-2">
                            {new Date(trade.created_at).toLocaleString('th-TH')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
