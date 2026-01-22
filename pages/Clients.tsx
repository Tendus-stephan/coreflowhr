import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Building2, Mail, Phone, MapPin, Search, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api, Client } from '../services/api';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const clientsList = await api.clients.list();
      setClients(clientsList);
    } catch (error: any) {
      console.error('Failed to load clients:', error);
      alert('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      notes: ''
    });
    setShowCreateModal(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contactEmail: client.contactEmail || '',
      contactPhone: client.contactPhone || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? Jobs linked to this client will be unlinked.')) {
      return;
    }

    try {
      await api.clients.delete(id);
      await loadClients();
    } catch (error: any) {
      console.error('Failed to delete client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Client name is required');
      return;
    }

    try {
      if (editingClient) {
        await api.clients.update(editingClient.id, formData);
      } else {
        await api.clients.create(formData);
      }
      setShowCreateModal(false);
      await loadClients();
    } catch (error: any) {
      console.error('Failed to save client:', error);
      alert('Failed to save client. Please try again.');
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your client companies and organize jobs by client</p>
        </div>
        <Button onClick={handleCreate} icon={<Plus size={16} />} className="shadow-lg hover:shadow-xl transition-all">
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none shadow-sm transition-all hover:shadow-md"
          />
        </div>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Building2 className="text-gray-400" size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
            {searchQuery 
              ? 'Try a different search term'
              : 'Create your first client to organize jobs by company'}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreate} icon={<Plus size={16} />} className="shadow-lg hover:shadow-xl transition-all">
              Create First Client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client, index) => (
            <div 
              key={client.id} 
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900"></div>
              
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-gray-700 transition-colors">{client.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleEdit(client)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                    title="Edit client"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-all"
                    title="Delete client"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {client.contactEmail && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <Mail size={14} className="text-gray-400" />
                    </div>
                    <span className="truncate">{client.contactEmail}</span>
                  </div>
                )}
                {client.contactPhone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <Phone size={14} className="text-gray-400" />
                    </div>
                    <span>{client.contactPhone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <MapPin size={14} className="text-gray-400" />
                    </div>
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
                {!client.contactEmail && !client.contactPhone && !client.address && (
                  <div className="text-xs text-gray-400 italic">No contact information</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingClient ? 'Edit Client' : 'Create Client'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-bold text-gray-900 mb-2 block">Client Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. TechCorp Inc."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-900 mb-2 block">Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@company.com"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-900 mb-2 block">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-900 mb-2 block">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-900 mb-2 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this client..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none resize-none transition-all shadow-sm hover:shadow-md"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 shadow-lg hover:shadow-xl transition-all">
                  {editingClient ? 'Update' : 'Create'} Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
