'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [filteredReceipts, setFilteredReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [viewingImage, setViewingImage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: ''
  })
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    search: ''
  })
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [receipts, filters])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const [clientsRes, receiptsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('receipts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])

      if (clientsRes.error) throw clientsRes.error
      if (receiptsRes.error) throw receiptsRes.error

      // Her müşteri için fiş sayısını hesapla
      const clientsWithCounts = (clientsRes.data || []).map(client => ({
        ...client,
        receiptCount: (receiptsRes.data || []).filter(r => r.client_id === client.id).length,
        totalAmount: (receiptsRes.data || [])
          .filter(r => r.client_id === client.id)
          .reduce((sum, r) => sum + (r.amount || 0), 0)
      }))

      setClients(clientsWithCounts)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClientReceipts = async (clientId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .order('date', { ascending: false })

      if (error) throw error
      setReceipts(data || [])
      setSelectedClient(clients.find(c => c.id === clientId))
    } catch (error) {
      console.error('Error loading receipts:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...receipts]

    if (filters.startDate) {
      filtered = filtered.filter(r => r.date >= filters.startDate)
    }
    if (filters.endDate) {
      filtered = filtered.filter(r => r.date <= filters.endDate)
    }
    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(r => 
        (r.company_name || '').toLowerCase().includes(search) ||
        (r.notes || '').toLowerCase().includes(search)
      )
    }

    setFilteredReceipts(filtered)
  }

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', editingClient.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{ ...formData, user_id: user.id }])

        if (error) throw error
      }

      setShowForm(false)
      setEditingClient(null)
      setFormData({ name: '', email: '', phone: '', company_name: '' })
      loadData()
    } catch (error) {
      alert('Hata: ' + error.message)
    }
  }

  const handleEdit = (client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company_name: client.company_name || ''
    })
    setShowForm(true)
  }

  const handleDeleteClient = async (id) => {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz? İlişkili fişler korunacak.')) return

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
      
      setSelectedClient(null)
      setReceipts([])
      loadData()
    } catch (error) {
      alert('Silme hatası: ' + error.message)
    }
  }

  const handleDeleteReceipt = async (id) => {
    if (!confirm('Bu fişi silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase.from('receipts').delete().eq('id', id)
      if (error) throw error

      if (selectedClient) {
        loadClientReceipts(selectedClient.id)
      }
      loadData()
    } catch (error) {
      alert('Silme hatası: ' + error.message)
    }
  }

  const resetFilters = () => {
    setFilters({ startDate: '', endDate: '', category: '', search: '' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  const categoryIcons = {
    'Yemek': '🍽️',
    'Ulaşım': '🚗',
    'Kırtasiye': '📎',
    'Sağlık': '⚕️',
    'Eğitim': '📚',
    'Diğer': '📦'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Image Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Fiş Görüntüsü</h3>
              <button
                onClick={() => setViewingImage(null)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
              >
                ✕ Kapat
              </button>
            </div>
            <div className="p-4">
              <img src={viewingImage} alt="Receipt" className="w-full rounded-lg" />
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {selectedClient ? `👤 ${selectedClient.name} - Fişler` : '👥 Müşteriler'}
          </h1>
          <div className="flex gap-3">
            {selectedClient ? (
              <button
                onClick={() => {
                  setSelectedClient(null)
                  setReceipts([])
                  setFilteredReceipts([])
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                ← Müşterilere Dön
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditingClient(null)
                    setFormData({ name: '', email: '', phone: '', company_name: '' })
                    setShowForm(true)
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
                >
                  + Yeni Müşteri
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  ← Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Müşteri Listesi */}
        {!selectedClient && (
          <>
            {showForm && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  {editingClient ? '✏️ Müşteri Düzenle' : '➕ Yeni Müşteri'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Ahmet Yılmaz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Firma Adı</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="ABC Ltd. Şti."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="ahmet@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="0532 123 45 67"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.name}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                  >
                    ✅ Kaydet
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingClient(null)
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    ❌ İptal
                  </button>
                </div>
              </div>
            )}

            {clients.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                <div className="text-7xl mb-4">👥</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Henüz müşteri eklemediniz</h2>
                <p className="text-gray-600 mb-6">İlk müşterinizi eklemek için butona tıklayın</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
                >
                  + İlk Müşteriyi Ekle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client) => (
                  <div key={client.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{client.name}</h3>
                          {client.company_name && (
                            <p className="text-sm text-gray-600">{client.company_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {client.email && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          📧 {client.email}
                        </p>
                      )}
                      {client.phone && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          📞 {client.phone}
                        </p>
                      )}
                      <div className="bg-blue-50 rounded-lg p-3 mt-3">
                        <p className="text-sm text-blue-900 font-bold">{client.receiptCount} Fiş</p>
                        <p className="text-xs text-blue-700">Toplam: {client.totalAmount.toFixed(2)} ₺</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => loadClientReceipts(client.id)}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
                      >
                        📊 Fişleri Gör
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Fiş Listesi */}
        {selectedClient && (
          <>
            {/* Filtreler */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🔍 Filtreleme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Başlangıç"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Bitiş"
                />
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Tüm Kategoriler</option>
                  <option value="Yemek">🍽️ Yemek</option>
                  <option value="Ulaşım">🚗 Ulaşım</option>
                  <option value="Kırtasiye">📎 Kırtasiye</option>
                  <option value="Sağlık">⚕️ Sağlık</option>
                  <option value="Eğitim">📚 Eğitim</option>
                  <option value="Diğer">📦 Diğer</option>
                </select>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="🔎 Ara..."
                />
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  {filteredReceipts.length} / {receipts.length} fiş gösteriliyor
                </div>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>

            {/* Fişler */}
            {filteredReceipts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                <div className="text-7xl mb-4">📭</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {receipts.length === 0 ? 'Bu müşteriye ait fiş yok' : 'Filtre sonucu bulunamadı'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {receipts.length === 0 ? 'Fiş yüklemek için Upload sayfasını kullanın' : 'Farklı filtreler deneyin'}
                </p>
                {receipts.length === 0 && (
                  <button
                    onClick={() => router.push('/upload')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
                  >
                    📤 Fiş Yükle
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tarih</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Firma</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Kategori</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tutar</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">KDV</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredReceipts.map((receipt) => (
                        <tr key={receipt.id} className="hover:bg-blue-50 transition">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {receipt.date ? new Date(receipt.date).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {receipt.company_name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full text-xs font-medium">
                              {categoryIcons[receipt.category] || '📦'} {receipt.category || 'Diğer'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">
                            {receipt.amount ? `${receipt.amount.toFixed(2)} ₺` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {receipt.vat_amount ? `${receipt.vat_amount.toFixed(2)} ₺` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setViewingImage(receipt.image_url)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => router.push(`/receipts/edit/${receipt.id}`)}
                                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteReceipt(receipt.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t-2 border-blue-100">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-700">
                      Toplam <strong className="text-blue-600">{filteredReceipts.length}</strong> fiş
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      Toplam Tutar: <strong className="text-green-600">
                        {filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)} ₺
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}