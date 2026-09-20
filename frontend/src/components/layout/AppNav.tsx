'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  WalletIcon,
  CoinsHandIcon,
  ReceiptTextIcon,
  LightningBoltIcon,
  DocumentReportIcon,
} from '@/components/icons/ChurchIcons';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems: NavItem[] = [
    { label: t('nav.dashboard', 'Tableau de bord'), href: '/dashboard', icon: WalletIcon },
    { label: t('nav.incomes', 'Entrées'), href: '/transactions/incomes', icon: CoinsHandIcon },
    { label: t('nav.expenses', 'Dépenses'), href: '/transactions/expenses', icon: ReceiptTextIcon },
    {
      label: t('nav.recurrent', 'Charges fixes'),
      href: '/recurrent-expenses',
      icon: LightningBoltIcon,
    },
    { label: t('nav.reports', 'Rapports PDF'), href: '/reports', icon: DocumentReportIcon },
  ];

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Hide navbar when scrolling down past 60px, reveal when scrolling up
          if (currentScrollY > 60) {
            if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 4) {
              setIsVisible(false);
            } else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 4) {
              setIsVisible(true);
            }
          } else {
            setIsVisible(true);
          }
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Desktop Navigation Bar - Centered with smart scroll reveal */}
      <nav
        className={`sticky top-[61px] z-30 hidden border-b border-stone-200 bg-white/95 backdrop-blur-none transition-transform duration-300 md:block ${
          isVisible ? 'translate-y-0' : '-translate-y-full md:-translate-y-[130%]'
        }`}
      >
        <div className="mx-auto flex max-w-7xl justify-center gap-1 lg:gap-2 px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold tracking-wide transition-colors ${
                  isActive
                    ? 'border-emerald-800 text-emerald-950 font-bold'
                    : 'border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-emerald-800' : 'text-stone-400 group-hover:text-stone-600'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar - always fixed, never hides on scroll */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white md:hidden">
        <div className="grid grid-cols-5 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-emerald-800 font-bold' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Icon
                  className={`h-5 w-5 mb-0.5 ${isActive ? 'text-emerald-800' : 'text-stone-400'}`}
                />
                <span className="truncate max-w-[58px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
