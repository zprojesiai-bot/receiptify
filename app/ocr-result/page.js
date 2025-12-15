// /ocr-result/page.js dosyasının YENİ içeriği

import { Suspense } from 'react';
// Adım 1'de oluşturduğunuz yeni dosyayı içeri aktarın
import OCRContent from './OCRContent'; 

export default function OCRResultPage() {
  return (
    // useSearchParams() içeren bileşeni Suspense ile sarıyoruz
    <Suspense fallback={<div className="text-center p-8">Bilgiler Yükleniyor...</div>}>
      <OCRContent />
    </Suspense>
  );
}