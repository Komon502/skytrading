import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
import { isAdmin } from '../../lib/admin'
import { 
  Plus, Edit2, Trash2, TrendingUp, TrendingDown, 
  Clock, Calendar, Percent, DollarSign, Activity,
  Save, X, RefreshCw, Eye, EyeOff
} from 'lucide-react'

interface CustomForex {
  id: string
  symbol: string
  name: string
  description: string
  base_price: number
  current_price: number
  price_volatility: number
  market_open_time: string
  market_close_time: string
  trading_days: number[]
  is_market_open: boolean
  player_win_rate: number
  is_active: boolean
  is_demo_only: boolean
  created_at: string
}

export default function AdminForexPage() {
  const router = useRouter()
  const [forexList, setForexList] = useState<CustomForex[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingForex, setEditingForex] = useState<CustomForex | null>(null)
  const [user, setUser] = useState<any>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    description: '',
    base_price: 1.0,
    price_volatility: 0.001,
    market_open_time: '00:00',
    market_close_time: '23:59',
    trading_days: [1, 2, 3, 4, 5], // Mon-Fri
    player_win_rate: 0.50,
    is_active: true,
    is_demo_only: false
  })

  // Check admin access
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth')
        return
      }
      const userEmail = data.session.user.email
      if (!isAdmin(userEmail || '')) {
        router.replace('/')
        return
      }
      setUser(data.session.user)
      loadForex()
    })
  }, [router])

  const loadForex = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('custom_forex_pairs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) {
      setForexList(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ...formData,
      current_price: formData.base_price,
      created_by: user.id
    }
    
    if (editingForex) {
      const { error } = await supabase
        .from('custom_forex_pairs')
        .update(payload)
        .eq('id', editingForex.id)
      
      if (error) {
        alert('Error updating: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('custom_forex_pairs')
        .insert(payload)
      
      if (error) {
        alert('Error creating: ' + error.message)
        return
      }
    }
    
    setShowModal(false)
    setEditingForex(null)
    resetForm()
    loadForex()
  }

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      description: '',
      base_price: 1.0,
      price_volatility: 0.001,
      market_open_time: '00:00',
      market_close_time: '23:59',
      trading_days: [1, 2, 3, 4, 5],
      player_win_rate: 0.50,
      is_active: true,
      is_demo_only: false
    })
  }

  const handleEdit = (forex: CustomForex) => {
    setEditingForex(forex)
    setFormData({
      symbol: forex.symbol,
      name: forex.name,
      description: forex.description || '',
      base_price: forex.base_price,
      price_volatility: forex.price_volatility,
      market_open_time: forex.market_open_time.slice(0, 5),
      market_close_time: forex.market_close_time.slice(0, 5),
      trading_days: forex.trading_days,
      player_win_rate: forex.player_win_rate,
      is_active: forex.is_active,
      is_demo_only: forex.is_demo_only
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this forex pair? All trades will be affected.')) return
    
    const { error } = await supabase
      .from('custom_forex_pairs')
      .delete()
      .eq('id', id)
    
    if (error) {
      alert('Error deleting: ' + error.message)
    } else {
      loadForex()
    }
  }

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      trading_days: prev.trading_days.includes(day)
        ? prev.trading_days.filter(d => d !== day)
        : [...prev.trading_days, day].sort()
    }))
  }

  const formatDays = (days: number[]) => {
    const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map(d => dayNames[d]).join(', ')
  }

  const updatePrice = async (id: string) => {
    const { data, error } = await supabase
      .rpc('update_custom_forex_price', { forex_uuid: id })
    
    if (error) {
      alert('Error updating price: ' + error.message)
    } else {
      loadForex()
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Custom Forex Management</h1>
            <p className="text-gray-400 text-sm mt-1">Create and manage custom forex pairs with controlled pricing</p>
          </div>
          <button
            onClick={() => { setShowModal(true); resetForm(); setEditingForex(null); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Create Forex Pair
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass p-4 rounded-lg">
            <p className="text-gray-400 text-xs mb-1">Total Pairs</p>
            <p className="text-2xl font-bold text-white">{forexList.length}</p>
          </div>
          <div className="glass p-4 rounded-lg">
            <p className="text-gray-400 text-xs mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">
              {forexList.filter(f => f.is_active).length}
            </p>
          </div>
          <div className="glass p-4 rounded-lg">
            <p className="text-gray-400 text-xs mb-1">Demo Only</p>
            <p className="text-2xl font-bold text-yellow-400">
              {forexList.filter(f => f.is_demo_only).length}
            </p>
          </div>
          <div className="glass p-4 rounded-lg">
            <p className="text-gray-400 text-xs mb-1">Market Open</p>
            <p className="text-2xl font-bold text-blue-400">
              {forexList.filter(f => f.is_market_open).length}
            </p>
          </div>
        </div>

        {/* Forex List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : forexList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No custom forex pairs yet.</p>
            <p className="text-sm mt-2">Click "Create Forex Pair" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forexList.map((forex) => (
              <div 
                key={forex.id} 
                className={`glass rounded-lg p-4 ${!forex.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{forex.symbol}</h3>
                      <span className="text-sm text-gray-400">{forex.name}</span>
                      {forex.is_demo_only && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                          DEMO ONLY
                        </span>
                      )}
                      {!forex.is_active && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Current Price</p>
                        <p className="text-white font-mono font-medium">
                          ฿{forex.current_price.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Base Price</p>
                        <p className="text-gray-400 font-mono">
                          ฿{forex.base_price.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Market Hours</p>
                        <p className="text-gray-400">
                          {forex.market_open_time.slice(0, 5)} - {forex.market_close_time.slice(0, 5)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDays(forex.trading_days)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Player Win Rate</p>
                        <p className={`font-medium ${forex.player_win_rate > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                          {(forex.player_win_rate * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    
                    {forex.description && (
                      <p className="text-gray-500 text-sm mt-2">{forex.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => updatePrice(forex.id)}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Update Price"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(forex)}
                      className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(forex.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-blue-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-blue-500/20 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingForex ? 'Edit Forex Pair' : 'Create Forex Pair'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Symbol</label>
                  <input
                    type="text"
                    required
                    value={formData.symbol}
                    onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                    className="input-sky w-full"
                    placeholder="THBUSD"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="input-sky w-full"
                    placeholder="Thai Baht / US Dollar"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="input-sky w-full"
                  placeholder="Optional description"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Base Price</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.base_price}
                    onChange={e => setFormData({...formData, base_price: parseFloat(e.target.value)})}
                    className="input-sky w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Price Volatility</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="0.1"
                    value={formData.price_volatility}
                    onChange={e => setFormData({...formData, price_volatility: parseFloat(e.target.value)})}
                    className="input-sky w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">{(formData.price_volatility * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Player Win Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.player_win_rate}
                    onChange={e => setFormData({...formData, player_win_rate: parseFloat(e.target.value)})}
                    className="input-sky w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">{(formData.player_win_rate * 100).toFixed(0)}%</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Market Open Time</label>
                  <input
                    type="time"
                    value={formData.market_open_time}
                    onChange={e => setFormData({...formData, market_open_time: e.target.value})}
                    className="input-sky w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Market Close Time</label>
                  <input
                    type="time"
                    value={formData.market_close_time}
                    onChange={e => setFormData({...formData, market_close_time: e.target.value})}
                    className="input-sky w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-2">Trading Days</label>
                <div className="flex gap-2">
                  {[
                    { day: 1, label: 'Mon' },
                    { day: 2, label: 'Tue' },
                    { day: 3, label: 'Wed' },
                    { day: 4, label: 'Thu' },
                    { day: 5, label: 'Fri' },
                    { day: 6, label: 'Sat' },
                    { day: 7, label: 'Sun' }
                  ].map(({ day, label }) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                        formData.trading_days.includes(day)
                          ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                          : 'bg-gray-700/50 text-gray-500 border border-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  <span className="text-sm text-gray-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_demo_only}
                    onChange={e => setFormData({...formData, is_demo_only: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-yellow-500"
                  />
                  <span className="text-sm text-yellow-400">Demo Only</span>
                </label>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors"
                >
                  {editingForex ? 'Save Changes' : 'Create Pair'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
