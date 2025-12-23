'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState([])
  const [clients, setClients] = useState([])
  const [spending, setSpending] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    category: '',
    monthly_limit: '',
    alert_threshold: 80
  })
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const [budgetsRes, clientsRes, receiptsRes] = await Promise.all([
        supabase.from('budgets').select('*, clients(name)').eq('user_id', user.id),
        supabase.from('clients').select('*').eq('user_id', user.id),
        supabase.from('receipts').select('*').eq('user_id', user.id)
      ])

      if (budgetsRes.error) throw budgetsRes.error
      if (clientsRes.error) throw clientsRes.error
      if (receiptsRes.error) throw receiptsRes.error

      setBudgets(budgetsRes.data || [])
      setClients(clientsRes.data || [])

      const currentMonth = new Date().toISOString().substring(0, 7)
      const monthlySpending = {}

      receiptsRes.data?.forEach(receipt => {
        if (receipt.date?.startsWith(currentMonth)) {
          const key = `${receipt.client_id || 'all'}-${receipt.category || 'Diğer'}`
          monthlySpending[key] = (monthlySpending[key] || 0) + (receipt.amount || 0)
        }
      })

      setSpending(monthlySpending)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('budgets')
        .insert([{
          ...formData,
          user_id: user.id,
          client_id: formData.client_id || null,
          monthly_limit: parseFloat(formData.monthly_limit)
        }])

      if (error) throw error

      setShowForm(false)
      setFormData({ client_id: '', category: '', monthly_limit: '', alert_threshold: 80 })
      loadData()
    } catch (error) {
      alert('Hata: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu bütçeyi silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
      loadData()
    } catch (error) {
      alert('Silme hatası: ' + error.message)
    }
  }

  const getUsagePercentage = (budget) => {
    const key = `${budget.client_id || 'all'}-${budget.category}`
    const spent = spending[key] || 0
    return (spent / budget.monthly_limit) * 100
  }

  const getUsageColor = (percentage, threshold) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= threshold) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            💰 Bütçe Yönetimi
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
            >
              + Yeni Bütçe
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">➕ Yeni Bütçe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Müşteri (Opsiyonel)
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Tüm Müşteriler</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Seçiniz</option>
                  <option value="Yemek">🍽️ Yemek</option>
                  <option value="Ulaşım">🚗 Ulaşım</option>
                  <option value="Kırtasiye">📎 Kırtasiye</option>
                  <option value="Sağlık">⚕️ Sağlık</option>
                  <option value="Eğitim">📚 Eğitim</option>
                  <option value="Diğer">📦 Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aylık Limit (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({...formData, monthly_limit: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="5000.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uyarı Eşiği (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alert_threshold}
                  onChange={(e) => setFormData({...formData, alert_threshold: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={!formData.category || !formData.monthly_limit}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
              >
                ✅ Kaydet
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                ❌ İptal
              </button>
            </div>
          </div>
        )}

        {budgets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="text-7xl mb-4">💰</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Henüz bütçe belirlemediniz
            </h2>
            <p className="text-gray-600 mb-6">
              Kategorilere göre aylık harcama limitleri belirleyin
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
            >
              + İlk Bütçeyi Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => {
              const percentage = getUsagePercentage(budget)
              const key = `${budget.client_id || 'all'}-${budget.category}`
              const spent = spending[key] || 0
              const remaining = budget.monthly_limit - spent

              return (
                <div key={budget.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{budget.category}</h3>
                      {budget.clients && (
                        <p className="text-sm text-gray-600">{budget.clients.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Harcanan</span>
                        <span className="font-bold text-gray-900">{spent.toFixed(2)} ₺</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Limit</span>
                        <span className="font-bold text-gray-900">{budget.monthly_limit.toFixed(2)} ₺</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${getUsageColor(percentage, budget.alert_threshold)}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className={`text-sm font-bold ${
                          percentage >= 100 ? 'text-red-600' :
                          percentage >= budget.alert_threshold ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          %{percentage.toFixed(0)}
                        </span>
                        <span className="text-sm text-gray-600">
                          Kalan: {remaining.toFixed(2)} ₺
                        </span>
                      </div>
                    </div>

                    {percentage >= 100 && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800 font-medium">
                          ⚠️ Bütçe aşıldı!
                        </p>
                      </div>
                    )}

                    {percentage >= budget.alert_threshold && percentage < 100 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 font-medium">
                          ⚠️ Bütçe %{budget.alert_threshold}'e ulaştı!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}