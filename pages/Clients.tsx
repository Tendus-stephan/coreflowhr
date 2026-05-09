import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Building2, Mail, Phone, MapPin, Search, X, MoreVertical, Loader2, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ClientsSkeleton } from '../components/ui/Skeleton';
import { api, Client } from '../services/api';
import { createPortal } from 'react-dom';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    notes: ''
  });

  // Logo upload state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [clientLogoErr, setClientLogoErr] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
    api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
  }, []);
  const canManage = userRole === 'Admin' || userRole === 'Recruiter';

  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCreateModal]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const clientsList = await api.clients.list();
      setClients(clientsList);
    } catch (error: any) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClient(null);
    setClientLogoUrl(null);
    setClientLogoErr(false);
    setLogoUploadError(null);
    setFormData({ name: '', contactEmail: '', contactPhone: '', address: '', notes: '' });
    setShowCreateModal(true);
  };

  const handleEdit = (client: Client) => {
    setOpenMenuId(null);
    setEditingClient(client);
    setClientLogoUrl(client.logoUrl || null);
    setClientLogoErr(false);
    setLogoUploadError(null);
    setFormData({
      name: client.name,
      contactEmail: client.contactEmail || '',
      contactPhone: client.contactPhone || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setShowCreateModal(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingClient) return;
    setLogoUploadError(null);
    setIsUploadingLogo(true);
    try {
      const { publicUrl } = await api.clients.uploadLogo(editingClient.id, file);
      setClientLogoUrl(publicUrl);
      setClientLogoErr(false);
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, logoUrl: publicUrl } : c));
    } catch (err: any) {
      setLogoUploadError(err?.message || 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setOpenMenuId(null);
    const ok = await confirm({
      title: 'Delete this client?',
      description: 'Jobs linked to this client will be unlinked.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api.clients.delete(id);
      await loadClients();
      toast.success('Client deleted.');
    } catch (error: any) {
      console.error('Failed to delete client:', error);
      toast.error(error.message || 'Failed to delete client.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Client name is required'); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
    });
    setOpenMenuId(prev => prev === id ? null : id);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contactEmail?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (loading) return <ClientsSkeleton />;

  return (
    <div className="flex flex-col h-full bg-gray-50/40">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Clients</h1>
          <p className="mt-1.5 text-sm text-gray-400 font-normal">
            Manage your client companies and link them to open roles.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleCreate} icon={<Plus size={15} />} size="sm">
            Add Client
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-8 py-3 border-b border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors w-56"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={13} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400 ml-1">{filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <Building2 size={22} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {searchQuery ? 'No clients found' : 'No clients yet'}
            </p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs">
              {searchQuery ? 'Try a different search term' : 'Create your first client to organize jobs by company'}
            </p>
            {!searchQuery && canManage && (
              <Button onClick={handleCreate} icon={<Plus size={15} />} size="sm">
                Create First Client
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_44px] gap-0 border-b border-gray-100">
              {['Client', 'Email', 'Phone', 'Address', ''].map((col, i) => (
                <div key={i} className="px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                  {col}
                </div>
              ))}
            </div>

            {/* Table rows */}
            {filteredClients.map((client, idx) => (
              <div
                key={client.id}
                className={`grid grid-cols-[2fr_2fr_1.5fr_1.5fr_44px] gap-0 items-center hover:bg-gray-50 hover:shadow-[inset_3px_0_0_theme(colors.gray.900)] transition-all duration-150 ${idx !== filteredClients.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* Name + logo */}
                <div className="px-4 py-3 flex items-center gap-3 min-w-0">
                  <div
                    className="flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{
                      width: 32, height: 32,
                      borderRadius: '8px',
                      backgroundColor: client.logoUrl ? '#f3f4f6' : '#111827',
                      border: client.logoUrl ? '0.5px solid #e5e7eb' : 'none',
                    }}
                  >
                    {client.logoUrl ? (
                      <img
                        src={client.logoUrl}
                        alt={client.name}
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm select-none">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 truncate">{client.name}</span>
                </div>

                {/* Email */}
                <div className="px-4 py-3 min-w-0">
                  {client.contactEmail ? (
                    <a
                      href={`mailto:${client.contactEmail}`}
                      className="text-sm text-gray-600 hover:text-gray-900 truncate flex items-center gap-1.5 transition-colors"
                    >
                      <Mail size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.contactEmail}</span>
                    </a>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                </div>

                {/* Phone */}
                <div className="px-4 py-3 min-w-0">
                  {client.contactPhone ? (
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Phone size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.contactPhone}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                </div>

                {/* Address */}
                <div className="px-4 py-3 min-w-0">
                  {client.address ? (
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="px-2 py-3 flex items-center justify-center relative">
                  {canManage && (
                    <button
                      onClick={(e) => openMenu(e, client.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu portal */}
      {openMenuId && createPortal(
        <div ref={menuRef} style={menuStyle} className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-36 py-1">
          <button
            onClick={() => handleEdit(clients.find(c => c.id === openMenuId)!)}
            className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Edit size={14} className="text-gray-400" /> Edit
          </button>
          <button
            onClick={() => handleDelete(openMenuId)}
            className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>,
        document.body
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editingClient ? 'Edit Client' : 'New Client'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Logo upload — top of modal, centered */}
            <div className="px-6 pt-5 pb-1 flex flex-col items-center">
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={!editingClient || isUploadingLogo}
              />
              <button
                type="button"
                onClick={() => editingClient && !isUploadingLogo && logoInputRef.current?.click()}
                className="relative flex items-center justify-center overflow-hidden group transition-all"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '10px',
                  backgroundColor: '#f3f4f6',
                  border: '0.5px solid #e5e7eb',
                  cursor: editingClient ? 'pointer' : 'default',
                }}
                title={editingClient ? 'Click to upload logo' : undefined}
              >
                {isUploadingLogo ? (
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                ) : clientLogoUrl && !clientLogoErr ? (
                  <>
                    <img
                      src={clientLogoUrl}
                      alt=""
                      className="w-full h-full object-contain p-1.5"
                      onError={() => setClientLogoErr(true)}
                    />
                    {editingClient && (
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: '10px' }}
                      >
                        <Upload size={13} className="text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span
                      className="text-xl font-extrabold select-none"
                      style={{ color: '#374151' }}
                    >
                      {(formData.name || '?').charAt(0).toUpperCase()}
                    </span>
                    {editingClient && (
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: '10px' }}
                      >
                        <Upload size={13} className="text-white" />
                      </div>
                    )}
                  </>
                )}
              </button>
              {logoUploadError && (
                <p className="text-xs text-red-600 mt-1.5 text-center">{logoUploadError}</p>
              )}
              {!editingClient && (
                <p className="text-[11px] text-gray-400 mt-1.5">Logo can be added after saving</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Client Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. TechCorp Inc."
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this client..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 resize-none transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : (editingClient ? 'Update' : 'Create') + ' Client'}
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
