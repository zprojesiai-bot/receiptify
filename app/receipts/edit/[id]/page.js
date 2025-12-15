'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function EditReceiptPage() {
  const router = useRouter()
  const params = useParams()
  const receiptId = params.id
  
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    company_name: '',
    vat_rate: '',
    vat_amount: '',
    category: '',
    notes: '',
  })
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadReceipt()
  }, [receiptId])

  const loadReceipt = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single()

      if (error) throw error

      setImageUrl(data.image_url)
      setFormData({
        date: data.date || '',
        amount: data.amount || '',
        company_name: data.company_name || '',
        vat_rate: data.vat_rate || '',
        vat_amount: data.vat_amount || '',
        category: data.category || '',
        notes: data.notes || '',
      })
    } catch (error) {
      console.error('Error loading receipt:', error)
      setMessage('Fiş yüklenemedi!')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          date: formData.date || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          company_name: formData.company_name || null,
          vat_rate: formData.vat_rate ? parseFloat(formData.vat_rate) : null,
          vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
          category: formData.category || null,
          notes: formData.notes || null,
        })
        .eq('id', receiptId)

      if (error) throw error

      setMessage('Fiş başarıyla güncellendi! 🎉')
      setTimeout(() => {
        router.push('/receipts')
      }, 1500)

    } catch (error) {
      setMessage('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">✏️ Fiş Düzenle</h1>
          <button
            onClick={() => router.push('/receipts')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            ← İptal
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Fiş Fotoğrafı</h2>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Receipt"
                className="w-full rounded-lg border shadow"
              />
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">
              Bilgileri Düzenleyin
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firma Adı
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Toplam Tutar (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KDV Oranı (%)
                </label>
                <select
                  value={formData.vat_rate}
                  onChange={(e) => setFormData({...formData, vat_rate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Seçiniz</option>
                  <option value="1">%1</option>
                  <option value="10">%10</option>
                  <option value="20">%20</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KDV Tutarı (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vat_amount}
                  onChange={(e) => setFormData({...formData, vat_amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Yemek, Ulaşım, vb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows="3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.includes('Hata')
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}