/**
 * Internationalization dictionaries for Goshen.
 * Supports French (FR - default) and English (EN).
 */

export type Locale = 'fr' | 'en';

export const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.incomes': 'Entrées',
    'nav.expenses': 'Dépenses',
    'nav.recurrent': 'Charges fixes',
    'nav.reports': 'Rapports PDF',
    'nav.settings': 'Paramètres',
    'nav.support': 'Soutenir',
    'nav.logout': 'Déconnexion',

    // Header
    'header.search_placeholder': 'Rechercher une écriture, reçu, quête, membre... (⌘K)',
    'header.branch': 'Annexe :',
    'header.consolidated': 'Vue consolidée (Toutes)',
    'header.notifications': 'Centre de notifications',
    'header.account_menu': 'Menu du compte & Déconnexion',
    'header.settings': 'Paramètres',
    'header.logout_confirm_title': 'Se déconnecter ?',
    'header.logout_confirm_desc':
      'Vous devrez ressaisir votre email et votre mot de passe pour accéder de nouveau à votre espace.',
    'header.cancel': 'Annuler',

    // Dashboard Hero & Quick Actions
    'dashboard.welcome': 'Bienvenue sur Goshen',
    'dashboard.available_balance': 'Solde net disponible',
    'dashboard.incomes_this_month': 'Entrées de fonds',
    'dashboard.expenses_this_month': 'Décaissements effectués',
    'dashboard.pending_charges': 'Charges fixes en attente',
    'dashboard.action.new_income': 'Nouvelle Entrée',
    'dashboard.action.new_expense': 'Nouvelle Sortie',
    'dashboard.action.recurrent': 'Charges Fixes',
    'dashboard.action.report_a4': 'Rapport A4',
    'dashboard.action.invoice_pdf': 'Bilan & Reçu',
    'dashboard.filter.month': 'Ce mois',
    'dashboard.filter.quarter': 'Ce trimestre',
    'dashboard.filter.year': 'Cette année',
    'dashboard.filter.all': 'Tout',
    'dashboard.pending_validation_title': 'Charges Fixes à Valider',
    'dashboard.pending_validation_desc': 'Loyer du temple, factures d’énergie et charges',
    'dashboard.validate': 'Valider',
    'dashboard.postpone': 'Reporter',
    'dashboard.no_pending': 'Aucune charge en attente de validation',

    // Currency & Alerts
    'currency.converted_toast': 'Devise modifiée avec succès !',
    'balance.approaching_threshold': 'Alerte : Le solde approche du seuil de sécurité configuré.',
    'balance.under_threshold': 'Attention : Le solde est inférieur au seuil minimum configuré.',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.incomes': 'Incomes',
    'nav.expenses': 'Expenses',
    'nav.recurrent': 'Fixed Charges',
    'nav.reports': 'PDF Reports',
    'nav.settings': 'Settings',
    'nav.support': 'Support Goshen',
    'nav.logout': 'Sign Out',

    // Header
    'header.search_placeholder': 'Search entry, receipt, offering, member... (⌘K)',
    'header.branch': 'Branch:',
    'header.consolidated': 'Consolidated View (All)',
    'header.notifications': 'Notification Center',
    'header.account_menu': 'Account Menu & Sign Out',
    'header.settings': 'Settings',
    'header.logout_confirm_title': 'Sign out?',
    'header.logout_confirm_desc':
      'You will need to re-enter your email and password to access your church workspace again.',
    'header.cancel': 'Cancel',

    // Dashboard Hero & Quick Actions
    'dashboard.welcome': 'Welcome to Goshen',
    'dashboard.available_balance': 'Available Net Balance',
    'dashboard.incomes_this_month': 'Total Incomes',
    'dashboard.expenses_this_month': 'Total Disbursements',
    'dashboard.pending_charges': 'Pending Fixed Charges',
    'dashboard.action.new_income': 'New Income',
    'dashboard.action.new_expense': 'New Expense',
    'dashboard.action.recurrent': 'Fixed Charges',
    'dashboard.action.report_a4': 'A4 Report',
    'dashboard.action.invoice_pdf': 'Summary & Receipt',
    'dashboard.filter.month': 'This Month',
    'dashboard.filter.quarter': 'This Quarter',
    'dashboard.filter.year': 'This Year',
    'dashboard.filter.all': 'All',
    'dashboard.pending_validation_title': 'Fixed Charges to Validate',
    'dashboard.pending_validation_desc': 'Sanctuary rent, utility bills and scheduled expenses',
    'dashboard.validate': 'Validate',
    'dashboard.postpone': 'Postpone',
    'dashboard.no_pending': 'No charges pending validation',

    // Currency & Alerts
    'currency.converted_toast': 'Currency converted successfully!',
    'balance.approaching_threshold': 'Alert: Balance is approaching the safety threshold.',
    'balance.under_threshold': 'Warning: Balance has dropped below the configured threshold.',
  },
};
