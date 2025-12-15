'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Tesseract from 'tesseract.js'

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [useAI, setUseAI] = useState(true) // Varsayılan olarak AI açık
  const router = useRouter()

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else {
      setMessage('Lütfen bir resim dosyası seçin!')
    }
  }

  const extractDateAndAmount = (text) => {
    console.log('OCR Raw Text:', text)
    
    // Tarih bulma
    const datePatterns = [
      /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/,
      /(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/,
    ]
    
    let date = ''
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        const day = match[1].padStart(2, '0')
        const month = match[2].padStart(2, '0')
        const year = match[3]
        date = `${year}-${month}-${day}`
        break
      }
    }

    // TOPLAM kelimesinden SONRA gelen rakamı bul
    const amountPatterns = [
      /TOPLAM[:\s]+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /TOPLAM.*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /TOTAL[:\s]+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /GENEL\s*TOPLAM[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /[ÖO]DENECEK[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*TL/i,
    ]
    
    let amount = ''
    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        amount = match[1].replace(/\./g, '').replace(',', '.')
        if (parseFloat(amount) > 5) {
          break
        }
      }
    }

    // TOPKDV kelimesinden SONRA gelen rakamı bul
    const vatAmountPatterns = [
      /TOPKDV[:\s]+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /TOPKDV.*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /TOP[\.\s]*KDV[:\s]+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /KDVTOPLAM[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /KDV[:\s]+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
      /VAT[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    ]
    
    let vatAmount = ''
    for (const pattern of vatAmountPatterns) {
      const match = text.match(pattern)
      if (match) {
        vatAmount = match[1].replace(/\./g, '').replace(',', '.')
        break
      }
    }

    // KDV Oranı
    const vatRatePattern = /%\s*(\d{1,2})/
    const vatRateMatch = text.match(vatRatePattern)
    let vatRate = ''
    
    if (vatRateMatch) {
      vatRate = vatRateMatch[1]
    } else if (vatAmount && amount) {
      const amountNum = parseFloat(amount)
      const vatNum = parseFloat(vatAmount)
      const calculatedRate = (vatNum / (amountNum - vatNum)) * 100
      if (calculatedRate > 0 && calculatedRate < 25) {
        vatRate = calculatedRate.toFixed(1)
      } else {
        vatRate = 'HESAPLA'
      }
    } else {
      vatRate = 'HESAPLA'
    }

    // Firma adı
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    let companyName = ''
    if (lines.length > 0) {
      const firstLines = lines.slice(0, 3)
      companyName = firstLines.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      , '').trim()
    }

    console.log('Extracted:', { date, amount, vatAmount, vatRate, companyName })
    
    return { date, amount, vatAmount, vatRate, companyName }
  }

  const processWithClaude = async (ocrText) => {
    try {
      setMessage('🤖 Claude AI ile işleniyor...')
      
      const response = await fetch('/api/receipts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ocrText }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Claude API hatası')
      }

      return result.data
    } catch (error) {
      console.error('Claude API Error:', error)
      throw error
    }
  }

  const handleUploadAndOCR = async () => {
    if (!selectedFile) {
      setMessage('Lütfen önce bir dosya seçin!')
      return
    }

    setUploading(true)
    setProcessing(true)
    setMessage('Fotoğraf yükleniyor ve işleniyor...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // 1. Fotoğrafı Supabase Storage'a yükle
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      // 2. OCR yap
      setMessage('🔍 OCR işlemi başlıyor...')

      const result = await Tesseract.recognize(
        selectedFile,
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
      console.log('OCR Text:', extractedText)

      let finalData

      // 3. Claude AI ile işle (eğer açıksa)
      if (useAI) {
        try {
          const claudeData = await processWithClaude(extractedText)
          finalData = {
            date: claudeData.date || '',
            amount: claudeData.amount?.toString() || '',
            vatAmount: claudeData.vat_amount?.toString() || '',
            vatRate: claudeData.vat_rate?.toString() || '',
            companyName: claudeData.company_name || '',
            category: claudeData.category || '',
            notes: claudeData.notes || '',
          }
          setMessage('✅ Claude AI ile işleme tamamlandı!')
        } catch (error) {
          console.error('Claude hatası, basit OCR\'a dönüyoruz:', error)
          setMessage('⚠️ Claude hatası, basit OCR kullanılıyor...')
          const { date, amount, vatAmount, vatRate, companyName } = extractDateAndAmount(extractedText)
          finalData = {
            date, amount, vatAmount, vatRate, companyName,
            category: '',
            notes: 'Claude API hatası nedeniyle basit OCR kullanıldı'
          }
        }
      } else {
        // Basit OCR
        const { date, amount, vatAmount, vatRate, companyName } = extractDateAndAmount(extractedText)
        finalData = {
          date, amount, vatAmount, vatRate, companyName,
          category: '',
          notes: ''
        }
      }

      // 4. OCR Result sayfasına yönlendir
      const params = new URLSearchParams({
        imageUrl: publicUrl,
        date: finalData.date,
        amount: finalData.amount,
        vatAmount: finalData.vatAmount,
        vatRate: finalData.vatRate,
        companyName: finalData.companyName,
        category: finalData.category,
        notes: finalData.notes,
        rawText: extractedText
      })

      router.push(`/ocr-result?${params.toString()}`)

    } catch (error) {
      setMessage('Hata: ' + error.message)
      setProcessing(false)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">📸 Fiş Yükle</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            ← Geri
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Fatura veya Fiş Fotoğrafı Yükleyin
          </h2>

          {/* AI Toggle */}
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-3xl mr-3">🤖</div>
                <div>
                  <h3 className="font-semibold text-gray-800">Claude AI ile Akıllı İşleme</h3>
                  <p className="text-sm text-gray-600">%95+ doğruluk, otomatik kategori</p>
                </div>
              </div>
              <button
                onClick={() => setUseAI(!useAI)}
                className={`px-6 py-2 rounded-full font-semibold transition ${
                  useAI 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {useAI ? '✓ AÇIK' : 'KAPALI'}
              </button>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-600 mb-2">
                Fotoğraf seçmek için tıklayın
              </p>
              <p className="text-sm text-gray-400">
                PNG, JPG, JPEG formatları desteklenir
              </p>
            </label>
          </div>

          {preview && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Önizleme:</p>
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-lg border"
              />
              <p className="text-sm text-gray-600 mt-2">
                Dosya: {selectedFile?.name}
              </p>
            </div>
          )}

          {processing && ocrProgress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>OCR İşleniyor...</span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {selectedFile && (
            <button
              onClick={handleUploadAndOCR}
              disabled={uploading || processing}
              className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
                useAI
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? 'Yükleniyor...' : processing ? 'İşleniyor...' : useAI ? '🤖 Claude AI ile İşle' : '🔍 Basit OCR İşle'}
            </button>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('Hata')
                ? 'bg-red-50 text-red-700'
                : message.includes('Claude')
                ? 'bg-purple-50 text-purple-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>💡 İpucu:</strong> Claude AI açıkken firma adı, kategori, KDV otomatik tespit edilir. 
              Basit OCR sadece sayıları okur.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}