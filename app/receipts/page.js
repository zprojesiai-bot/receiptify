'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([])
  const [filteredReceipts, setFilteredReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingImage, setViewingImage] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    minAmount: '',
    maxAmount: '',
    search: ''
  })
  const [anomalies, setAnomalies] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadReceipts()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [receipts, filters])

  const loadReceipts = async () => {
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
        .order('created_at', { ascending: false })

      if (error) throw error

      setReceipts(data || [])
      detectAnomalies(data || [])
    } catch (error) {
      console.error('Error loading receipts:', error)
    } finally {
      setLoading(false)
    }
  }

  const detectAnomalies = (data) => {
    if (data.length < 3) return

    const amounts = data.map(r => r.amount || 0).filter(a => a > 0)
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / amounts.length)

    const detected = data.filter(r => {
      const amount = r.amount || 0
      return amount > avg + (2 * stdDev) // 2 standart sapma üstü
    }).map(r => r.id)

    setAnomalies(detected)
  }

  const applyFilters = () => {
    let filtered = [...receipts]

    // Tarih filtresi
    if (filters.startDate) {
      filtered = filtered.filter(r => r.date >= filters.startDate)
    }
    if (filters.endDate) {
      filtered = filtered.filter(r => r.date <= filters.endDate)
    }

    // Kategori filtresi
    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category)
    }

    // Tutar filtresi
    if (filters.minAmount) {
      filtered = filtered.filter(r => (r.amount || 0) >= parseFloat(filters.minAmount))
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(r => (r.amount || 0) <= parseFloat(filters.maxAmount))
    }

    // Arama
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(r => 
        (r.company_name || '').toLowerCase().includes(search) ||
        (r.notes || '').toLowerCase().includes(search)
      )
    }

    setFilteredReceipts(filtered)
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu fişi silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id)

      if (error) throw error

      setReceipts(receipts.filter(r => r.id !== id))
    } catch (error) {
      alert('Silme hatası: ' + error.message)
    }
  }

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      category: '',
      minAmount: '',
      maxAmount: '',
      search: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

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
      {/* Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Fiş Görüntüsü</h3>
              <button
                onClick={() => setViewingImage(null)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
              >
                ✕ Kapat
              </button>
            </div>
            <div className="p-4">
              <img src={viewingImage} alt="Receipt" className="w-full rounded-lg" />
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🧾 Fişlerim
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-sm"
            >
              + Yeni Fiş
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
        {/* Anomaly Uyarısı */}
        {anomalies.length > 0 && (
          <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">Anomali Tespit Edildi!</h3>
                <p className="text-sm text-yellow-800">
                  {anomalies.length} fiş normalden yüksek tutar içeriyor. Kontrol etmek ister misiniz?
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtre Paneli */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            🔍 Gelişmiş Filtreleme
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Başlangıç"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Bitiş"
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Tüm Kategoriler</option>
              <option value="Yemek">🍽️ Yemek</option>
              <option value="Ulaşım">🚗 Ulaşım</option>
              <option value="Kırtasiye">📎 Kırtasiye</option>
              <option value="Sağlık">⚕️ Sağlık</option>
              <option value="Eğitim">📚 Eğitim</option>
              <option value="Diğer">📦 Diğer</option>
            </select>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Min tutar"
            />
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Max tutar"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="🔍 Ara..."
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              {filteredReceipts.length} / {receipts.length} fiş gösteriliyor
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Fiş Listesi */}
        {filteredReceipts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="text-7xl mb-4">🔭</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {receipts.length === 0 ? 'Henüz fiş yüklemediniz' : 'Filtre sonucu bulunamadı'}
            </h2>
            <p className="text-gray-600 mb-6">
              {receipts.length === 0 ? 'İlk fişinizi yüklemek için butona tıklayın' : 'Farklı filtreler deneyin'}
            </p>
            <button
              onClick={() => receipts.length === 0 ? router.push('/upload') : resetFilters()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
            >
              {receipts.length === 0 ? '📸 İlk Fişi Yükle' : 'Filtreleri Temizle'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Firma</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tutar</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">KDV</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => (
                  <tr 
                    key={receipt.id} 
                    className={`hover:bg-blue-50 transition ${
                      anomalies.includes(receipt.id) ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {receipt.date ? new Date(receipt.date).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {receipt.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
                        {categoryIcons[receipt.category] || '📦'} {receipt.category || 'Diğer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {receipt.amount ? `${receipt.amount.toFixed(2)} ₺` : '-'}
                      {anomalies.includes(receipt.id) && (
                        <span className="ml-2 text-yellow-600" title="Normalden yüksek">⚠️</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {receipt.vat_amount ? `${receipt.vat_amount.toFixed(2)} ₺` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingImage(receipt.image_url)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition"
                        >
                          👁️ Göster
                        </button>
                        <button
                          onClick={() => handleDelete(receipt.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition"
                        >
                           ✏️ Düzenle
</button>
<button
  onClick={() => handleDelete(receipt.id)}
  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition"
  >                        
  🗑️ Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t-2 border-blue-100">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">
                  Toplam <strong className="text-blue-600">{filteredReceipts.length}</strong> fiş
                </p>
                <p className="text-sm font-medium text-gray-700">
                  Toplam Tutar: <strong className="text-green-600">
                    {filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)} ₺
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}