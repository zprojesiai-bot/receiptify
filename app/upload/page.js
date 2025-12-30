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
  const router = useRouter()

  useEffect(() => {
    loadClients()
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)

    const previewUrls = files.map(file => URL.createObjectURL(file))
    setPreviews(previewUrls)
  }

  // GERÇEK CONFIDENCE HESAPLAMA
  const calculateConfidence = (text, pattern, extractedValue) => {
    if (!extractedValue) return 0
    
    // Regex ile eşleşme varsa yüksek confidence
    const match = text.match(pattern)
    if (match) {
      // Eşleşme kalitesine göre 70-95 arası
      const matchQuality = match[0].length / extractedValue.length
      return Math.min(95, Math.max(70, Math.round(matchQuality * 100)))
    }
    
    return 60 // Zayıf eşleşme
  }

  const extractReceiptData = (text, tesseractData) => {
    // Tesseract'tan gelen kelime bazlı confidence'lar
    const wordConfidences = {}
    if (tesseractData && tesseractData.words) {
      tesseractData.words.forEach(word => {
        wordConfidences[word.text.toLowerCase()] = word.confidence
      })
    }

    const patterns = {
      date: /(\d{2}[\.\/\-]\d{2}[\.\/\-]\d{4})|(\d{4}[\.\/\-]\d{2}[\.\/\-]\d{2})/,
      amount: /(?:TOPLAM|TOTAL|TUTAR)[\s:]*\*?\s*([\d,\.]+)/i,
      vatAmount: /(?:KDV|VAT|TOPKDV)[\s:]*\*?\s*([\d,\.]+)/i,
      companyName: /^([A-ZÇĞİÖŞÜ\s&\.]{3,})/m
    }

    const result = {
      date: '',
      amount: '',
      vatAmount: '',
      companyName: '',
      confidence: {
        date: 0,
        amount: 0,
        vatAmount: 0,
        companyName: 0
      }
    }

    // Tarih extraction + confidence
    const dateMatch = text.match(patterns.date)
    if (dateMatch) {
      let dateStr = dateMatch[0].replace(/\./g, '-').replace(/\//g, '-')
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          result.date = dateStr
        } else {
          result.date = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        
        // Confidence hesapla
        const avgWordConf = parts.reduce((sum, part) => {
          return sum + (wordConfidences[part] || 70)
        }, 0) / parts.length
        
        result.confidence.date = Math.round(avgWordConf)
      }
    }

    // Tutar extraction + confidence
    const amountMatch = text.match(patterns.amount)
    if (amountMatch) {
      result.amount = amountMatch[1].replace(',', '.')
      
      // "TOPLAM" kelimesinin confidence'ı + sayının confidence'ı
      const toplamConf = wordConfidences['toplam'] || wordConfidences['total'] || 75
      const numberConf = wordConfidences[amountMatch[1].replace(/[,\.]/g, '')] || 80
      result.confidence.amount = Math.round((toplamConf + numberConf) / 2)
    }

    // KDV extraction + confidence
    const vatMatch = text.match(patterns.vatAmount)
    if (vatMatch) {
      result.vatAmount = vatMatch[1].replace(',', '.')
      
      const kdvConf = wordConfidences['kdv'] || wordConfidences['topkdv'] || 70
      const numberConf = wordConfidences[vatMatch[1].replace(/[,\.]/g, '')] || 75
      result.confidence.vatAmount = Math.round((kdvConf + numberConf) / 2)
    }

    // Firma adı extraction + confidence
    const companyMatch = text.match(patterns.companyName)
    if (companyMatch) {
      result.companyName = companyMatch[1].trim()
      
      // İlk satır genelde daha net okunur
      const firstLineWords = result.companyName.split(' ')
      const avgConf = firstLineWords.reduce((sum, word) => {
        return sum + (wordConfidences[word.toLowerCase()] || 70)
      }, 0) / firstLineWords.length
      
      result.confidence.companyName = Math.round(avgConf)
    }

    return result
  }

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
        // 1. Supabase'e yükle
        const fileName = `${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName)

        // 2. Tesseract OCR (kelime bazlı confidence ile)
        console.log(`Processing file ${i + 1}/${selectedFiles.length}...`)
        const { data: tesseractResult } = await Tesseract.recognize(file, 'tur', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          }
        })

        const text = tesseractResult.text
        console.log('OCR Text:', text)
        console.log('Tesseract Confidence:', tesseractResult.confidence) // Genel confidence
        console.log('Word Confidences:', tesseractResult.words.map(w => ({
          text: w.text,
          confidence: w.confidence
        })))

        // 3. Gerçek confidence ile extract et
        const extracted = extractReceiptData(text, tesseractResult)

        // 4. Claude API ile iyileştir
        let claudeData = null
        try {
          const response = await fetch('/api/parse-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, imageUrl: publicUrl })
          })

          if (response.ok) {
            claudeData = await response.json()
            console.log('Claude Response:', claudeData)
          }
        } catch (apiError) {
          console.error('Claude API error:', apiError)
        }

        // Claude'dan gelen confidence'ları kullan (varsa), yoksa Tesseract'ınkini kullan
        const finalData = {
          imageUrl: publicUrl,
          date: claudeData?.date || extracted.date,
          amount: claudeData?.amount || extracted.amount,
          companyName: claudeData?.companyName || extracted.companyName,
          vatAmount: claudeData?.vatAmount || extracted.vatAmount,
          vatRate: claudeData?.vatRate || (extracted.vatAmount && extracted.amount ? 
            ((parseFloat(extracted.vatAmount) / (parseFloat(extracted.amount) - parseFloat(extracted.vatAmount))) * 100).toFixed(1) : ''),
          category: claudeData?.category || 'Diğer',
          rawText: text,
          confidence: {
            date: claudeData?.confidence?.date || extracted.confidence.date,
            amount: claudeData?.confidence?.amount || extracted.confidence.amount,
            vatAmount: claudeData?.confidence?.vatAmount || extracted.confidence.vatAmount,
            companyName: claudeData?.confidence?.companyName || extracted.confidence.companyName
          }
        }

        console.log('Final Confidence Scores:', finalData.confidence)
        results.push(finalData)

      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error)
        results.push({
          imageUrl: previews[i],
          error: error.message,
          date: '',
          amount: '',
          companyName: '',
          category: 'Diğer',
          rawText: '',
          confidence: { date: 0, amount: 0, vatAmount: 0, companyName: 0 }
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
              <p className="text-sm text-gray-600 text-center mt-2">
                OCR ve AI analizi yapılıyor... Console'da detayları görebilirsiniz.
              </p>
            </div>
          )}
        </div>

        {/* Bilgi Kartı */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-6">
          <h4 className="font-bold text-blue-900 mb-3">🎯 Gerçek Confidence Sistemi</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>Tesseract OCR:</strong> Her kelime için gerçek güven skoru</li>
            <li>✅ <strong>Akıllı Hesaplama:</strong> Kelime bazlı ortalamaları kullanır</li>
            <li>✅ <strong>Console Log:</strong> F12 açıp tüm detayları görebilirsiniz</li>
            <li>✅ <strong>Claude AI:</strong> Confidence skorlarını iyileştirir</li>
          </ul>
        </div>
      </main>
    </div>
  )
}