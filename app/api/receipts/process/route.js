import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { ocrText } = await request.json();

    if (!ocrText) {
      return NextResponse.json(
        { error: 'OCR metni bulunamadı' },
        { status: 400 }
      );
    }

    // Claude API'ye prompt gönder
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Sen bir muhasebe asistanısın. Aşağıdaki fiş/fatura OCR metninden şu bilgileri Türk Muhasebe Standardına uygun şekilde çıkar ve JSON formatında döndür:

OCR Metni:
${ocrText}

ÇIKARILACAK BİLGİLER:
1. date: Fatura tarihi (YYYY-MM-DD formatında)
2. company_name: Firma adı (tam ve düzgün yazılmış)
3. amount: Toplam tutar (sadece sayı, para birimi olmadan)
4. vat_rate: KDV oranı (örn: 1, 10, 20)
5. vat_amount: KDV tutarı (sadece sayı)
6. category: Kategori (şunlardan biri seç: Yemek, Ulaşım, Kırtasiye, Sağlık, Eğitim, Diğer)
7. notes: Ek notlar (varsa önemli detaylar, kısa ve öz)

ÖNEMLİ KURALLAR:
- Eğer bir bilgi OCR metninde yoksa null döndür
- Tutarları ondalık ayırıcı olarak nokta (.) kullan
- Tarihi mutlaka YYYY-MM-DD formatında döndür
- Kategoriyi yukarıdaki listeden seç
- KDV oranını sayı olarak ver (ör: 20, 10, 1)
- Firma adını düzgün Türkçe karakter kullanarak yaz

SADECE JSON döndür, başka hiçbir açıklama yazma. Markdown kod bloğu kullanma.

Örnek çıktı formatı:
{
  "date": "2024-12-08",
  "company_name": "Migros",
  "amount": 150.75,
  "vat_rate": 20,
  "vat_amount": 25.13,
  "category": "Yemek",
  "notes": "Market alışverişi"
}`
        }
      ]
    });

    // Claude'un yanıtını parse et
    const responseText = message.content[0].text;
    
    // JSON'u çıkar (eğer Claude markdown kod bloğu eklediyse temizle)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsedData = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('Claude API Hatası:', error);
    return NextResponse.json(
      { 
        error: 'AI işleme hatası: ' + error.message,
        success: false 
      },
      { status: 500 }
    );
  }
}