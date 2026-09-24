'use client';

import { useState, type FormEvent, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
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

const NOTIFICATION_EVENT_TYPES: { key: string; labelKey: string; descKey: string }[] = [
  {
    key: 'low_balance',
    labelKey: 'settings.notif.low_balance_label',
    descKey: 'settings.notif.low_balance_desc',
  },
  {
    key: 'recurring_expense_due',
    labelKey: 'settings.notif.recurring_due_label',
    descKey: 'settings.notif.recurring_due_desc',
  },
  {
    key: 'recurrent_expense_pending',
    labelKey: 'settings.notif.recurring_pending_label',
    descKey: 'settings.notif.recurring_pending_desc',
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
  const { t } = useLanguage();

  const tabParam = searchParams?.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || 'compte');

  // ── FORM STATES ─────────────────────────────────────────────────────
  // Tab: Compte (Nom complet)
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setFullName(user.name || '');
  }, [user]);

  async function handleSaveProfile() {
    setProfileError(null);
    const trimmed = fullName.trim();
    if (!trimmed) {
      setProfileError(t('settings.account.name_required_error'));
      return;
    }
    setSavingProfile(true);
    try {
      await api('/api/auth/me', { method: 'PATCH', body: { name: trimmed } });
      await refresh();
      toast(t('settings.account.profile_updated_toast'), 'success');
    } catch (err) {
      setProfileError(
        err instanceof ApiError
          ? err.message || t('settings.account.unknown_error')
          : t('settings.account.network_error'),
      );
    } finally {
      setSavingProfile(false);
    }
  }

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
              : t('settings.members.all_parishes_label'),
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
      setPasswordError(t('settings.security.min_length_error'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.security.mismatch_error'));
      return;
    }

    setSavingPassword(true);
    try {
      if (user?.hasPassword) {
        await api('/api/auth/change-password', {
          method: 'PUT',
          body: { currentPassword, newPassword },
        });
        toast(t('settings.security.toast_password_updated'), 'success');
      } else {
        // OAuth-only account (e.g. signed up with Google) — no current
        // password exists yet, so this is the dedicated first-time-set path.
        await api('/api/auth/set-password', {
          method: 'POST',
          body: { newPassword },
        });
        toast(t('settings.security.toast_password_created'), 'success');
      }
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refresh();
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : t('settings.security.save_error'));
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
      toast(t('settings.members.toast_added'), 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('settings.members.add_error'), 'error');
    } finally {
      setInvitingMember(false);
    }
  }

  // Handle Church update
  async function onSubmitChurch(e: FormEvent) {
    e.preventDefault();
    setSavingChurch(true);
    try {
      const res = await api<{
        church: Record<string, unknown>;
        converted?: boolean;
        previousCurrency?: string;
      }>('/api/church', {
        method: 'PATCH',
        body: { name: churchName.trim(), denomination: denomination.trim() || undefined, currency },
      });
      if (res?.converted) {
        toast(
          `${t('settings.church.conversion_success_prefix')} (${res.previousCurrency} ➔ ${currency})! ${t('settings.church.conversion_success_suffix')}`,
          'success',
        );
      } else {
        toast(t('settings.church.save_success_toast'), 'success');
      }
      await refreshBranches();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('settings.church.save_error'), 'error');
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
              {t('settings.title')}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">{t('settings.subtitle')}</p>
          </div>
          <span className="self-start sm:self-auto rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            {church?.name || t('settings.default_church_badge')}
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
                <span>{t('settings.tab.account')}</span>
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
                <span>{t('settings.tab.security')}</span>
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
                <span>{t('settings.tab.members')}</span>
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
                <span>{t('settings.tab.church')}</span>
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
                <span>{t('settings.tab.support')}</span>
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
                    {t('settings.account.personal_info_title')}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {t('settings.account.personal_info_desc')}
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
                        ? t('settings.account.role_pastor')
                        : t('settings.account.role_treasurer')}
                    </span>
                  </div>
                </div>

                {profileError && (
                  <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                    {profileError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('settings.account.full_name_label')}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Pasteur Jean-Marc"
                      className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t('settings.account.email_label')}
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
                  <strong className="text-stone-800">
                    {t('settings.account.branch_note_prefix')}
                  </strong>{' '}
                  {currentBranch?.name || t('settings.account.default_branch')}.{' '}
                  {t('settings.account.branch_note_suffix')}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    disabled={savingProfile}
                    className="rounded-lg bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {savingProfile ? t('settings.account.saving') : t('settings.account.save')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'compte' && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 mt-6">
                <div className="border-b border-stone-100 pb-4">
                  <h2 className="font-serif text-xl font-bold text-stone-900">
                    {t('settings.notif.title')}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">{t('settings.notif.desc')}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-stone-500 border-b border-stone-100">
                        <th className="font-bold py-2 pr-4">{t('settings.notif.col_event')}</th>
                        <th className="font-bold py-2 px-4 text-center">
                          {t('settings.notif.col_email')}
                        </th>
                        <th className="font-bold py-2 pl-4 text-center">
                          {t('settings.notif.col_inapp')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {NOTIFICATION_EVENT_TYPES.map((evt) => {
                        const label = t(evt.labelKey);
                        return (
                          <tr key={evt.key} className="border-b border-stone-50 last:border-0">
                            <td className="py-3 pr-4">
                              <p className="font-bold text-stone-800">{label}</p>
                              <p className="text-stone-500 mt-0.5">{t(evt.descKey)}</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${label} — ${t('settings.notif.col_email')}`}
                                checked={isNotifChannelEnabled(evt.key, 'email')}
                                disabled={savingNotifPref === `${evt.key}:email`}
                                onChange={() => toggleNotifPref(evt.key, 'email')}
                                className="accent-emerald-800 h-4 w-4"
                              />
                            </td>
                            <td className="py-3 pl-4 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${label} — ${t('settings.notif.col_inapp')}`}
                                checked={isNotifChannelEnabled(evt.key, 'inApp')}
                                disabled={savingNotifPref === `${evt.key}:inApp`}
                                onChange={() => toggleNotifPref(evt.key, 'inApp')}
                                className="accent-emerald-800 h-4 w-4"
                              />
                            </td>
                          </tr>
                        );
                      })}
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
                      {user?.hasPassword
                        ? t('settings.security.password_title_change')
                        : t('settings.security.password_title_create')}
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {user?.hasPassword
                        ? t('settings.security.password_desc_change')
                        : t('settings.security.password_desc_create')}
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
                          ? t('settings.security.password_updated')
                          : t('settings.security.password_created')}
                      </span>
                    </div>
                  )}

                  <form onSubmit={onSubmitPassword} className="space-y-4 text-xs max-w-lg">
                    {user?.hasPassword && (
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          {t('settings.security.current_password_label')}
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
                          {t('settings.security.new_password_label')}
                        </label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('settings.security.new_password_placeholder')}
                          className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          {t('settings.security.confirm_password_label')}
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('settings.security.confirm_password_placeholder')}
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
                        ? t('settings.account.saving')
                        : user?.hasPassword
                          ? t('settings.security.update_button')
                          : t('settings.security.create_button')}
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
                        {t('settings.security.protection_title')}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {t('settings.security.protection_desc')}
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
                        {t('settings.members.add_title')}
                      </h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {t('settings.members.add_desc')}
                      </p>
                    </div>

                    <form onSubmit={onSubmitMember} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-stone-700 mb-1">
                            {t('settings.members.name_label')}
                          </label>
                          <input
                            type="text"
                            required
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder={t('settings.members.name_placeholder')}
                            className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 focus:outline-hidden transition-all"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">
                            {t('settings.members.email_label')}
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
                            {t('settings.members.role_label')}
                          </label>
                          <Select
                            aria-label={t('settings.members.role_label')}
                            value={newMemberRole}
                            onChange={(v) =>
                              setNewMemberRole(
                                v as 'PASTOR' | 'TREASURER' | 'SECRETARY' | 'AUDITOR',
                              )
                            }
                            options={[
                              {
                                value: 'TREASURER',
                                label: t('settings.members.role_treasurer'),
                              },
                              {
                                value: 'PASTOR',
                                label: t('settings.members.role_pastor'),
                              },
                              {
                                value: 'SECRETARY',
                                label: t('settings.members.role_secretary'),
                              },
                              {
                                value: 'AUDITOR',
                                label: t('settings.members.role_auditor'),
                              },
                            ]}
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">
                            {t('settings.members.branch_assignment_label')}
                          </label>
                          <Select
                            aria-label={t('settings.members.branch_assignment_label')}
                            value={newMemberBranch}
                            onChange={setNewMemberBranch}
                            options={[
                              { value: 'ALL', label: t('settings.members.all_branches') },
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
                          <span>
                            {invitingMember
                              ? t('settings.members.saving')
                              : t('settings.members.add_button')}
                          </span>
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
                        {t('settings.members.team_title')} ({members.length})
                      </h3>
                      <p className="text-xs text-stone-500">{t('settings.members.team_desc')}</p>
                    </div>
                    <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                      {t('settings.members.active_roles_badge')}
                    </span>
                  </div>

                  <div className="divide-y divide-stone-100">
                    {loadingMembers ? (
                      <p className="py-6 text-center text-xs text-stone-500">
                        {t('settings.members.loading')}
                      </p>
                    ) : members.length === 0 ? (
                      <p className="py-6 text-center text-xs text-stone-500">
                        {t('settings.members.empty')}
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
                                    ? t('settings.members.role_pastor_badge')
                                    : m.role === 'TREASURER'
                                      ? t('settings.members.role_treasurer_badge')
                                      : m.role === 'AUDITOR'
                                        ? t('settings.members.role_auditor_badge')
                                        : t('settings.members.role_secretary_badge')}
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
                              title={t('settings.members.active_account_title')}
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
                          {t('settings.church.branches_title')}
                        </h3>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0">
                          {branches.length}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        {t('settings.church.branches_desc')}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 mt-3 group-hover:underline">
                        {t('settings.church.manage_branches')} &rarr;
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
                        {t('settings.church.categories_title')}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        {t('settings.church.categories_desc')}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 mt-3 group-hover:underline">
                        {t('settings.church.manage_categories')} &rarr;
                      </span>
                    </div>
                  </Link>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="border-b border-stone-100 pb-4">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      {t('settings.church.config_title')}
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {t('settings.church.config_desc')}
                    </p>
                  </div>

                  <form onSubmit={onSubmitChurch} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          {t('settings.church.name_label')}
                        </label>
                        <input
                          type="text"
                          required
                          value={churchName}
                          onChange={(e) => setChurchName(e.target.value)}
                          placeholder={t('settings.church.name_placeholder')}
                          className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          {t('settings.church.denomination_label')}
                        </label>
                        <input
                          type="text"
                          value={denomination}
                          onChange={(e) => setDenomination(e.target.value)}
                          placeholder={t('settings.church.denomination_placeholder')}
                          className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        {t('settings.church.currency_label')}
                      </label>
                      <Select
                        aria-label={t('settings.church.currency_label')}
                        value={currency}
                        onChange={setCurrency}
                        options={[
                          { value: 'FCFA', label: t('settings.church.currency_fcfa') },
                          { value: 'EUR', label: t('settings.church.currency_eur') },
                          { value: 'USD', label: t('settings.church.currency_usd') },
                          { value: 'CAD', label: t('settings.church.currency_cad') },
                          { value: 'GBP', label: t('settings.church.currency_gbp') },
                          { value: 'CDF', label: t('settings.church.currency_cdf') },
                          { value: 'GNF', label: t('settings.church.currency_gnf') },
                          { value: 'MGA', label: t('settings.church.currency_mga') },
                        ]}
                      />
                      <p className="mt-1 text-[11px] text-stone-400">
                        {t('settings.church.currency_note')}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end border-t border-stone-100 mt-6">
                      <button
                        type="submit"
                        disabled={savingChurch}
                        className="rounded-lg bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {savingChurch ? t('settings.church.saving') : t('settings.church.save')}
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
                    {t('settings.support.title')}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">{t('settings.support.desc')}</p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-900 p-6 text-white shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-rose-200 uppercase tracking-wider font-semibold">
                        {t('settings.support.free_donation_label')}
                      </p>
                      <p className="font-serif text-2xl font-bold text-white mt-1">
                        {t('settings.support.every_contribution')}
                      </p>
                      <p className="text-xs text-emerald-100/80 mt-1">
                        {t('settings.support.choose_amount')}
                      </p>
                    </div>

                    <Link
                      href="/soutenir"
                      className="rounded-lg bg-rose-400 px-4 py-2.5 text-xs font-bold text-stone-950 hover:bg-rose-300 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      {t('settings.support.donate_button')} &rarr;
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
