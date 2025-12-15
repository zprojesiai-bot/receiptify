'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Tesseract from 'tesseract.js'
import dynamic from 'next/dynamic'

// QR Scanner'ı dinamik yükle (client-side only)
const QRScanner = dynamic(() => import('../../components/QRScanner'), {
  ssr: false,
  loading: () => <div className="text-center p-8">Kamera yükleniyor...</div>
})

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentFile, setCurrentFile] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [useAI, setUseAI] = useState(true)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const router = useRouter()

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
    setSelectedFiles(files)
    setTotalFiles(files.length)
    
    const newPreviews = []
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result)
        if (newPreviews.length === files.length) {
          setPreviews(newPreviews)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const checkForDuplicates = async (date, amount) => {
    if (!date || !amount) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('receipts')
        .select('id, company_name, amount, date')
        .eq('user_id', user.id)
        .eq('date', date)

      if (error) throw error

      // Aynı gün + ±5 TL aralığında fiş var mı?
      const similar = data.filter(r => {
        const diff = Math.abs(r.amount - parseFloat(amount))
        return diff < 5
      })

      return similar.length > 0 ? similar[0] : null
    } catch (error) {
      console.error('Duplicate check error:', error)
      return null
    }
  }

  const extractDateAndAmount = (text) => {
    console.log('OCR Raw Text:', text)
    
    const datePatterns = [
      /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/,
      /(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/,
    ]
    
    let date = ''
    let dateConfidence = 0
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        const day = match[1].padStart(2, '0')
        const month = match[2].padStart(2, '0')
        const year = match[3]
        date = `${year}-${month}-${day}`
        dateConfidence = 90
        break
      }
    }

    const amountPatterns = [
      /TOPLAM[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /TOP[\s]*TUTAR[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /TOTAL[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /GENEL\s*TOPLAM[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /[ÖO]DENECEK[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    ]
    
    let amount = ''
    let amountConfidence = 0
    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        amount = match[1].replace(/\./g, '').replace(',', '.')
        if (parseFloat(amount) > 1) {
          amountConfidence = 85
          break
        }
      }
    }

    const vatAmountPatterns = [
      /TOPKDV[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /TOP[\s]*KDV[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /KDV[\s]*TOPLAM[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /KDV[\s:]*\*?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    ]
    
    let vatAmount = ''
    let vatConfidence = 0
    for (const pattern of vatAmountPatterns) {
      const match = text.match(pattern)
      if (match) {
        vatAmount = match[1].replace(/\./g, '').replace(',', '.')
        vatConfidence = 80
        break
      }
    }

    const vatRatePattern = /%\s*(\d{1,2})/
    const vatRateMatch = text.match(vatRatePattern)
    let vatRate = ''
    let vatRateConfidence = 0
    
    if (vatRateMatch) {
      vatRate = vatRateMatch[1]
      vatRateConfidence = 90
    } else if (vatAmount && amount) {
      const amountNum = parseFloat(amount)
      const vatNum = parseFloat(vatAmount)
      const calculatedRate = (vatNum / (amountNum - vatNum)) * 100
      if (calculatedRate > 0 && calculatedRate < 25) {
        vatRate = calculatedRate.toFixed(1)
        vatRateConfidence = 70
      }
    }

    const lines = text.split('\n').filter(line => line.trim().length > 0)
    let companyName = ''
    let companyConfidence = 0
    if (lines.length > 0) {
      const firstLines = lines.slice(0, 3)
      companyName = firstLines.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      , '').trim()
      companyConfidence = companyName.length > 3 ? 75 : 50
    }
    
    return { 
      date, amount, vatAmount, vatRate, companyName,
      confidence: {
        date: dateConfidence,
        amount: amountConfidence,
        vatAmount: vatConfidence,
        vatRate: vatRateConfidence,
        companyName: companyConfidence
      }
    }
  }

  const processWithClaude = async (ocrText) => {
    try {
      const response = await fetch('/api/receipts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      return {
        data: result.data,
        confidence: {
          date: 95,
          amount: 95,
          vatAmount: 90,
          vatRate: 90,
          companyName: 95
        }
      }
    } catch (error) {
      console.error('Claude API Error:', error)
      throw error
    }
  }

  const handleUploadAndOCR = async () => {
    if (selectedFiles.length === 0 && !qrData) {
      setMessage('Lütfen önce dosya seçin veya QR kod tarayın!')
      return
    }

    // QR veri varsa direkt kaydet
    if (qrData) {
      const duplicate = await checkForDuplicates(qrData.date, qrData.amount)
      if (duplicate) {
        setDuplicateWarning(duplicate)
        return
      }
      
      localStorage.setItem('bulk_results', JSON.stringify([{
        imageUrl: '',
        ...qrData,
        confidence: { date: 100, amount: 100, vatAmount: 100, vatRate: 100, companyName: 100 }
      }]))
      router.push('/bulk-review')
      return
    }

    setUploading(true)
    setProcessing(true)
    setMessage(`${selectedFiles.length} fiş işleniyor...`)
    const processedResults = []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setCurrentFile(i + 1)
        setMessage(`${i + 1}/${selectedFiles.length} fiş işleniyor...`)

        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName)

        const result = await Tesseract.recognize(
          file,
          'tur',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setOcrProgress(Math.round(m.progress * 100))
              }
            }
          }
        )

        const extractedText = result.data.text
        let finalData, confidence

        if (useAI) {
          try {
            const claudeResult = await processWithClaude(extractedText)
            finalData = {
              date: claudeResult.data.date || '',
              amount: claudeResult.data.amount?.toString() || '',
              vatAmount: claudeResult.data.vat_amount?.toString() || '',
              vatRate: claudeResult.data.vat_rate?.toString() || '',
              companyName: claudeResult.data.company_name || '',
              category: claudeResult.data.category || '',
              notes: claudeResult.data.notes || '',
            }
            confidence = claudeResult.confidence
          } catch (error) {
            const extracted = extractDateAndAmount(extractedText)
            finalData = {
              date: extracted.date,
              amount: extracted.amount,
              vatAmount: extracted.vatAmount,
              vatRate: extracted.vatRate,
              companyName: extracted.companyName,
              category: '',
              notes: 'Claude hatası, basit OCR kullanıldı'
            }
            confidence = extracted.confidence
          }
        } else {
          const extracted = extractDateAndAmount(extractedText)
          finalData = {
            date: extracted.date,
            amount: extracted.amount,
            vatAmount: extracted.vatAmount,
            vatRate: extracted.vatRate,
            companyName: extracted.companyName,
            category: '',
            notes: ''
          }
          confidence = extracted.confidence
        }

        // Duplicate check
        const duplicate = await checkForDuplicates(finalData.date, finalData.amount)
        if (duplicate) {
          finalData.notes = (finalData.notes || '') + ` ⚠️ Benzer fiş var: ${duplicate.company_name} - ${duplicate.amount} TL`
        }

        processedResults.push({
          imageUrl: publicUrl,
          ...finalData,
          rawText: extractedText,
          confidence
        })
      }
      
      setMessage(`✅ ${selectedFiles.length} fiş başarıyla işlendi!`)
      setProcessing(false)
      
      localStorage.setItem('bulk_results', JSON.stringify(processedResults))
      router.push('/bulk-review')

    } catch (error) {
      setMessage('Hata: ' + error.message)
      setProcessing(false)
    } finally {
      setUploading(false)
    }
  }

  const handleQRScan = (data) => {
    setShowQRScanner(false)
    setQrData(data)
    setMessage('✅ QR kod başarıyla okundu! Bilgileri kontrol edip kaydedin.')
  }

  const handleIgnoreDuplicate = () => {
    setDuplicateWarning(null)
    // Kaydetmeye devam et
    localStorage.setItem('bulk_results', JSON.stringify([qrData || selectedFiles[0]]))
    router.push('/bulk-review')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {showQRScanner && (
        <QRScanner 
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {duplicateWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-yellow-800 mb-4">⚠️ Duplicate Tespit Edildi!</h3>
            <p className="text-gray-700 mb-4">
              Aynı tarih ve benzer tutarda bir fiş zaten var:
            </p>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-6">
              <p className="font-semibold">{duplicateWarning.company_name}</p>
              <p className="text-sm text-gray-600">{duplicateWarning.date}</p>
              <p className="text-lg font-bold text-yellow-800">{duplicateWarning.amount} ₺</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDuplicateWarning(null)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleIgnoreDuplicate}
                className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold"
              >
                Yine de Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📸 Fiş Yükle
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            ← Geri
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          
          {/* AI Toggle */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🤖</div>
                <div>
                  <h3 className="font-bold text-gray-800">Claude AI Akıllı İşleme</h3>
                  <p className="text-sm text-gray-600">%95+ doğruluk, duplicate detection</p>
                </div>
              </div>
              <button
                onClick={() => setUseAI(!useAI)}
                className={`px-6 py-3 rounded-full font-bold transition transform hover:scale-105 ${
                  useAI 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {useAI ? '✓ AÇIK' : 'KAPALI'}
              </button>
            </div>
          </div>

          {/* QR Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowQRScanner(true)}
              className="w-full p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition transform hover:scale-105 shadow-lg"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">📷</span>
                <div className="text-left">
                  <div className="text-xl font-bold">QR Kod Tara</div>
                  <div className="text-sm text-green-100">e-Fatura QR kodunu okut, anında kaydet!</div>
                </div>
              </div>
            </button>
          </div>

          {qrData && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-400 rounded-xl">
              <h3 className="font-bold text-green-900 mb-2">✅ QR Kod Okundu!</h3>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>Tarih:</strong> {qrData.date || 'Bulunamadı'}</p>
                <p><strong>Tutar:</strong> {qrData.amount || 'Bulunamadı'} ₺</p>
                <p><strong>Firma:</strong> {qrData.companyName || 'Bulunamadı'}</p>
              </div>
            </div>
          )}

          <div className="text-center text-gray-500 my-4 font-medium">
            - VEYA -
          </div>

          {/* Upload Area */}
          <div className="border-3 border-dashed border-blue-300 rounded-xl p-12 text-center mb-6 bg-gradient-to-br from-blue-50 to-purple-50 hover:border-blue-500 transition">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              multiple
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-7xl mb-4">📷</div>
              <p className="text-xl font-semibold text-gray-800 mb-2">
                Fotoğrafları Sürükle veya Tıkla
              </p>
              <p className="text-sm text-gray-500">
                ⭐ Toplu yükleme: Birden fazla fiş seçebilirsiniz!
              </p>
            </label>
          </div>

          {previews.length > 0 && (
            <div className="mb-6">
              <p className="font-semibold text-gray-700 mb-3">
                Seçilen Fişler ({previews.length} adet)
              </p>
              <div className="grid grid-cols-3 gap-4">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition"
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {processing && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between text-sm text-blue-800 mb-2">
                <span>📊 İşleniyor: {currentFile}/{totalFiles}</span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {(selectedFiles.length > 0 || qrData) && (
            <button
              onClick={handleUploadAndOCR}
              disabled={uploading || processing}
              className={`w-full py-4 rounded-xl font-bold text-lg transition transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg ${
                useAI
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
              }`}
            >
              {uploading ? '⏳ Yükleniyor...' : processing ? '🔄 İşleniyor...' : 
                qrData ? '✅ QR Verisini Kaydet' :
                useAI ? `🤖 ${selectedFiles.length} Fişi AI ile İşle` : `🔍 ${selectedFiles.length} Fişi OCR ile İşle`}
            </button>
          )}

          {message && (
            <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${
              message.includes('Hata')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : message.includes('✅')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-sm text-yellow-800">
              <strong>💡 Yeni Özellikler:</strong> QR kod tarama ile anında kayıt! 
              Duplicate detection ile aynı fişi 2 kez yüklemekten kaçının.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}