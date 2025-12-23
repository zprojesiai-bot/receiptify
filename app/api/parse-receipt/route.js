import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { text, imageUrl } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const prompt = `Bu fişten aşağıdaki bilgileri çıkar. OCR metni şu:

${text}

Lütfen şu bilgileri JSON formatında döndür:
{
  "date": "YYYY-MM-DD formatında tarih",
  "companyName": "Firma adı",
  "amount": "Toplam tutar (sadece sayı, nokta ile)",
  "vatAmount": "KDV tutarı (sadece sayı, nokta ile)",
  "vatRate": "KDV oranı (1, 10, veya 20)",
  "category": "Kategori (Yemek, Ulaşım, Kırtasiye, Sağlık, Eğitim, veya Diğer)",
  "confidence": {
    "date": 0-100 arası güven skoru,
    "amount": 0-100 arası güven skoru,
    "vatAmount": 0-100 arası güven skoru,
    "companyName": 0-100 arası güven skoru
  }
}

SADECE JSON döndür, başka açıklama ekleme.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText = message.content[0].text
    
    // Extract JSON from response (in case Claude adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Claude')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json(parsed)

  } catch (error) {
    console.error('Parse receipt error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}