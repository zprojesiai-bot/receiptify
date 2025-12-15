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
      loadStats(user.id)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🧾 Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/receipts')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              🧾 Fişlerim
            </button>
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              📸 Fiş Yükle
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Hoş geldiniz! 👋
          </h2>
          <p className="text-gray-600 mb-1">
            Email: {user.email}
          </p>
          <p className="text-sm text-gray-500">
            Hafta 3: OCR sistemi aktif! Fişleriniz otomatik işleniyor.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {stats.totalReceipts}
            </div>
            <div className="text-sm text-gray-700 font-medium">Toplam Fiş</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {stats.totalAmount.toFixed(2)} TL
            </div>
            <div className="text-sm text-gray-700 font-medium">Toplam Tutar</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {stats.totalVAT.toFixed(2)} TL
            </div>
            <div className="text-sm text-gray-700 font-medium">KDV Toplamı</div>
          </div>
        </div>

        <div className="mt-8 bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="text-3xl mr-4">🎉</div>
            <div>
              <h3 className="text-lg font-bold text-green-800 mb-2">
                Hafta 3 Tamamlandı!
              </h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ OCR ile otomatik veri çıkarma</li>
                <li>✅ Gelişmiş tarih, tutar, KDV bulma</li>
                <li>✅ Manuel düzeltme imkanı</li>
                <li>✅ Fiş listesi ve yönetim</li>
              </ul>
              <p className="mt-3 text-sm text-green-600 font-medium">
                Gelecek hafta: Claude API ile %95 doğruluk! 🤖
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}