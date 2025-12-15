'use client'
import { useEffect, useRef, useState } from 'react'

export default function QRScanner({ onScan, onClose }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)

  useEffect(() => {
    // Dinamik olarak html5-qrcode yükle
    const loadScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        html5QrCodeRef.current = new Html5Qrcode("qr-reader")
        startScanning()
      } catch (err) {
        setError('QR tarayıcı yüklenemedi: ' + err.message)
      }
    }

    loadScanner()

    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error)
      }
    }
  }, [])

  const startScanning = async () => {
    if (!html5QrCodeRef.current) return

    try {
      setScanning(true)
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // QR kod okundu
          console.log('QR Decoded:', decodedText)
          html5QrCodeRef.current.stop()
          setScanning(false)
          parseQRData(decodedText)
        },
        (errorMessage) => {
          // Tarama hatası (normal, sürekli tarar)
        }
      )
    } catch (err) {
      setError('Kamera erişimi reddedildi: ' + err.message)
      setScanning(false)
    }
  }

  const parseQRData = (qrText) => {
    try {
      // Türk e-Fatura QR formatı: JSON veya key=value
      let data = {}

      if (qrText.startsWith('{')) {
        // JSON format
        data = JSON.parse(qrText)
      } else if (qrText.includes('=')) {
        // key=value format
        qrText.split('&').forEach(pair => {
          const [key, value] = pair.split('=')
          data[key] = decodeURIComponent(value)
        })
      } else {
        // Ham metin
        data.rawText = qrText
      }

      // e-Fatura alanlarını mapple
      const extractedData = {
        date: data.tarih || data.date || '',
        amount: data.tutar || data.amount || data.toplam || '',
        vatAmount: data.kdv || data.vat || '',
        companyName: data.firma || data.company || data.unvan || '',
        invoiceNo: data.faturaNo || data.invoiceNo || '',
        notes: `QR'dan okundu: ${qrText}`,
        rawText: qrText
      }

      onScan(extractedData)
    } catch (error) {
      console.error('QR parse error:', error)
      onScan({ rawText: qrText, notes: 'QR kod okunamadı, manuel giriş yapın' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">📷 QR Kod Tara</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
          >
            ✕ Kapat
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <div 
          id="qr-reader" 
          className="w-full rounded-lg overflow-hidden border-4 border-blue-500"
          style={{ minHeight: '300px' }}
        />

        {scanning && (
          <div className="mt-4 text-center">
            <div className="inline-block px-6 py-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                <span className="font-medium">QR kodu kameraya gösterin...</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>💡 İpucu:</strong> QR kodu fatura üzerinde arayın (genelde alt köşede). 
            Kamerayı QR koduna doğru tutun, otomatik okuyacak.
          </p>
        </div>
      </div>
    </div>
  )
}