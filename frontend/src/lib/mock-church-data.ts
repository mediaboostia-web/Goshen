export interface MockChurchDataset {
  church: {
    id: string;
    name: string;
    denomination: string;
    currency: string;
    plan: string;
  };
  branches: Array<{
    id: string;
    name: string;
    location: string;
    isMain: boolean;
    currentBalance: number;
    lowBalanceThreshold: number;
  }>;
  summary: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpense: number;
    projectedEndBalance: number;
    reserveHealthPercent: number; // e.g. 75% above threshold
    incomeGrowth: number; // +18.4%
    expenseGrowth: number; // -4.2%
  };
  offeringsBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
    icon: string;
  }>;
  expensesBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  pendingRecurrents: Array<{
    id: string;
    name: string;
    branchName: string;
    category: string;
    amount: number;
    dueDate: string;
    urgent: boolean;
  }>;
  transactions: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    categoryName: string;
    branchName: string;
    amount: number;
    date: string;
    time: string;
    beneficiary: string | null;
    notes: string | null;
    paymentMethod: 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'CASH' | 'BANK_TRANSFER';
    receiptUrl: string | null;
    authorName: string;
  }>;
}

export const GOSHEN_MOCK_DATA: MockChurchDataset = {
  church: {
    id: 'demo-church-01',
    name: 'Communauté Évangélique de la Grâce',
    denomination: 'Alliance Chrétienne & Missionnaire',
    currency: 'FCFA',
    plan: 'PREMIUM',
  },
  branches: [
    {
      id: 'branch-centrale',
      name: 'Paroisse Centrale (Mont-Bouët)',
      location: 'Libreville, Gabon',
      isMain: true,
      currentBalance: 3450000,
      lowBalanceThreshold: 600000,
    },
    {
      id: 'branch-akanda',
      name: 'Annexe Akanda (Cap Estérias)',
      location: 'Akanda, Gabon',
      isMain: false,
      currentBalance: 980000,
      lowBalanceThreshold: 250000,
    },
    {
      id: 'branch-owendo',
      name: 'Annexe Owendo (Alénakiri)',
      location: 'Owendo, Gabon',
      isMain: false,
      currentBalance: 520000,
      lowBalanceThreshold: 150000,
    },
  ],
  summary: {
    totalBalance: 4950000,
    monthlyIncome: 5280000,
    monthlyExpense: 1840000,
    projectedEndBalance: 4235000,
    reserveHealthPercent: 82,
    incomeGrowth: 23.5,
    expenseGrowth: -6.8,
  },
  offeringsBreakdown: [
    {
      category: 'Dîmes des fidèles',
      amount: 2450000,
      percentage: 46.4,
      color: '#065f46', // Emerald 800
      icon: '✝️',
    },
    {
      category: 'Offrandes ordinaires de culte',
      amount: 1420000,
      percentage: 26.9,
      color: '#0d9488', // Teal 600
      icon: '🕊️',
    },
    {
      category: 'Dons Projet Construction Temple',
      amount: 980000,
      percentage: 18.6,
      color: '#d97706', // Amber 600
      icon: '🏛️',
    },
    {
      category: 'Aumônes & Actions Sociales',
      amount: 430000,
      percentage: 8.1,
      color: '#475569', // Slate 600
      icon: '🤝',
    },
  ],
  expensesBreakdown: [
    {
      category: 'Loyer des lieux de culte',
      amount: 750000,
      percentage: 40.8,
      color: '#b91c1c',
    },
    {
      category: 'Électricité & Eau (SEEG)',
      amount: 285000,
      percentage: 15.5,
      color: '#ea580c',
    },
    {
      category: 'Entretien Sonorisation & Instruments',
      amount: 320000,
      percentage: 17.4,
      color: '#d97706',
    },
    {
      category: 'Carburant & Évangélisation extérieure',
      amount: 260000,
      percentage: 14.1,
      color: '#475569',
    },
    {
      category: 'Soutien Diaconie & Secours Veuves',
      amount: 225000,
      percentage: 12.2,
      color: '#0284c7',
    },
  ],
  pendingRecurrents: [
    {
      id: 'rec-loyer-centrale',
      name: 'Loyer Paroisse Centrale (Bail commercial)',
      branchName: 'Paroisse Centrale',
      category: 'Loyer des lieux de culte',
      amount: 450000,
      dueDate: '2026-09-20',
      urgent: true,
    },
    {
      id: 'rec-seeg-centrale',
      name: 'Facture SEEG Électricité Éclairage Sanctuaire',
      branchName: 'Paroisse Centrale',
      category: 'Électricité & Eau (SEEG)',
      amount: 95000,
      dueDate: '2026-09-22',
      urgent: false,
    },
    {
      id: 'rec-loyer-akanda',
      name: 'Loyer Temple Annexe Akanda',
      branchName: 'Annexe Akanda',
      category: 'Loyer des lieux de culte',
      amount: 180000,
      dueDate: '2026-09-25',
      urgent: false,
    },
  ],
  transactions: [
    {
      id: 'tx-01',
      type: 'INCOME',
      categoryName: 'Dîmes des fidèles',
      branchName: 'Paroisse Centrale',
      amount: 850000,
      date: 'Hier',
      time: '12:45',
      beneficiary: 'Culte de louange & Sainte Cène',
      notes: 'Règlement global dîmes par Airtel Money et espèces post-culte',
      paymentMethod: 'AIRTEL_MONEY',
      receiptUrl:
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
      authorName: 'Pasteur Jean-Marc',
    },
    {
      id: 'tx-02',
      type: 'INCOME',
      categoryName: 'Offrandes ordinaires de culte',
      branchName: 'Annexe Akanda',
      amount: 325000,
      date: 'Hier',
      time: '12:15',
      beneficiary: 'Culte dominical matin',
      notes: 'Tronc du temple et paniers d’offrandes',
      paymentMethod: 'CASH',
      receiptUrl: null,
      authorName: 'Diacre Samuel',
    },
    {
      id: 'tx-03',
      type: 'EXPENSE',
      categoryName: 'Facture SEEG (Électricité & Eau)',
      branchName: 'Paroisse Centrale',
      amount: 95000,
      date: '12 Septembre',
      time: '15:20',
      beneficiary: 'SEEG Agence Mont-Bouët',
      notes: 'Règlement compteur édifice principal réf #984210',
      paymentMethod: 'MOOV_MONEY',
      receiptUrl:
        'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&auto=format&fit=crop&q=80',
      authorName: 'Trésorier André',
    },
    {
      id: 'tx-04',
      type: 'INCOME',
      categoryName: 'Dons Projet Construction Temple',
      branchName: 'Paroisse Centrale',
      amount: 500000,
      date: '11 Septembre',
      time: '16:00',
      beneficiary: 'Famille Mba Ndong',
      notes: 'Engagement souscription 100 sacs de ciment extension galerie',
      paymentMethod: 'BANK_TRANSFER',
      receiptUrl: null,
      authorName: 'Pasteur Jean-Marc',
    },
    {
      id: 'tx-05',
      type: 'EXPENSE',
      categoryName: 'Entretien Sonorisation & Instruments',
      branchName: 'Annexe Owendo',
      amount: 75000,
      date: '10 Septembre',
      time: '11:10',
      beneficiary: 'Atelier Audio Libreville',
      notes: 'Réparation 2 micros sans fil Shure et câblage table de mixage',
      paymentMethod: 'CASH',
      receiptUrl:
        'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80',
      authorName: 'Responsable Louange',
    },
    {
      id: 'tx-06',
      type: 'INCOME',
      categoryName: 'Aumônes & Actions Sociales',
      branchName: 'Paroisse Centrale',
      amount: 180000,
      date: '08 Septembre',
      time: '14:30',
      beneficiary: 'Commission Diaconale',
      notes: 'Offrande spéciale soutien rentrée scolaire orphelins',
      paymentMethod: 'AIRTEL_MONEY',
      receiptUrl: null,
      authorName: 'Sœur Christine',
    },
    {
      id: 'tx-07',
      type: 'EXPENSE',
      categoryName: 'Loyer des lieux de culte',
      branchName: 'Annexe Akanda',
      amount: 180000,
      date: '05 Septembre',
      time: '09:00',
      beneficiary: 'Bailleur M. Ondo',
      notes: 'Quittance mois de septembre 2026',
      paymentMethod: 'AIRTEL_MONEY',
      receiptUrl:
        'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80',
      authorName: 'Trésorier André',
    },
    {
      id: 'tx-08',
      type: 'INCOME',
      categoryName: 'Dîmes des fidèles',
      branchName: 'Annexe Owendo',
      amount: 220000,
      date: '05 Septembre',
      time: '12:00',
      beneficiary: 'Culte 1er dimanche du mois',
      notes: 'Dîmes assemblée locale',
      paymentMethod: 'CASH',
      receiptUrl: null,
      authorName: 'Pasteur Associé',
    },
  ],
};
