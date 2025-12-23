'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function OCRContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
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
  const [rawText, setRawText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [autoCalculateVAT, setAutoCalculateVAT] = useState(false)

  useEffect(() => {
    const url = searchParams.get('imageUrl')
    const date = searchParams.get('date')
    const amount = searchParams.get('amount')
    const vatAmount = searchParams.get('vatAmount')
    const vatRate = searchParams.get('vatRate')
    const companyName = searchParams.get('companyName')
    const raw = searchParams.get('rawText')
    
    setImageUrl(url || '')
    setRawText(raw || '')
    
    if (vatRate === 'HESAPLA') {
      setAutoCalculateVAT(true)
      if (amount && vatAmount) {
        const calculatedRate = calculateVATRate(amount, vatAmount)
        setFormData({
          date: date || '',
          amount: amount || '',
          company_name: companyName || '',
          vat_rate: calculatedRate,
          vat_amount: vatAmount || '',
          category: '',
          notes: '',
        })
      } else {
        setFormData({
          date: date || '',
          amount: amount || '',
          company_name: companyName || '',
          vat_rate: '',
          vat_amount: vatAmount || '',
          category: '',
          notes: '',
        })
      }
    } else {
      setFormData({
        date: date || '',
        amount: amount || '',
        company_name: companyName || '',
        vat_rate: vatRate || '',
        vat_amount: vatAmount || '',
        category: '',
        notes: '',
      })
    }
  }, [searchParams])

  const calculateVATRate = (totalAmount, vatAmount) => {
    const total = parseFloat(totalAmount)
    const vat = parseFloat(vatAmount)
    
    if (!total || !vat || total <= vat) return ''
    
    const rate = (vat / (total - vat)) * 100
    
    if (rate > 0 && rate < 25) {
      return rate.toFixed(1)
    }
    return ''
  }

  const handleVATCalculate = () => {
    if (formData.amount && formData.vat_amount) {
      const rate = calculateVATRate(formData.amount, formData.vat_amount)
      setFormData({...formData, vat_rate: rate})
      setAutoCalculateVAT(false)
    } else {
      alert('Lütfen önce Toplam Tutar ve KDV Tutarını girin!')
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('receipts')
        .insert([{
          user_id: user.id,
          image_url: imageUrl,
          date: formData.date || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          company_name: formData.company_name || null,
          vat_rate: formData.vat_rate ? parseFloat(formData.vat_rate) : null,
          vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
          category: formData.category || null,
          notes: formData.notes || null,
          raw_ocr_text: rawText || null,
        }])

      if (error) throw error

      setMessage('Fiş başarıyla kaydedildi! 🎉')
      setTimeout(() => {
        router.push('/receipts')
      }, 2000)

    } catch (error) {
      console.error('Save error:', error)
      setMessage('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📋 Fiş Bilgileri
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            ← İptal
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {rawText && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              🔍 OCR Sonucu
            </h3>
            <pre className="text-xs md:text-sm text-blue-800 whitespace-pre-wrap max-h-32 overflow-y-auto bg-white p-3 rounded-lg">
              {rawText}
            </pre>
          </div>
        )}

        {autoCalculateVAT && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              🧮 KDV Otomatik Hesaplandı!
            </h3>
            <p className="text-sm text-yellow-800">
              Farklı ürün KDV oranları tespit edildi. Ortalama oran hesaplandı.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              📸 Fiş Fotoğrafı
            </h2>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Receipt"
                className="w-full rounded-lg border-2 border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Görüntü yok</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              ✏️ Bilgileri Kontrol Edin
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Tarih
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏢 Firma Adı
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Migros, Shell, vb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Toplam Tutar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="123.45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 KDV Tutarı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vat_amount}
                  onChange={(e) => setFormData({...formData, vat_amount: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="20.57"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📈 KDV Oranı (%)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={formData.vat_rate === '' ? '' : (isNaN(parseFloat(formData.vat_rate)) ? '' : (parseFloat(formData.vat_rate) > 20 ? '' : formData.vat_rate))}
                    onChange={(e) => {
                      if (e.target.value === 'HESAPLA') {
                        handleVATCalculate()
                      } else {
                        setFormData({...formData, vat_rate: e.target.value})
                      }
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Seçiniz</option>
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                    <option value="HESAPLA">🧮 KDV Hesapla</option>
                  </select>
                  {formData.vat_rate && !['1', '10', '20', ''].includes(formData.vat_rate) && (
                    <div className="px-4 py-3 bg-green-50 border border-green-300 rounded-lg text-green-700 font-semibold text-center">
                      %{parseFloat(formData.vat_rate).toFixed(1)}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Farklı ürün KDV'leri varsa "KDV Hesapla" seçin
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏷️ Kategori
                </label>
                <div className="space-y-2">
                  <select
                    value={formData.category === 'Diğer' ? 'Diğer' : (formData.category || '')}
                    onChange={(e) => {
                      if (e.target.value === 'Diğer') {
                        setFormData({...formData, category: ''})
                      } else {
                        setFormData({...formData, category: e.target.value})
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Seçiniz veya yazın</option>
                    <option value="Yemek">🍽️ Yemek</option>
                    <option value="Ulaşım">🚗 Ulaşım</option>
                    <option value="Kırtasiye">📎 Kırtasiye</option>
                    <option value="Sağlık">⚕️ Sağlık</option>
                    <option value="Eğitim">📚 Eğitim</option>
                    <option value="Diğer">📦 Diğer (elle gir)</option>
                  </select>
                  
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="veya özel kategori yazın..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
                  rows="3"
                  placeholder="Ek açıklama..."
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold text-lg hover:from-green-700 hover:to-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? '⏳ Kaydediliyor...' : '✅ Fişi Kaydet'}
              </button>

              {message && (
                <div className={`p-4 rounded-lg text-sm font-medium ${
                  message.includes('Hata')
                    ? 'bg-red-50 text-red-700 border-2 border-red-200'
                    : 'bg-green-50 text-green-700 border-2 border-green-200'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}