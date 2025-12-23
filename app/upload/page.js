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

  const extractReceiptData = (text) => {
    // Regex patterns for Turkish receipts
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

    // Extract date
    const dateMatch = text.match(patterns.date)
    if (dateMatch) {
      let dateStr = dateMatch[0].replace(/\./g, '-').replace(/\//g, '-')
      // Convert to YYYY-MM-DD format
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          result.date = dateStr // Already YYYY-MM-DD
        } else {
          result.date = `${parts[2]}-${parts[1]}-${parts[0]}` // DD-MM-YYYY to YYYY-MM-DD
        }
        result.confidence.date = 85
      }
    }

    // Extract amount
    const amountMatch = text.match(patterns.amount)
    if (amountMatch) {
      result.amount = amountMatch[1].replace(',', '.')
      result.confidence.amount = 85
    }

    // Extract VAT amount
    const vatMatch = text.match(patterns.vatAmount)
    if (vatMatch) {
      result.vatAmount = vatMatch[1].replace(',', '.')
      result.confidence.vatAmount = 80
    }

    // Extract company name
    const companyMatch = text.match(patterns.companyName)
    if (companyMatch) {
      result.companyName = companyMatch[1].trim()
      result.confidence.companyName = 75
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

        // 2. Tesseract OCR
        console.log(`Processing file ${i + 1}/${selectedFiles.length}...`)
        const { data: { text } } = await Tesseract.recognize(file, 'tur', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          }
        })

        console.log('OCR Text:', text)

        // 3. Extract data from OCR text
        const extracted = extractReceiptData(text)

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
          // Fallback to regex extraction
        }

        // Merge Claude data with regex extraction (Claude takes priority)
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
          confidence: claudeData?.confidence || extracted.confidence
        }

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
          rawText: ''
        })
      }
    }

    // Save to localStorage with client info
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
                OCR ve AI analizi yapılıyor...
              </p>
            </div>
          )}
        </div>

        {/* Bilgi Kartı */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-6">
          <h4 className="font-bold text-blue-900 mb-3">🤖 Nasıl Çalışır?</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>Tesseract OCR:</strong> Fişten yazıları çıkarır</li>
            <li>✅ <strong>Claude AI:</strong> Bilgileri düzenler ve kategorize eder</li>
            <li>✅ <strong>Otomatik:</strong> Tarih, tutar, KDV otomatik bulunur</li>
            <li>✅ <strong>Kontrol:</strong> Sonraki adımda tüm bilgileri kontrol edebilirsiniz</li>
          </ul>
        </div>
      </main>
    </div>
  )
}