'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    thisMonth: { income: 0, expense: 0 },
    lastMonth: { income: 0, expense: 0 },
    byCategory: {},
    duplicates: []
  })
  const router = useRouter()

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      const receiptsData = data || []
      setReceipts(receiptsData)

      const now = new Date()
      const thisMonth = now.toISOString().substring(0, 7)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7)

      const analytics = {
        thisMonth: { income: 0, expense: 0 },
        lastMonth: { income: 0, expense: 0 },
        byCategory: {},
        duplicates: []
      }

      receiptsData.forEach(receipt => {
        const month = receipt.date?.substring(0, 7)
        const amount = receipt.amount || 0
        const type = receipt.type || 'expense'
        const category = receipt.category || 'Diğer'

        if (month === thisMonth) {
          analytics.thisMonth[type] += amount
        }
        if (month === lastMonth) {
          analytics.lastMonth[type] += amount
        }

        if (!analytics.byCategory[category]) {
          analytics.byCategory[category] = { income: 0, expense: 0 }
        }
        analytics.byCategory[category][type] += amount
      })

      // Duplicate detection
      const duplicateMap = new Map()
      receiptsData.forEach(receipt => {
        const key = `${receipt.date}-${receipt.amount}`
        if (duplicateMap.has(key)) {
          duplicateMap.get(key).push(receipt)
        } else {
          duplicateMap.set(key, [receipt])
        }
      })

      analytics.duplicates = Array.from(duplicateMap.values())
        .filter(group => group.length > 1)
        .flat()

      setStats(analytics)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChangePercentage = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  const expenseChange = getChangePercentage(stats.thisMonth.expense, stats.lastMonth.expense)
  const incomeChange = getChangePercentage(stats.thisMonth.income, stats.lastMonth.income)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📊 Analiz & Raporlar
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Aylık Karşılaştırma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💸 Gider Karşılaştırma</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Bu Ay</p>
                <p className="text-3xl font-bold text-red-600">{stats.thisMonth.expense.toFixed(2)} ₺</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Geçen Ay</p>
                <p className="text-2xl font-bold text-gray-400">{stats.lastMonth.expense.toFixed(2)} ₺</p>
              </div>
              <div className={`p-3 rounded-lg ${
                expenseChange > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <p className={`text-sm font-bold ${
                  expenseChange > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {expenseChange > 0 ? '📈' : '📉'} {Math.abs(expenseChange).toFixed(1)}% {expenseChange > 0 ? 'Artış' : 'Azalış'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Gelir Karşılaştırma</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Bu Ay</p>
                <p className="text-3xl font-bold text-green-600">{stats.thisMonth.income.toFixed(2)} ₺</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Geçen Ay</p>
                <p className="text-2xl font-bold text-gray-400">{stats.lastMonth.income.toFixed(2)} ₺</p>
              </div>
              <div className={`p-3 rounded-lg ${
                incomeChange > 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className={`text-sm font-bold ${
                  incomeChange > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {incomeChange > 0 ? '📈' : '📉'} {Math.abs(incomeChange).toFixed(1)}% {incomeChange > 0 ? 'Artış' : 'Azalış'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Net Kar/Zarar */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <h3 className="text-lg font-bold mb-4">💵 Net Durum (Bu Ay)</h3>
          <div className="flex flex-wrap justify-around gap-4">
            <div className="text-center">
              <p className="text-sm opacity-90">Gelir</p>
              <p className="text-3xl font-bold">+{stats.thisMonth.income.toFixed(2)} ₺</p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90">Gider</p>
              <p className="text-3xl font-bold">-{stats.thisMonth.expense.toFixed(2)} ₺</p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90">Net</p>
              <p className={`text-4xl font-bold ${
                stats.thisMonth.income - stats.thisMonth.expense >= 0 ? 'text-green-300' : 'text-red-300'
              }`}>
                {(stats.thisMonth.income - stats.thisMonth.expense) >= 0 ? '+' : ''}
                {(stats.thisMonth.income - stats.thisMonth.expense).toFixed(2)} ₺
              </p>
            </div>
          </div>
        </div>

        {/* Kategori Bazlı Analiz */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📂 Kategori Bazlı Harcama</h3>
          <div className="space-y-3">
            {Object.entries(stats.byCategory)
              .sort((a, b) => b[1].expense - a[1].expense)
              .map(([category, amounts]) => {
                const total = amounts.expense
                const percentage = (total / stats.thisMonth.expense) * 100

                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{category}</span>
                      <span className="font-bold text-gray-900">{total.toFixed(2)} ₺</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">%{percentage.toFixed(1)}</p>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Duplicate Detection */}
        {stats.duplicates.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
              ⚠️ Olası Tekrar Eden Fişler ({stats.duplicates.length})
            </h3>
            <p className="text-sm text-yellow-800 mb-4">
              Aynı tarih ve tutarda birden fazla fiş tespit edildi. Kontrol etmenizi öneririz.
            </p>
            <div className="space-y-2">
              {stats.duplicates.slice(0, 5).map(receipt => (
                <div key={receipt.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{receipt.company_name || 'Bilinmeyen'}</p>
                    <p className="text-sm text-gray-600">
                      {receipt.date} - {receipt.amount?.toFixed(2)} ₺
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/receipts/edit/${receipt.id}`)}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium"
                  >
                    İncele
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}