'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    totalVAT: 0,
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
    } else {
      setUser(user)
      await loadStats(user.id)
      await loadMonthlyData(user.id)
      await loadCategoryData(user.id)
    }
    setLoading(false)
  }

  const loadStats = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('amount, vat_amount')
        .eq('user_id', userId)

      if (error) throw error

      const totalReceipts = data.length
      const totalAmount = data.reduce((sum, r) => sum + (r.amount || 0), 0)
      const totalVAT = data.reduce((sum, r) => sum + (r.vat_amount || 0), 0)

      setStats({ totalReceipts, totalAmount, totalVAT })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadMonthlyData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('date, amount, vat_amount')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (error) throw error

      // Aylık gruplama
      const grouped = {}
      data.forEach(r => {
        if (r.date) {
          const month = r.date.substring(0, 7) // YYYY-MM
          if (!grouped[month]) {
            grouped[month] = { count: 0, total: 0, vat: 0 }
          }
          grouped[month].count++
          grouped[month].total += r.amount || 0
          grouped[month].vat += r.vat_amount || 0
        }
      })

      const monthNames = {
        '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
        '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
        '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
      }

      const monthly = Object.keys(grouped)
        .sort()
        .reverse()
        .slice(0, 6)
        .map(month => ({
          month: `${monthNames[month.split('-')[1]]} ${month.split('-')[0]}`,
          ...grouped[month]
        }))

      setMonthlyData(monthly)
    } catch (error) {
      console.error('Error loading monthly data:', error)
    }
  }

  const loadCategoryData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('category, amount')
        .eq('user_id', userId)

      if (error) throw error

      const grouped = {}
      data.forEach(r => {
        const cat = r.category || 'Diğer'
        if (!grouped[cat]) {
          grouped[cat] = { count: 0, total: 0 }
        }
        grouped[cat].count++
        grouped[cat].total += r.amount || 0
      })

      const categories = Object.keys(grouped).map(cat => ({
        category: cat,
        ...grouped[cat]
      })).sort((a, b) => b.total - a.total)

      setCategoryData(categories)
    } catch (error) {
      console.error('Error loading category data:', error)
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

  if (!user) return null

  const categoryIcons = {
    'Yemek': '🍽️',
    'Ulaşım': '🚗',
    'Kırtasiye': '📎',
    'Sağlık': '⚕️',
    'Eğitim': '📚',
    'Diğer': '📦'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🧾 Dashboard
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/receipts')}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition font-medium shadow-sm"
            >
              🧾 Fişlerim
            </button>
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium shadow-sm"
            >
              📸 Fiş Yükle
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Kullanıcı Bilgisi */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-2 text-gray-800">
            Hoş geldiniz! 👋
          </h2>
          <p className="text-gray-600">{user.email}</p>
        </div>
        
        {/* Genel İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition">
            <div className="text-5xl font-bold mb-2">
              {stats.totalReceipts}
            </div>
            <div className="text-blue-100 font-medium">Toplam Fiş</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition">
            <div className="text-5xl font-bold mb-2">
              {stats.totalAmount.toFixed(2)} ₺
            </div>
            <div className="text-green-100 font-medium">Toplam Harcama</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition">
            <div className="text-5xl font-bold mb-2">
              {stats.totalVAT.toFixed(2)} ₺
            </div>
            <div className="text-purple-100 font-medium">KDV Toplamı</div>
          </div>
        </div>

        {/* Aylık Analiz */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Aylık Tablo */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📅 Aylık Analiz
            </h3>
            {monthlyData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
            ) : (
              <div className="space-y-3">
                {monthlyData.map((m, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-800">{m.month}</span>
                      <span className="text-2xl font-bold text-blue-600">{m.total.toFixed(2)} ₺</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{m.count} fiş</span>
                      <span>KDV: {m.vat.toFixed(2)} ₺</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kategori Analizi */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📊 Kategori Analizi
            </h3>
            {categoryData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz veri yok</p>
            ) : (
              <div className="space-y-3">
                {categoryData.map((c, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{categoryIcons[c.category] || '📦'}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">{c.category}</span>
                          <span className="text-xl font-bold text-green-600">{c.total.toFixed(2)} ₺</span>
                        </div>
                        <div className="text-sm text-gray-600">{c.count} fiş</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                        style={{ width: `${(c.total / stats.totalAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hızlı Erişim */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-4">🚀 Hızlı İşlemler</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/upload')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm p-6 rounded-xl transition transform hover:scale-105"
            >
              <div className="text-4xl mb-2">📸</div>
              <div className="font-bold">Yeni Fiş Ekle</div>
              <div className="text-sm text-blue-100 mt-1">Toplu yükleme destekli</div>
            </button>
            <button
              onClick={() => router.push('/receipts')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm p-6 rounded-xl transition transform hover:scale-105"
            >
              <div className="text-4xl mb-2">📋</div>
              <div className="font-bold">Fişleri Görüntüle</div>
              <div className="text-sm text-blue-100 mt-1">Filtreleme ve arama</div>
            </button>
            <button
              onClick={() => alert('Rapor özelliği yakında!')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm p-6 rounded-xl transition transform hover:scale-105"
            >
              <div className="text-4xl mb-2">📊</div>
              <div className="font-bold">Rapor Al</div>
              <div className="text-sm text-blue-100 mt-1">Excel/PDF export</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}