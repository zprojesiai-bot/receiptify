'use client'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-900/90 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-3xl sm:text-4xl">🧾</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Receiptify
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">AI Powered Receipt Management</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:from-indigo-500 hover:to-purple-500 transition shadow-lg shadow-indigo-500/50"
          >
            Giriş Yap
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="inline-block mb-3 sm:mb-4 px-3 sm:px-4 py-1 sm:py-2 bg-indigo-500/20 text-indigo-300 rounded-full text-xs sm:text-sm font-medium border border-indigo-500/30">
          ✨ Yapay Zeka Destekli Muhasebe
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight px-4">
          Fişlerinizi <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI</span> ile<br className="hidden sm:block" />
          Anında İşleyin
        </h2>
        <p className="text-base sm:text-xl md:text-2xl text-slate-300 mb-8 sm:mb-12 max-w-3xl mx-auto px-4">
          Fotoğraf çekin, yapay zeka otomatik işlesin. Muhasebe işlemlerinizi saniyeler içinde tamamlayın.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
          <button
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:from-indigo-500 hover:to-purple-500 transition shadow-2xl shadow-indigo-500/50 transform hover:scale-105"
          >
            🚀 Hemen Başla
          </button>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-slate-800 text-slate-200 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-slate-700 transition shadow-lg border-2 border-slate-600"
          >
            📖 Daha Fazla Bilgi
          </button>
        </div>

        {/* Hero Image/Animation */}
        <div className="mt-12 sm:mt-16 relative px-4">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl p-0.5 sm:p-1 max-w-5xl mx-auto shadow-2xl shadow-indigo-500/30">
            <div className="bg-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-slate-600">
                  <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">📸</div>
                  <h3 className="font-bold text-white mb-1 sm:mb-2 text-sm sm:text-base">Fotoğraf Çek</h3>
                  <p className="text-xs sm:text-sm text-slate-400">Fişi telefon kameranızla çekin</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-indigo-500">
                  <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">🤖</div>
                  <h3 className="font-bold text-white mb-1 sm:mb-2 text-sm sm:text-base">AI İşlesin</h3>
                  <p className="text-xs sm:text-sm text-indigo-100">Yapay zeka otomatik analiz eder</p>
                </div>
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-slate-600">
                  <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">✅</div>
                  <h3 className="font-bold text-white mb-1 sm:mb-2 text-sm sm:text-base">Kaydet</h3>
                  <p className="text-xs sm:text-sm text-slate-400">Tek tık ile sisteme kaydedin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-800/50 py-12 sm:py-16 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-indigo-400 mb-1 sm:mb-2">%95</p>
              <p className="text-xs sm:text-base text-slate-300">Doğruluk Oranı</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-400 mb-1 sm:mb-2">10sn</p>
              <p className="text-xs sm:text-base text-slate-300">İşlem Süresi</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-teal-400 mb-1 sm:mb-2">24/7</p>
              <p className="text-xs sm:text-base text-slate-300">Erişilebilirlik</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-400 mb-1 sm:mb-2">∞</p>
              <p className="text-xs sm:text-base text-slate-300">Fiş Kapasitesi</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
            Güçlü Özellikler
          </h2>
          <p className="text-base sm:text-xl text-slate-300 px-4">
            Muhasebe işlemlerinizi kolaylaştıran akıllı araçlar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 transition border border-slate-700 hover:border-indigo-500/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 shadow-lg shadow-indigo-500/50">
              🤖
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">AI Destekli OCR</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Claude AI ve Tesseract teknolojisi ile %95+ doğrulukla fiş okuma
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 transition border border-slate-700 hover:border-purple-500/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 shadow-lg shadow-purple-500/50">
              👥
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">Müşteri Yönetimi</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Her müşteri için ayrı fiş takibi ve detaylı raporlama
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:shadow-violet-500/20 transition border border-slate-700 hover:border-violet-500/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 shadow-lg shadow-violet-500/50">
              🏷️
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">Otomatik Kategorizasyon</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Firma adına göre akıllı kategori belirleme ve öğrenme
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 transition border border-slate-700 hover:border-emerald-500/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 shadow-lg shadow-emerald-500/50">
              💰
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">Bütçe Uyarıları</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Kategori bazlı bütçe limitleri ve otomatik uyarı sistemi
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 transition border border-slate-700 hover:border-amber-500/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 shadow-lg shadow-amber-500/50">
              🔍
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">Duplicate Detection</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Aynı fişin tekrar yüklenmesini otomatik algılama
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:shadow-teal-500/20 transition border border-slate-700 hover:border-teal-500/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 shadow-lg shadow-teal-500/50">
              📊
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">Detaylı Analiz</h3>
            <p className="text-sm sm:text-base text-slate-400">
              Aylık karşılaştırma, kategori analizi ve masraf raporları
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-br from-indigo-600 to-purple-600 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
              Nasıl Çalışır?
            </h2>
            <p className="text-base sm:text-xl text-indigo-100 px-4">
              3 basit adımda fişlerinizi işleyin
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white border border-white/20 hover:bg-white/15 transition">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">1️⃣</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Fiş Yükle</h3>
              <p className="text-sm sm:text-base text-indigo-100">
                Telefon kameranızla fotoğraf çekin veya galeriden seçin. Toplu yükleme desteği var!
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white border border-white/20 hover:bg-white/15 transition">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">2️⃣</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">AI İşlesin</h3>
              <p className="text-sm sm:text-base text-indigo-100">
                Yapay zeka tarih, tutar, KDV, firma adı gibi bilgileri otomatik çıkarır ve kategorize eder.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white border border-white/20 hover:bg-white/15 transition">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">3️⃣</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Kontrol & Kaydet</h3>
              <p className="text-sm sm:text-base text-indigo-100">
                Bilgileri kontrol edin, gerekirse düzenleyin ve tek tıkla sisteme kaydedin!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
              Neden Receiptify?
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex gap-3 sm:gap-4">
                <div className="text-2xl sm:text-3xl">⚡</div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Hızlı & Kolay</h3>
                  <p className="text-sm sm:text-base text-slate-400">Manuel veri girişi yok. Saniyeler içinde işlem tamamlanır.</p>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="text-2xl sm:text-3xl">🎯</div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Yüksek Doğruluk</h3>
                  <p className="text-sm sm:text-base text-slate-400">AI teknolojisi ile %95+ doğruluk oranı garantisi.</p>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="text-2xl sm:text-3xl">💼</div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Profesyonel Çözüm</h3>
                  <p className="text-sm sm:text-base text-slate-400">Muhasebeciler ve işletmeler için tasarlandı.</p>
                </div>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="text-2xl sm:text-3xl">🔒</div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Güvenli</h3>
                  <p className="text-sm sm:text-base text-slate-400">Supabase altyapısı ile güvenli veri saklama.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-slate-600 shadow-2xl shadow-indigo-500/20">
            <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🚀</div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Hemen Başlayın!</h3>
            <p className="text-sm sm:text-base text-slate-300 mb-6 sm:mb-8">
              Ücretsiz hesap oluşturun ve yapay zeka destekli muhasebe deneyimini yaşayın.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-base sm:text-lg hover:from-indigo-500 hover:to-purple-500 transition shadow-lg shadow-indigo-500/50"
            >
              Ücretsiz Dene
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 px-4">
            Muhasebe İşlemlerinizi Kolaylaştırın
          </h2>
          <p className="text-base sm:text-xl text-indigo-100 mb-6 sm:mb-8 px-4">
            Bugün başlayın, yarından itibaren zamandan ve paradan tasarruf edin.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-indigo-600 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl hover:bg-slate-100 transition shadow-2xl transform hover:scale-105"
          >
            🚀 Şimdi Başla - Ücretsiz
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-8 sm:py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-3xl sm:text-4xl">🧾</div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold">Receiptify</h3>
                <p className="text-xs text-slate-400">AI Powered Receipt Management</p>
              </div>
            </div>
            <div className="flex gap-4 sm:gap-6 text-sm">
              <a href="#features" className="hover:text-indigo-400 transition">Özellikler</a>
              <a href="#" className="hover:text-indigo-400 transition">İletişim</a>
              <a href="#" className="hover:text-indigo-400 transition">Gizlilik</a>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 text-center text-slate-400 text-xs sm:text-sm">
            © 2024 Receiptify. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  )
}