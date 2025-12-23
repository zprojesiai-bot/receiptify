'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function BulkReviewPage() {
  const [receipts, setReceipts] = useState([])
  const [saving, setSaving] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const data = localStorage.getItem('bulk_results')
    if (data) {
      setReceipts(JSON.parse(data))
    } else {
      router.push('/upload')
    }
  }, [])

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return 'bg-green-100 border-green-400 text-green-800'
    if (confidence >= 70) return 'bg-yellow-100 border-yellow-400 text-yellow-800'
    return 'bg-red-100 border-red-400 text-red-800'
  }

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 85) return '✓'
    if (confidence >= 70) return '⚠'
    return '✗'
  }

  const updateReceipt = (index, field, value) => {
    const updated = [...receipts]
    updated[index][field] = value
    setReceipts(updated)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const inserts = receipts.map(r => ({
        user_id: user.id,
        image_url: r.imageUrl,
        date: r.date || null,
        amount: r.amount ? parseFloat(r.amount) : null,
        company_name: r.companyName || null,
        vat_rate: r.vatRate ? parseFloat(r.vatRate) : null,
        vat_amount: r.vatAmount ? parseFloat(r.vatAmount) : null,
        category: r.category || null,
        notes: r.notes || null,
        raw_ocr_text: r.rawText || null,
      }))

      const { error } = await supabase
        .from('receipts')
        .insert(inserts)

      if (error) throw error

      localStorage.removeItem('bulk_results')
      router.push('/receipts')
    } catch (error) {
      alert('Kayıt hatası: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (receipts.length === 0) return null

  const current = receipts[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📋 Toplu İnceleme ({currentIndex + 1}/{receipts.length})
          </h1>
          <button
            onClick={() => router.push('/upload')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            ← İptal
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-6 bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">İlerleme</span>
            <span className="font-bold text-blue-600">{currentIndex + 1} / {receipts.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / receipts.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fiş Fotoğrafı */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              📸 Fiş Fotoğrafı
            </h3>
            <img
              src={current.imageUrl}
              alt="Receipt"
              className="w-full rounded-lg border-2 border-gray-200 shadow-sm"
            />
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              ✏️ Bilgileri Kontrol Edin
            </h3>
            
            <div className="space-y-4">
              {/* Tarih */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2 flex-wrap">
                  <span>📅 Tarih</span>
                  {current.confidence?.date && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceColor(current.confidence.date)}`}>
                      {getConfidenceIcon(current.confidence.date)} {current.confidence.date}%
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={current.date}
                  onChange={(e) => updateReceipt(currentIndex, 'date', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Firma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2 flex-wrap">
                  <span>🏢 Firma Adı</span>
                  {current.confidence?.companyName && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceColor(current.confidence.companyName)}`}>
                      {getConfidenceIcon(current.confidence.companyName)} {current.confidence.companyName}%
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={current.companyName}
                  onChange={(e) => updateReceipt(currentIndex, 'companyName', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Tutar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2 flex-wrap">
                  <span>💰 Toplam Tutar (₺)</span>
                  {current.confidence?.amount && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceColor(current.confidence.amount)}`}>
                      {getConfidenceIcon(current.confidence.amount)} {current.confidence.amount}%
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={current.amount}
                  onChange={(e) => updateReceipt(currentIndex, 'amount', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* KDV Tutar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2 flex-wrap">
                  <span>📊 KDV Tutarı (₺)</span>
                  {current.confidence?.vatAmount && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceColor(current.confidence.vatAmount)}`}>
                      {getConfidenceIcon(current.confidence.vatAmount)} {current.confidence.vatAmount}%
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={current.vatAmount}
                  onChange={(e) => updateReceipt(currentIndex, 'vatAmount', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* KDV Oran */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2 flex-wrap">
                  <span>📈 KDV Oranı (%)</span>
                  {current.confidence?.vatRate && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceColor(current.confidence.vatRate)}`}>
                      {getConfidenceIcon(current.confidence.vatRate)} {current.confidence.vatRate}%
                    </span>
                  )}
                </label>
                <select
                  value={current.vatRate}
                  onChange={(e) => updateReceipt(currentIndex, 'vatRate', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Seçiniz</option>
                  <option value="1">%1</option>
                  <option value="10">%10</option>
                  <option value="20">%20</option>
                </select>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏷️ Kategori
                </label>
                <select
                  value={current.category}
                  onChange={(e) => updateReceipt(currentIndex, 'category', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                ← Önceki
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(receipts.length - 1, currentIndex + 1))}
                disabled={currentIndex === receipts.length - 1}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                Sonraki →
              </button>
            </div>

            {/* Save All Button */}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold text-lg hover:from-green-700 hover:to-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? '⏳ Kaydediliyor...' : `✅ Tümünü Kaydet (${receipts.length} fiş)`}
            </button>
          </div>
        </div>

        {/* Mobile: Hızlı Navigasyon */}
        <div className="block lg:hidden mt-6 bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {receipts.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`min-w-[50px] px-4 py-2 rounded-lg font-medium transition ${
                  idx === currentIndex
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}