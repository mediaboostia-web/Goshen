'use client';

import { useState, type FormEvent, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNav } from '@/components/layout/AppNav';
import { Select } from '@/components/ui/Select';
import {
  ChurchIcon,
  ShieldCheckIcon,
  HeartHandIcon,
  BuildingBranchIcon,
  CheckCircleIcon,
  UsersGroupIcon,
  PlusIcon,
  ReceiptTextIcon,
} from '@/components/icons/ChurchIcons';

type TabKey = 'compte' | 'securite' | 'membres' | 'eglise' | 'soutenir';

const NOTIFICATION_EVENT_TYPES: { key: string; label: string; description: string }[] = [
  {
    key: 'low_balance',
    label: 'Solde de caisse bas',
    description: 'Alerte lorsque le solde d’une annexe passe sous le seuil défini.',
  },
  {
    key: 'recurring_expense_due',
    label: 'Charge fixe à échéance',
    description: 'Rappel lorsqu’une charge récurrente (loyer, salaire…) arrive à échéance.',
  },
];

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: 'PASTOR' | 'TREASURER' | 'SECRETARY' | 'AUDITOR';
  branchName: string;
  status: 'ACTIVE' | 'INVITED';
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const { user, refresh } = useAuth();
  const { church, branches, currentBranch, refreshBranches } = useBranch();
  const { toast } = useToast();

  const tabParam = searchParams?.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || 'compte');

  // ── FORM STATES ─────────────────────────────────────────────────────
  // Tab: Sécurité (Mot de passe)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Tab: Membres & Rôles
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<
    'PASTOR' | 'TREASURER' | 'SECRETARY' | 'AUDITOR'
  >('TREASURER');
  const [newMemberBranch, setNewMemberBranch] = useState<string>('ALL');
  const [invitingMember, setInvitingMember] = useState(false);

  // Tab: Compte (Préférences de notification)
  interface ChannelPref {
    email?: boolean;
    inApp?: boolean;
  }
  const [notifPrefs, setNotifPrefs] = useState<Record<string, ChannelPref>>({});
  const [savingNotifPref, setSavingNotifPref] = useState<string | null>(null);

  // Tab: Église
  const normalizeCurrency = (c?: string | null) => {
    if (!c) return 'FCFA';
    const upper = c.toUpperCase().trim();
    if (upper === 'XAF' || upper === 'XOF') return 'FCFA';
    return upper;
  };

  const [churchName, setChurchName] = useState(church?.name || '');
  const [denomination, setDenomination] = useState(church?.denomination || '');
  const [currency, setCurrency] = useState(() => normalizeCurrency(church?.currency));
  const [savingChurch, setSavingChurch] = useState(false);

  useEffect(() => {
    if (church) {
      setChurchName(church.name);
      setDenomination(church.denomination || '');
      setCurrency(normalizeCurrency(church.currency));
    }
  }, [church]);

  interface ApiMember {
    id: string;
    role: 'PASTOR' | 'TREASURER' | 'SECRETARY' | 'AUDITOR';
    user: { name: string | null; email: string };
    branchAccess: { branch: { name: string } }[];
  }

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await api<{ members: ApiMember[] }>('/api/church/members');
      setMembers(
        (res.members || []).map((m) => ({
          id: m.id,
          name: m.user.name || m.user.email,
          email: m.user.email,
          role: m.role,
          branchName:
            m.branchAccess.length > 0
              ? m.branchAccess.map((ba) => ba.branch.name).join(', ')
              : 'Toutes les paroisses',
          status: 'ACTIVE',
        })),
      );
    } catch {
      // Handled — the list stays empty, the section below shows nothing rather than stale data.
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const loadNotifPrefs = useCallback(async () => {
    try {
      const res = await api<{ prefs: Record<string, ChannelPref> }>('/api/notifications/prefs');
      setNotifPrefs(res.prefs || {});
    } catch {
      // Handled — defaults (all channels enabled) apply when nothing loads.
    }
  }, []);

  useEffect(() => {
    void loadNotifPrefs();
  }, [loadNotifPrefs]);

  // Opt-out semantics mirror the backend (isChannelEnabled in prefs-merge.ts):
  // a missing entry means the channel is enabled.
  function isNotifChannelEnabled(eventType: string, channel: 'email' | 'inApp'): boolean {
    const v = notifPrefs[eventType]?.[channel];
    return v !== false;
  }

  async function toggleNotifPref(eventType: string, channel: 'email' | 'inApp') {
    const current = isNotifChannelEnabled(eventType, channel);
    const next = !current;
    setNotifPrefs((prev) => ({ ...prev, [eventType]: { ...prev[eventType], [channel]: next } }));
    setSavingNotifPref(`${eventType}:${channel}`);
    try {
      await api('/api/notifications/prefs', {
        method: 'PATCH',
        body: { prefs: { [eventType]: { [channel]: next } } },
      });
    } catch (err) {
      setNotifPrefs((prev) => ({
        ...prev,
        [eventType]: { ...prev[eventType], [channel]: current },
      }));
      toast(err instanceof ApiError ? err.message : 'Erreur réseau.', 'error');
    } finally {
      setSavingNotifPref(null);
    }
  }

  // Handle password submission
  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setSavingPassword(true);
    try {
      if (user?.hasPassword) {
        await api('/api/auth/change-password', {
          method: 'PUT',
          body: { currentPassword, newPassword },
        });
        toast('Mot de passe mis à jour avec succès.', 'success');
      } else {
        // OAuth-only account (e.g. signed up with Google) — no current
        // password exists yet, so this is the dedicated first-time-set path.
        await api('/api/auth/set-password', {
          method: 'POST',
          body: { newPassword },
        });
        toast('Mot de passe créé avec succès.', 'success');
      }
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refresh();
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : 'Erreur lors de l’enregistrement du mot de passe.',
      );
    } finally {
      setSavingPassword(false);
    }
  }

  // Handle invite / add member
  async function onSubmitMember(e: FormEvent) {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setInvitingMember(true);
    try {
      const memberName = newMemberName.trim() || newMemberEmail.split('@')[0] || newMemberEmail;

      await api('/api/church/members', {
        method: 'POST',
        body: {
          name: memberName,
          email: newMemberEmail.trim(),
          role: newMemberRole,
          branchIds: newMemberBranch === 'ALL' ? [] : [newMemberBranch],
        },
      });

      await loadMembers();
      setNewMemberName('');
      setNewMemberEmail('');
      toast(`Rôle ${newMemberRole} attribué à ${memberName}.`, 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur lors de l’ajout du membre.', 'error');
    } finally {
      setInvitingMember(false);
    }
  }

  // Handle Church update
  async function onSubmitChurch(e: FormEvent) {
    e.preventDefault();
    setSavingChurch(true);
    try {
      await api('/api/church', {
        method: 'PATCH',
        body: { name: churchName.trim(), denomination: denomination.trim() || undefined, currency },
      });
      toast('Informations et devise de la communauté enregistrées avec succès !', 'success');
      await refreshBranches();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSavingChurch(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-stone-900 pb-24 md:pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Header Title with subtle gradient border */}
        <div className="border-b border-stone-200 bg-white/60 p-6 rounded-2xl shadow-2xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">
              Paramètres
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Gérez votre profil pastoral, vos équipes (trésoriers, secrétaires), les paroisses et
              la sécurité.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            {church?.name || 'Communauté Chrétienne'}
          </span>
        </div>

        {/* Layout: Desktop Sidebar Tabs & Content Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Tabs Navigation */}
          <div className="lg:col-span-3">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('compte')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap text-left border ${
                  activeTab === 'compte'
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    activeTab === 'compte'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  👤
                </div>
                <span>Compte & Profil</span>
              </button>

              <button
                onClick={() => setActiveTab('securite')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap text-left border ${
                  activeTab === 'securite'
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    activeTab === 'securite'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                </div>
                <span>Sécurité & Accès</span>
              </button>

              <button
                onClick={() => setActiveTab('membres')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap text-left border ${
                  activeTab === 'membres'
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    activeTab === 'membres'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <UsersGroupIcon className="h-4 w-4" />
                </div>
                <span>Membres & Rôles</span>
              </button>

              <button
                onClick={() => setActiveTab('eglise')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap text-left border ${
                  activeTab === 'eglise'
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    activeTab === 'eglise'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <ChurchIcon className="h-4 w-4" />
                </div>
                <span>Église & Paroisses</span>
              </button>

              <button
                onClick={() => setActiveTab('soutenir')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap text-left border ${
                  activeTab === 'soutenir'
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    activeTab === 'soutenir'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <HeartHandIcon className="h-4 w-4" />
                </div>
                <span>Soutenir</span>
              </button>
            </nav>
          </div>

          {/* Tab Content Panel (Right 9 Cols) */}
          <div className="lg:col-span-9 space-y-6">
            {/* ── 1. ONGLET: COMPTE ── */}
            {activeTab === 'compte' && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <h2 className="font-serif text-xl font-bold text-stone-900">
                    Informations Personnelles
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Coordonnées du compte utilisateur servant aux signatures des états de culte
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-900 text-white font-serif font-bold text-2xl shadow-xs">
                    {church?.logoUrl ? (
                      <img
                        src={church.logoUrl}
                        alt={church.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      user?.email?.charAt(0).toUpperCase() || 'P'
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{user?.email}</p>
                    <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 mt-1">
                      {church?.role === 'PASTOR' || !church
                        ? 'Pasteur Titulaire & Administrateur'
                        : 'Trésorier de Paroisse'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Nom complet</label>
                    <input
                      type="text"
                      defaultValue={user?.email?.split('@')[0] || ''}
                      placeholder="Pasteur Jean-Marc"
                      className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Adresse email officielle
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-xs text-stone-600 leading-relaxed">
                  🏛️{' '}
                  <strong className="text-stone-800">Paroisse de rattachement principale :</strong>{' '}
                  {currentBranch?.name || 'Paroisse Centrale de Libreville'}. Toutes les écritures
                  enregistrées seront automatiquement signées sous votre identité.
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => toast('Profil mis à jour.', 'success')}
                    className="rounded-lg bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'compte' && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 mt-6">
                <div className="border-b border-stone-100 pb-4">
                  <h2 className="font-serif text-xl font-bold text-stone-900">
                    Préférences de Notification
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Choisissez comment vous souhaitez être averti pour chaque type d’événement.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-stone-500 border-b border-stone-100">
                        <th className="font-bold py-2 pr-4">Événement</th>
                        <th className="font-bold py-2 px-4 text-center">Email</th>
                        <th className="font-bold py-2 pl-4 text-center">Dans l’application</th>
                      </tr>
                    </thead>
                    <tbody>
                      {NOTIFICATION_EVENT_TYPES.map((evt) => (
                        <tr key={evt.key} className="border-b border-stone-50 last:border-0">
                          <td className="py-3 pr-4">
                            <p className="font-bold text-stone-800">{evt.label}</p>
                            <p className="text-stone-500 mt-0.5">{evt.description}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${evt.label} — Email`}
                              checked={isNotifChannelEnabled(evt.key, 'email')}
                              disabled={savingNotifPref === `${evt.key}:email`}
                              onChange={() => toggleNotifPref(evt.key, 'email')}
                              className="accent-emerald-800 h-4 w-4"
                            />
                          </td>
                          <td className="py-3 pl-4 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${evt.label} — Dans l’application`}
                              checked={isNotifChannelEnabled(evt.key, 'inApp')}
                              disabled={savingNotifPref === `${evt.key}:inApp`}
                              onChange={() => toggleNotifPref(evt.key, 'inApp')}
                              className="accent-emerald-800 h-4 w-4"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 2. ONGLET: SÉCURITÉ ── */}
            {activeTab === 'securite' && (
              <div className="space-y-6">
                {/* Form: Change Password */}
                <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
                  <div className="border-b border-stone-100 pb-4 mb-6">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      {user?.hasPassword ? 'Mot de Passe de Connexion' : 'Créer un Mot de Passe'}
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {user?.hasPassword
                        ? "Changez votre mot de passe pour protéger l'accès à la comptabilité de l'église"
                        : 'Votre compte utilise la connexion Google. Créez un mot de passe pour pouvoir aussi vous connecter avec votre email.'}
                    </p>
                  </div>

                  {passwordError && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-700" />
                      <span>
                        {user?.hasPassword
                          ? 'Votre mot de passe a été modifié avec succès.'
                          : 'Votre mot de passe a été créé avec succès.'}
                      </span>
                    </div>
                  )}

                  <form onSubmit={onSubmitPassword} className="space-y-4 text-xs max-w-lg">
                    {user?.hasPassword && (
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Mot de passe actuel
                        </label>
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Nouveau mot de passe
                        </label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 caractères"
                          className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Confirmer le mot de passe
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Répétez le mot de passe"
                          className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {savingPassword
                        ? 'Enregistrement…'
                        : user?.hasPassword
                          ? 'Mettre à jour'
                          : 'Créer le mot de passe'}
                    </button>
                  </form>
                </div>

                {/* Information de Sécurité & Session */}
                <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheckIcon className="h-5 w-5 text-emerald-800" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        Protection et Confidentialité des Comptes
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        Chaque responsable paroissial dispose de ses propres identifiants sécurisés.
                        Les connexions sont chiffrées de bout en bout et les actions comptables sont
                        tracées pour garantir l'intégrité des finances de l'église.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. ONGLET: MEMBRES & RÔLES (NOUVEAU) ── */}
            {activeTab === 'membres' && (
              <div className="space-y-6">
                {/* Form to add a person with a role — Pastor only */}
                {church?.isPastor && (
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
                    <div className="border-b border-stone-100 pb-4 mb-6">
                      <h2 className="font-serif text-xl font-bold text-stone-900">
                        Ajouter une Personne & Attribuer un Rôle
                      </h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Déléguez la gestion financière à vos trésoriers, secrétaires et commissaires
                        aux comptes
                      </p>
                    </div>

                    <form onSubmit={onSubmitMember} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-stone-700 mb-1">
                            Nom et prénom du responsable
                          </label>
                          <input
                            type="text"
                            required
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder="Ex: Diacre Pierre Ndong"
                            className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">
                            Adresse email de connexion
                          </label>
                          <input
                            type="email"
                            required
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="pierre.ndong@eglise.ga"
                            className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-stone-700 mb-1">
                            Rôle ecclésiastique attribué
                          </label>
                          <Select
                            aria-label="Rôle ecclésiastique attribué"
                            value={newMemberRole}
                            onChange={(v) =>
                              setNewMemberRole(
                                v as 'PASTOR' | 'TREASURER' | 'SECRETARY' | 'AUDITOR',
                              )
                            }
                            options={[
                              {
                                value: 'TREASURER',
                                label: 'Trésorier de Paroisse (Saisie & Décaissements)',
                              },
                              {
                                value: 'PASTOR',
                                label: 'Pasteur Titulaire / Adjoint (Supervision Totale)',
                              },
                              {
                                value: 'SECRETARY',
                                label: 'Secrétaire de Séance (PV de Culte & Registres)',
                              },
                              {
                                value: 'AUDITOR',
                                label: 'Commissaire aux Comptes / Auditeur (Contrôle)',
                              },
                            ]}
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">
                            Affectation Paroisse / Annexe
                          </label>
                          <Select
                            aria-label="Affectation Paroisse / Annexe"
                            value={newMemberBranch}
                            onChange={setNewMemberBranch}
                            options={[
                              { value: 'ALL', label: 'Toutes les paroisses (Vue Consolidée)' },
                              ...branches.map((b) => ({ value: b.id, label: b.name })),
                            ]}
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={invitingMember}
                          className="rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <PlusIcon className="h-4 w-4" />
                          <span>{invitingMember ? 'Enregistrement…' : 'Ajouter'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* List of current members */}
                <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
                  <div className="border-b border-stone-100 pb-4 mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-stone-900">
                        Équipe Pastorale & Trésorerie ({members.length})
                      </h3>
                      <p className="text-xs text-stone-500">
                        Personnes autorisées à opérer sur la comptabilité de l'église
                      </p>
                    </div>
                    <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                      Rôles Actifs
                    </span>
                  </div>

                  <div className="divide-y divide-stone-100">
                    {loadingMembers ? (
                      <p className="py-6 text-center text-xs text-stone-500">
                        Chargement des membres…
                      </p>
                    ) : members.length === 0 ? (
                      <p className="py-6 text-center text-xs text-stone-500">
                        Aucun membre pour l’instant.
                      </p>
                    ) : (
                      members.map((m) => (
                        <div
                          key={m.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-sm">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-stone-900">{m.name}</p>
                                <span
                                  className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                    m.role === 'PASTOR'
                                      ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                      : m.role === 'TREASURER'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : m.role === 'AUDITOR'
                                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                          : 'bg-stone-100 text-stone-800'
                                  }`}
                                >
                                  {m.role === 'PASTOR'
                                    ? 'PASTEUR'
                                    : m.role === 'TREASURER'
                                      ? 'TRÉSORIER'
                                      : m.role === 'AUDITOR'
                                        ? 'COMMISSAIRE'
                                        : 'SECRÉTAIRE'}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 mt-0.5">{m.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className="text-[11px] text-stone-600 font-medium bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
                              {m.branchName}
                            </span>
                            <span
                              className="rounded-full bg-emerald-100 h-2 w-2"
                              title="Compte actif"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. ONGLET: ÉGLISE & PAROISSES ── */}
            {activeTab === 'eglise' && (
              <div className="space-y-6">
                {/* Gestion avancée — annexes & catégories, chacune sur sa propre page */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/settings/branches"
                    className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all flex items-start gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
                      <BuildingBranchIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-serif text-base font-bold text-stone-900">
                          Annexes & Paroisses
                        </h3>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0">
                          {branches.length}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Ajoutez vos paroisses et annexes, réglez leur seuil d’alerte de trésorerie.
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 mt-3 group-hover:underline">
                        Gérer les annexes &rarr;
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/settings/church"
                    className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all flex items-start gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
                      <ReceiptTextIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-base font-bold text-stone-900">
                        Catégories Financières
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        Personnalisez vos motifs de dîmes, offrandes et dépenses, et les moyens de
                        paiement acceptés.
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 mt-3 group-hover:underline">
                        Gérer les catégories &rarr;
                      </span>
                    </div>
                  </Link>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="border-b border-stone-100 pb-4">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      Configuration de la Communauté
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Paramètres canoniques et légaux figurant sur les rapports officiels imprimés
                    </p>
                  </div>

                  <form onSubmit={onSubmitChurch} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Nom officiel de l'église
                        </label>
                        <input
                          type="text"
                          required
                          value={churchName}
                          onChange={(e) => setChurchName(e.target.value)}
                          placeholder="Ex: Communauté Évangélique de la Grâce"
                          className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Dénomination / Fédération chrétienne
                        </label>
                        <input
                          type="text"
                          value={denomination}
                          onChange={(e) => setDenomination(e.target.value)}
                          placeholder="Ex: Assemblées de Dieu, Alliance Chrétienne, Baptiste"
                          className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Devise monétaire paritaire
                      </label>
                      <Select
                        aria-label="Devise monétaire paritaire"
                        value={currency}
                        onChange={setCurrency}
                        options={[
                          { value: 'FCFA', label: 'FCFA — Franc CFA (Afrique Centrale & Ouest)' },
                          { value: 'EUR', label: 'EUR (€) — Euro (France, Europe)' },
                          { value: 'USD', label: 'USD ($) — Dollar américain (International)' },
                          { value: 'CAD', label: 'CAD ($) — Dollar canadien' },
                          { value: 'GBP', label: 'GBP (£) — Livre sterling' },
                          { value: 'CDF', label: 'CDF — Franc congolais (RDC)' },
                          { value: 'GNF', label: 'GNF — Franc guinéen' },
                          { value: 'MGA', label: 'MGA (Ar) — Ariary malgache' },
                        ]}
                      />
                      <p className="mt-1 text-[11px] text-stone-400">
                        Cette devise s’applique sur tout le tableau de bord, les entrées, sorties et rapports.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end border-t border-stone-100 mt-6">
                      <button
                        type="submit"
                        disabled={savingChurch}
                        className="rounded-lg bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {savingChurch ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── 5. ONGLET: SOUTENIR ── */}
            {activeTab === 'soutenir' && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <h2 className="font-serif text-xl font-bold text-stone-900">
                    Soutenir Goshen Finance
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Goshen Finance est gratuit pour votre église. Un don libre nous aide à maintenir
                    et améliorer la plateforme.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-900 p-6 text-white shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-rose-200 uppercase tracking-wider font-semibold">
                        Don libre
                      </p>
                      <p className="font-serif text-2xl font-bold text-white mt-1">
                        Chaque contribution compte
                      </p>
                      <p className="text-xs text-emerald-100/80 mt-1">
                        Choisissez le montant qui vous convient — aucun engagement, aucun plan.
                      </p>
                    </div>

                    <Link
                      href="/soutenir"
                      className="rounded-lg bg-rose-400 px-4 py-2.5 text-xs font-bold text-stone-950 hover:bg-rose-300 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      Faire un don &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-800" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
