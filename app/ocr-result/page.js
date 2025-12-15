'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function OCRResultPage() {
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
    
    // Eğer vatRate "HESAPLA" ise otomatik hesaplamayı aç
    if (vatRate === 'HESAPLA') {
      setAutoCalculateVAT(true)
      // Otomatik hesapla
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
    
    // KDV Oranı = (KDV Tutarı / (Toplam - KDV)) * 100
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

  const handleSubmit = async (e) => {
    e.preventDefault()
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">📋 Fiş Bilgileri</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            ← İptal
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {rawText && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">🔍 OCR Sonucu</h3>
            <pre className="text-sm text-blue-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
              {rawText}
            </pre>
          </div>
        )}

        {autoCalculateVAT && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">🧮 KDV Otomatik Hesaplandı!</h3>
            <p className="text-sm text-yellow-800">
              Farklı ürün KDV oranları tespit edildi. Ortalama oran hesaplandı.
            </p>
          </div>
        )}

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
              Bilgileri Kontrol Edin
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
                  placeholder="Migros, Shell, vb."
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
                  placeholder="123.45"
                />
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
                  placeholder="20.57"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KDV Oranı (%)
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.vat_rate === '' ? '' : (isNaN(parseFloat(formData.vat_rate)) ? '' : (parseFloat(formData.vat_rate) > 20 ? '' : formData.vat_rate))}
                    onChange={(e) => {
                      if (e.target.value === 'HESAPLA') {
                        handleVATCalculate()
                      } else {
                        setFormData({...formData, vat_rate: e.target.value})
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Seçiniz</option>
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                    <option value="HESAPLA">🧮 KDV Hesapla</option>
                  </select>
                  {formData.vat_rate && !['1', '10', '20', ''].includes(formData.vat_rate) && (
                    <div className="px-3 py-2 bg-green-50 border border-green-300 rounded-lg text-green-700 font-semibold">
                      %{parseFloat(formData.vat_rate).toFixed(1)}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Farklı ürün KDV'leri varsa "KDV Hesapla" seçin
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Seçiniz veya yazın</option>
                    <option value="Yemek">Yemek</option>
                    <option value="Ulaşım">Ulaşım</option>
                    <option value="Kırtasiye">Kırtasiye</option>
                    <option value="Sağlık">Sağlık</option>
                    <option value="Eğitim">Eğitim</option>
                    <option value="Diğer">Diğer (elle gir)</option>
                  </select>
                  
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="veya özel kategori yazın..."
                  />
                </div>
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
                  placeholder="Ek açıklama..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Fişi Kaydet'}
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