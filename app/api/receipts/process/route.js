import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    // Frontend'den artık 'ocrText' değil, 'imageBase64' bekliyoruz
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Görsel verisi bulunamadı' },
        { status: 400 }
      );
    }

    // Base64 başlığını temizle (data:image/jpeg;base64, kısmını at)
    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    // Claude API'ye GÖRSEL gönderiyoruz (Vision Capabilities)
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620', // DOĞRU MODEL ID
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg", // Fiş formatına göre dinamik olabilir ama jpeg genelde çalışır
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `Sen uzman bir muhasebe asistanısın. Eklediğim fiş/fatura görselini analiz et ve bilgileri JSON formatında çıkar.

              ÇIKARILACAK BİLGİLER:
              1. date: Fatura tarihi (YYYY-MM-DD formatında)
              2. company_name: Firma adı (tam ve düzgün yazılmış)
              3. amount: Toplam tutar (sadece sayı)
              4. vat_rate: KDV oranı (örn: 1, 10, 20 - en baskın oran)
              5. vat_amount: KDV tutarı (sadece sayı)
              6. category: Kategori (Yemek, Ulaşım, Kırtasiye, Sağlık, Eğitim, Diğer)
              7. notes: Kısa açıklama (örn: "Market alışverişi")

              KURALLAR:
              - Sadece saf JSON döndür. Markdown bloğu kullanma.
              - Bulamadığın değere null yaz.
              - Virgüllü sayıları noktaya çevir (150,50 -> 150.50).
              `
            }
          ]
        }
      ]
    });

    const responseText = message.content[0].text;
    
    // JSON temizleme ve parse işlemi
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