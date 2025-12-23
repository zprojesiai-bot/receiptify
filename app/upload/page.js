'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Tesseract from 'tesseract.js'

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [receiptType, setReceiptType] = useState('expense')
  const [categoryMappings, setCategoryMappings] = useState({})
  const router = useRouter()

  useEffect(() => {
    loadClients()
    loadCategoryMappings()
  }, [])

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)

      setClients(data || [])
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const loadCategoryMappings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('category_mappings')
        .select('*')
        .eq('user_id', user.id)

      const mappings = {}
      data?.forEach(m => {
        mappings[m.company_name.toLowerCase()] = m.category
      })
      setCategoryMappings(mappings)
    } catch (error) {
      console.error('Error loading mappings:', error)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)

    const previewUrls = files.map(file => URL.createObjectURL(file))
    setPreviews(previewUrls)
  }

  const checkDuplicates = async (date, amount) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .gte('amount', amount - 5)
        .lte('amount', amount + 5)

      return data || []
    } catch (error) {
      console.error('Error checking duplicates:', error)
      return []
    }
  }

  const predictCategory = (companyName) => {
    const name = companyName?.toLowerCase() || ''
    
    // Önce ezberlenen mappinglere bak
    for (const [key, category] of Object.entries(categoryMappings)) {
      if (name.includes(key)) return category
    }

    // Akıllı tahmin
    if (name.includes('migros') || name.includes('a101') || name.includes('bim') || 
        name.includes('carrefour') || name.includes('market')) return 'Yemek'
    if (name.includes('shell') || name.includes('opet') || name.includes('petrol')) return 'Ulaşım'
    if (name.includes('eczane') || name.includes('pharmacy') || name.includes('hastane')) return 'Sağlık'
    if (name.includes('kitap') || name.includes('kırtasiye') || name.includes('ofis')) return 'Kırtasiye'
    
    return 'Diğer'
  }

  const saveCategoryMapping = async (companyName, category) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('category_mappings')
        .upsert({
          user_id: user.id,
          company_name: companyName.toLowerCase(),
          category: category
        }, {
          onConflict: 'user_id,company_name'
        })

      setCategoryMappings(prev => ({
        ...prev,
        [companyName.toLowerCase()]: category
      }))
    } catch (error) {
      console.error('Error saving mapping:', error)
    }
  }

  // Dosyayı Base64 string'e çeviren yardımcı fonksiyon
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const processReceipts = async () => {
    if (selectedFiles.length === 0) {
      alert('Lütfen en az bir fotoğraf seçin!')
      return
    }

    setProcessing(true)
    setProgress({ current: 0, total: selectedFiles.length })

    const results = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      setProgress({ current: i + 1, total: selectedFiles.length })

      try {
        // 1. Supabase'e yükleme işlemi (Burası aynen kalıyor)
        const fileName = `${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName)

        // ==========================================
        // DEĞİŞEN KISIM BAŞLIYOR
        // ==========================================

        // 2. OCR (Tesseract) kısmını sildik.
        // Onun yerine dosyayı Base64'e çeviriyoruz:
        const base64Image = await fileToBase64(file);

        // 3. Claude API'ye resim verisi gönderiyoruz
        // Not: route.js dosyan artık 'imageBase64' bekliyor.
        const response = await fetch('/api/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageBase64: base64Image 
          })
        })

        const apiResponse = await response.json()

        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'AI okuma hatası');
        }

        // Claude'dan gelen veriyi alıyoruz
        const rawData = apiResponse.data;

        // 4. Değişken İsimlerini Eşleştiriyoruz
        // (API 'company_name' gönderiyor, ama senin kodun 'companyName' kullanıyor)
        const parsed = {
          date: rawData.date,
          amount: rawData.amount,
          companyName: rawData.company_name, // Düzeltme burada
          vatRate: rawData.vat_rate,         // Düzeltme burada
          vatAmount: rawData.vat_amount,     // Düzeltme burada
          category: rawData.category
        };

        // 4. Otomatik kategori tahmini
        const predictedCategory = predictCategory(parsed.companyName)

        // 5. Duplicate check
        const duplicates = await checkDuplicates(parsed.date, parsed.amount)

        results.push({
          imageUrl: publicUrl,
          date: parsed.date,
          amount: parsed.amount,
          companyName: parsed.companyName,
          vatAmount: parsed.vatAmount,
          vatRate: parsed.vatRate,
          category: predictedCategory,
          rawText: "",
          confidence: parsed.confidence,
          hasDuplicates: duplicates.length > 0,
          duplicateCount: duplicates.length
        })

        // Kategori mapping kaydet
        if (parsed.companyName && predictedCategory) {
          saveCategoryMapping(parsed.companyName, predictedCategory)
        }

      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error)
        results.push({
          imageUrl: previews[i],
          error: error.message,
          date: '',
          amount: '',
          companyName: '',
          category: 'Diğer'
        })
      }
    }

    localStorage.setItem('bulk_results', JSON.stringify(results.map(r => ({
      ...r,
      client_id: selectedClient,
      type: receiptType
    }))))

    router.push('/bulk-review')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📤 Fiş Yükle
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Fotoğraf Seçin</h2>

          {/* Müşteri Seçimi */}
          {clients.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Müşteri (Opsiyonel)
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Müşteri seçiniz</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Gider/Gelir Seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💰 Tip
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setReceiptType('expense')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                  receiptType === 'expense'
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                }`}
              >
                📉 Gider
              </button>
              <button
                onClick={() => setReceiptType('income')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                  receiptType === 'income'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                }`}
              >
                📈 Gelir
              </button>
            </div>
          </div>

          {/* File Input */}
          <div className="mb-6">
            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition">
                <div className="text-6xl mb-4">📸</div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Fişleri seçmek için tıklayın
                </p>
                <p className="text-sm text-gray-500">
                  Birden fazla fotoğraf seçebilirsiniz
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Previews */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-800 mb-3">
                Seçilen Fişler ({selectedFiles.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={processReceipts}
            disabled={processing || selectedFiles.length === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {processing
              ? `⏳ İşleniyor... (${progress.current}/${progress.total})`
              : `🚀 ${selectedFiles.length} Fişi İşle`
            }
          </button>

          {processing && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bilgi Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <h4 className="font-bold text-blue-900 mb-2">🤖 Otomatik Kategorizasyon</h4>
            <p className="text-sm text-blue-800">
              Firma adına göre otomatik kategori belirlenir ve öğrenilir
            </p>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <h4 className="font-bold text-yellow-900 mb-2">🔍 Duplicate Detection</h4>
            <p className="text-sm text-yellow-800">
              Aynı fiş daha önce yüklenmişse uyarı verilir
            </p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <h4 className="font-bold text-green-900 mb-2">📊 Gider/Gelir Takibi</h4>
            <p className="text-sm text-green-800">
              Her fişi gider veya gelir olarak işaretleyin
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}