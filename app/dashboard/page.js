'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    totalIncome: 0,
    totalExpense: 0,
    totalClients: 0,
    activeBudgets: 0,
    budgetAlerts: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const [receiptsRes, clientsRes, budgetsRes] = await Promise.all([
        supabase.from('receipts').select('*').eq('user_id', user.id),
        supabase.from('clients').select('id').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id)
      ])

      const receipts = receiptsRes.data || []
      const clients = clientsRes.data || []
      const budgets = budgetsRes.data || []

      const totalExpense = receipts
        .filter(r => r.type === 'expense' || !r.type)
        .reduce((sum, r) => sum + (r.amount || 0), 0)

      const totalIncome = receipts
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + (r.amount || 0), 0)

      // Budget alerts
      const currentMonth = new Date().toISOString().substring(0, 7)
      const monthlySpending = {}
      receipts.forEach(r => {
        if (r.date?.startsWith(currentMonth) && r.type !== 'income') {
          const key = `${r.client_id || 'all'}-${r.category || 'Diğer'}`
          monthlySpending[key] = (monthlySpending[key] || 0) + (r.amount || 0)
        }
      })

      let alertCount = 0
      budgets.forEach(budget => {
        const key = `${budget.client_id || 'all'}-${budget.category}`
        const spent = monthlySpending[key] || 0
        const percentage = (spent / budget.monthly_limit) * 100
        if (percentage >= budget.alert_threshold) alertCount++
      })

      setStats({
        totalReceipts: receipts.length,
        totalAmount: totalExpense + totalIncome,
        totalIncome,
        totalExpense,
        totalClients: clients.length,
        activeBudgets: budgets.length,
        budgetAlerts: alertCount
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
            🏠 Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
          >
            🚪 Çıkış
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hızlı İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                🧾
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Fiş</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReceipts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                📉
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Gider</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalExpense.toFixed(2)} ₺</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                📈
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Gelir</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalIncome.toFixed(2)} ₺</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-sm text-gray-600">Müşteriler</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Alerts */}
        {stats.budgetAlerts > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">Bütçe Uyarısı!</h3>
                <p className="text-sm text-yellow-800">
                  {stats.budgetAlerts} bütçe kategorisi eşik değerine ulaştı veya aştı.
                </p>
                <button
                  onClick={() => router.push('/budgets')}
                  className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium text-sm"
                >
                  Bütçeleri İncele →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ana Menü */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => router.push('/upload')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition text-left"
          >
            <div className="text-5xl mb-4">📤</div>
            <h3 className="text-2xl font-bold mb-2">Fiş Yükle</h3>
            <p className="text-blue-100">
              Fotoğraf çekerek veya yükleyerek fiş ekleyin
            </p>
          </button>

          <button
            onClick={() => router.push('/receipts')}
            className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition text-left border border-gray-100"
          >
            <div className="text-5xl mb-4">🧾</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Fişlerim</h3>
            <p className="text-gray-600">
              Tüm fişlerinizi görüntüleyin ve yönetin
            </p>
          </button>

          <button
            onClick={() => router.push('/clients')}
            className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition text-left border border-gray-100"
          >
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Müşteriler</h3>
            <p className="text-gray-600">
              Müşteri listesini yönetin
            </p>
            {stats.totalClients > 0 && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {stats.totalClients} müşteri
              </span>
            )}
          </button>

          <button
            onClick={() => router.push('/budgets')}
            className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition text-left border border-gray-100"
          >
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Bütçe Yönetimi</h3>
            <p className="text-gray-600">
              Kategori bazlı bütçe limitleri belirleyin
            </p>
            {stats.budgetAlerts > 0 && (
              <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                ⚠️ {stats.budgetAlerts} uyarı
              </span>
            )}
          </button>

          <button
            onClick={() => router.push('/analytics')}
            className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition text-left border border-gray-100"
          >
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Analiz & Raporlar</h3>
            <p className="text-gray-600">
              Detaylı harcama analizleri ve karşılaştırmalar
            </p>
          </button>

          <button
            onClick={() => alert('Yakında!')}
            className="bg-gray-50 rounded-2xl shadow-lg p-8 hover:shadow-xl transition text-left border-2 border-dashed border-gray-300"
          >
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">PDF Yükle</h3>
            <p className="text-gray-600">
              Toplu PDF fatura yükleme (Yakında)
            </p>
          </button>
        </div>

        {/* Net Durum Kartı */}
        <div className="mt-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
          <h3 className="text-xl font-bold mb-4">💵 Net Durum</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm opacity-90 mb-1">Toplam Gelir</p>
              <p className="text-3xl font-bold">+{stats.totalIncome.toFixed(2)} ₺</p>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Toplam Gider</p>
              <p className="text-3xl font-bold">-{stats.totalExpense.toFixed(2)} ₺</p>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Net</p>
              <p className={`text-4xl font-bold ${
                stats.totalIncome - stats.totalExpense >= 0 ? 'text-white' : 'text-red-200'
              }`}>
                {stats.totalIncome - stats.totalExpense >= 0 ? '+' : ''}
                {(stats.totalIncome - stats.totalExpense).toFixed(2)} ₺
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}