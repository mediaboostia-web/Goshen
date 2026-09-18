'use client';

import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { COOKIE_PREFIX } from '@/lib/constants';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChurchIcon } from '@/components/icons/ChurchIcons';
import { PAYMENT_METHOD_LABELS, formatPaymentMethods } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  type: string;
}

const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface CategoryRowProps {
  cat: Category;
  typeLabel: string;
  typeLabelClassName: string;
  canManage: boolean;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  saving: boolean;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function CategoryRow({
  cat,
  typeLabel,
  typeLabelClassName,
  canManage,
  isEditing,
  editingName,
  onEditingNameChange,
  saving,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: CategoryRowProps) {
  if (isEditing) {
    return (
      <div className="flex justify-between items-center gap-2 py-1 px-2 bg-white rounded-md border border-stone-100">
        <input
          type="text"
          autoFocus
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="flex-1 min-w-0 rounded border border-emerald-300 px-1.5 py-0.5 text-stone-900 focus:outline-hidden"
        />
        <button
          type="button"
          onClick={onSaveEdit}
          disabled={saving}
          className="text-emerald-700 font-bold hover:text-emerald-900 disabled:opacity-50 cursor-pointer"
          title="Enregistrer"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="text-stone-400 font-bold hover:text-stone-700 cursor-pointer"
          title="Annuler"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center gap-2 py-1 px-2 bg-white rounded-md border border-stone-100">
      <span className="font-medium text-stone-800 truncate">{cat.name}</span>
      <span className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold ${typeLabelClassName}`}>{typeLabel}</span>
        {canManage && (
          <>
            <button
              type="button"
              onClick={onStartEdit}
              className="text-stone-400 hover:text-emerald-800 cursor-pointer"
              title="Renommer"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-stone-400 hover:text-rose-700 cursor-pointer"
              title="Supprimer"
            >
              🗑
            </button>
          </>
        )}
      </span>
    </div>
  );
}

export default function ChurchSettingsPage() {
  const { church, refreshBranches } = useBranch();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState<boolean>(false);

  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [savingContact, setSavingContact] = useState<boolean>(false);

  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [removingLogo, setRemovingLogo] = useState<boolean>(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (church) {
      setPaymentMethods(church.paymentMethods || []);
      setPaymentDetails(church.paymentDetails || '');
      setContactEmail(church.email || '');
      setContactPhone(church.phone || '');
    }
  }, [church]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ categories: Category[] }>('/api/church/categories');
      setCategories(res.categories || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newCatName.trim()) return;

    setAdding(true);
    try {
      await api('/api/church/categories', {
        method: 'POST',
        body: {
          name: newCatName.trim(),
          type: newCatType,
        },
      });

      toast(`Catégorie "${newCatName}" ajoutée !`, 'success');
      setNewCatName('');
      await loadCategories();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erreur lors de l’ajout.');
      } else {
        setError('Erreur réseau.');
      }
    } finally {
      setAdding(false);
    }
  }

  function startEditCategory(cat: Category) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  function cancelEditCategory() {
    setEditingId(null);
    setEditingName('');
  }

  async function saveEditCategory(cat: Category) {
    const name = editingName.trim();
    if (!name || name === cat.name) {
      cancelEditCategory();
      return;
    }
    setSavingEditId(cat.id);
    try {
      await api(`/api/church/categories/${cat.id}`, {
        method: 'PATCH',
        body: { name },
      });
      toast('Catégorie renommée.', 'success');
      cancelEditCategory();
      await loadCategories();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau.', 'error');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleDeleteCategory() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await api(`/api/church/categories/${deleteTarget.id}`, { method: 'DELETE' });
      toast(`Catégorie "${deleteTarget.name}" supprimée.`, 'success');
      setDeleteTarget(null);
      await loadCategories();
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : 'Impossible de supprimer cette catégorie.',
        'error',
      );
    } finally {
      setDeletingId(null);
    }
  }

  function togglePaymentMethod(code: string) {
    setPaymentMethods((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code],
    );
  }

  async function handleSavePaymentMethods(e: FormEvent) {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await api('/api/church', {
        method: 'PATCH',
        body: { paymentMethods, paymentDetails: paymentDetails.trim() },
      });
      toast('Moyens de réception mis à jour.', 'success');
      await refreshBranches();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau.', 'error');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Raw fetch (not api()) because api() forces a JSON Content-Type,
      // incompatible with multipart FormData — mirrors the receipt-upload
      // pattern in transactions/expenses/page.tsx.
      const csrfCookieName = `${COOKIE_PREFIX}-csrf`;
      const csrfMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)${csrfCookieName}=([^;]*)`));
      const csrfToken = csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : '';

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Téléversement échoué');
      }

      const uploaded = await res.json();
      const url = uploaded.url || uploaded.secure_url;
      if (!url) throw new Error('Téléversement échoué');

      await api('/api/church', { method: 'PATCH', body: { logoUrl: url } });
      await refreshBranches();
      toast('Logo mis à jour partout dans l’application.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Échec du téléversement du logo.', 'error');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    setRemovingLogo(true);
    try {
      await api('/api/church', { method: 'PATCH', body: { logoUrl: '' } });
      await refreshBranches();
      toast('Logo retiré.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau.', 'error');
    } finally {
      setRemovingLogo(false);
    }
  }

  async function handleSaveContactInfo(e: FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    try {
      await api('/api/church', {
        method: 'PATCH',
        body: { email: contactEmail.trim(), phone: contactPhone.trim() },
      });
      toast('Coordonnées mises à jour.', 'success');
      await refreshBranches();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau.', 'error');
    } finally {
      setSavingContact(false);
    }
  }

  const incomeCats = categories.filter((c) => c.type === 'INCOME');
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');
  const canManageCategories = Boolean(church?.isPastor || church?.isTreasurer);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-10 font-sans">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
            Paramètres & Catégories de l’Église
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Personnalisez vos rubriques de culte et consultez les informations de {church?.name}.
          </p>
        </div>

        {/* General Church Info */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs text-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
            Identité de la Communauté
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-stone-400 block">Nom de l’Église</span>
              <span className="font-bold text-stone-900 text-sm">{church?.name}</span>
            </div>
            <div>
              <span className="text-stone-400 block">Dénomination</span>
              <span className="font-bold text-stone-900 text-sm">
                {church?.denomination || 'Non spécifié'}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block">Devise par défaut</span>
              <span className="font-bold text-emerald-800 text-sm">
                {church?.currency || 'FCFA'}
              </span>
            </div>
          </div>
        </div>

        {/* Church Logo — shown in the header, the dashboard and on invoices */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
              Logo de l’Église
            </h2>
            <p className="text-xs text-stone-500 mt-2">
              Affiché dans l’en-tête, sur le tableau de bord et sur vos factures. Mis à jour partout
              dès l’enregistrement.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
              {church?.logoUrl ? (
                <img src={church.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <ChurchIcon className="h-7 w-7 text-stone-300" />
              )}
            </div>

            {church?.isPastor ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleLogoUpload(e)}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {uploadingLogo
                    ? 'Téléversement…'
                    : church?.logoUrl
                      ? 'Changer le logo'
                      : 'Ajouter un logo'}
                </button>
                {church?.logoUrl && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveLogo()}
                    disabled={removingLogo}
                    className="rounded-lg border border-stone-300 px-4 py-2 font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-50 cursor-pointer"
                  >
                    {removingLogo ? 'Retrait…' : 'Retirer'}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                {church?.logoUrl
                  ? 'Logo configuré par le pasteur.'
                  : 'Aucun logo configuré pour le moment.'}
              </p>
            )}
          </div>
        </div>

        {/* Contact Info (shown on invoices/receipts) */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
              Coordonnées de l’Église
            </h2>
            <p className="text-xs text-stone-500 mt-2">
              Affichées en bas des factures et reçus. Laissez vide ce que vous ne souhaitez pas
              afficher.
            </p>
          </div>

          {church?.isPastor ? (
            <form onSubmit={handleSaveContactInfo} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-stone-500 block mb-1">Email de contact</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Ex : tresorerie@monEglise.org"
                    className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-stone-500 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Ex : +241 07 45 67 89"
                    className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingContact}
                className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingContact ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-stone-600 space-y-1">
              <span className="block">
                <span className="text-stone-400">Email :</span>{' '}
                <strong>{church?.email || 'Non renseigné'}</strong>
              </span>
              <span className="block">
                <span className="text-stone-400">Téléphone :</span>{' '}
                <strong>{church?.phone || 'Non renseigné'}</strong>
              </span>
            </p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
              Moyens de Réception des Paiements
            </h2>
            <p className="text-xs text-stone-500 mt-2">
              Ces moyens de paiement apparaissent sur les factures et reçus générés par
              l’application.
            </p>
          </div>

          {church?.isPastor ? (
            <form onSubmit={handleSavePaymentMethods} className="space-y-4 text-xs">
              <div className="flex flex-wrap gap-3">
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      paymentMethods.includes(opt.value)
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-stone-300 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={paymentMethods.includes(opt.value)}
                      onChange={() => togglePaymentMethod(opt.value)}
                      className="accent-emerald-800"
                    />
                    <span className="font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-stone-500 block mb-1">
                  Détails (ex : numéro Mobile Money, nom de la banque…)
                </label>
                <input
                  type="text"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder="Ex : Airtel Money 074 12 34 56"
                  className="w-full rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={savingPayment}
                className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingPayment ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-stone-600">
              <span className="text-stone-400">Configuré :</span>{' '}
              <strong>{formatPaymentMethods(church?.paymentMethods)}</strong>
            </p>
          )}
        </div>

        {/* Categories Manager */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-4">
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">
                Catégories Financières Personnalisées
              </h2>
              <p className="text-xs text-stone-500">
                Gérez les motifs d’entrées (dîmes, collectes) et de dépenses de votre assemblée.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Add Category Form — Pastor & Treasurer, mirrors the backend gate */}
          {canManageCategories && (
            <form
              onSubmit={handleAddCategory}
              className="flex flex-wrap items-center gap-3 text-xs"
            >
              <input
                type="text"
                required
                placeholder="Ex: Don spécial évangélisation, Sono..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 min-w-[200px] rounded-lg border border-stone-300 p-2 text-stone-900 focus:outline-hidden"
              />
              <Select
                aria-label="Type de catégorie"
                className="w-56"
                value={newCatType}
                onChange={(v) => setNewCatType(v as 'INCOME' | 'EXPENSE')}
                options={[
                  { value: 'INCOME', label: 'Type : ENTRÉE (Dîmes, Offrandes)' },
                  { value: 'EXPENSE', label: 'Type : DÉPENSE (Sorties)' },
                ]}
              />
              <button
                type="submit"
                disabled={adding}
                className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {adding ? 'Ajout…' : 'Ajouter'}
              </button>
            </form>
          )}

          {/* Categories Lists Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
            {/* Income Categories */}
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
              <h3 className="font-bold text-emerald-950 pb-2 border-b border-stone-200 mb-3 flex items-center justify-between">
                <span>💰 Catégories d’Entrées</span>
                <span className="text-[11px] text-stone-500">{incomeCats.length}</span>
              </h3>
              <div className="space-y-1.5">
                {incomeCats.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    typeLabel="Entrée"
                    typeLabelClassName="text-emerald-700"
                    canManage={canManageCategories}
                    isEditing={editingId === cat.id}
                    editingName={editingName}
                    onEditingNameChange={setEditingName}
                    saving={savingEditId === cat.id}
                    onStartEdit={() => startEditCategory(cat)}
                    onSaveEdit={() => void saveEditCategory(cat)}
                    onCancelEdit={cancelEditCategory}
                    onDelete={() => setDeleteTarget(cat)}
                  />
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
              <h3 className="font-bold text-stone-900 pb-2 border-b border-stone-200 mb-3 flex items-center justify-between">
                <span>🧾 Catégories de Dépenses</span>
                <span className="text-[11px] text-stone-500">{expenseCats.length}</span>
              </h3>
              <div className="space-y-1.5">
                {expenseCats.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    typeLabel="Dépense"
                    typeLabelClassName="text-stone-500"
                    canManage={canManageCategories}
                    isEditing={editingId === cat.id}
                    editingName={editingName}
                    onEditingNameChange={setEditingName}
                    saving={savingEditId === cat.id}
                    onStartEdit={() => startEditCategory(cat)}
                    onSaveEdit={() => void saveEditCategory(cat)}
                    onCancelEdit={cancelEditCategory}
                    onDelete={() => setDeleteTarget(cat)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Supprimer cette catégorie ?"
        description={`"${deleteTarget?.name ?? ''}" sera définitivement supprimée. Si elle est déjà utilisée par des écritures, la suppression sera refusée.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        busy={deletingId !== null}
        onConfirm={() => void handleDeleteCategory()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
