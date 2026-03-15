import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Wallet, CreditCard, ArrowRightLeft, Bot, Menu, X } from 'lucide-react';
import { FinancialState, ViewState, LiabilityStatus } from './types';
import { saveState, subscribeToState, DEFAULT_STATE } from './services/storageService';
import Dashboard from './components/Dashboard';
import AssetsManager from './components/AssetsManager';
import LiabilitiesManager from './components/LiabilitiesManager';
import TransactionsManager from './components/TransactionsManager';
import AiAdvisor from './components/AiAdvisor';

const App: React.FC = () => {
  const [state, setState] = useState<FinancialState>(DEFAULT_STATE);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedAutoReduce = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToState((data) => {
      setState(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-reduce installments for every missed month since last reduction
  useEffect(() => {
    if (isLoading || hasCheckedAutoReduce.current) return;
    hasCheckedAutoReduce.current = true;

    const today = new Date();
    const currentDay = today.getDate();
    const reduceDay = state.settings?.debtReduceDay ?? 10;
    const lastReduced = state.settings?.lastReducedMonth ?? '';

    // Calculate how many months need to be reduced
    const countPendingMonths = (): number => {
      if (!lastReduced) {
        // Never reduced — reduce current month only if day has passed
        return currentDay >= reduceDay ? 1 : 0;
      }

      const [lastYear, lastMonth] = lastReduced.split('-').map(Number);
      const lastReducedDate = new Date(lastYear, lastMonth - 1, reduceDay);
      const nextReduceDate = new Date(lastReducedDate);
      nextReduceDate.setMonth(nextReduceDate.getMonth() + 1);

      let count = 0;
      const cursor = new Date(nextReduceDate);
      while (cursor <= today) {
        // Only count if the reduceDay of that month has passed
        const reduceThisMonth = new Date(cursor.getFullYear(), cursor.getMonth(), reduceDay);
        if (reduceThisMonth <= today) count++;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return count;
    };

    const months = countPendingMonths();
    if (months <= 0) return;

    // Apply N amortization cycles per liability
    const updatedLiabilities = state.liabilities.map(liability => {
      if (liability.status !== LiabilityStatus.ACTIVE || liability.installmentsCount <= 0) {
        return liability;
      }
      let { totalValue, installmentsCount } = liability;
      const cycles = Math.min(months, installmentsCount);
      for (let i = 0; i < cycles; i++) {
        const interest = totalValue * (liability.interestRate / 100);
        const principal = Math.max(0, liability.installmentValue - interest);
        totalValue = Math.max(0, totalValue - principal);
        installmentsCount -= 1;
        if (installmentsCount <= 0) break;
      }
      return {
        ...liability,
        totalValue: parseFloat(totalValue.toFixed(2)),
        installmentsCount,
        status: installmentsCount <= 0 ? LiabilityStatus.PAID : LiabilityStatus.ACTIVE,
      };
    });

    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const updatedSettings = { ...state.settings, lastReducedMonth: currentMonth };
    const updated = { ...state, liabilities: updatedLiabilities, settings: updatedSettings };
    setState(updated);
    saveState(updated);
    console.log(`[AutoReduce] ${months} mês(es) de parcelas reduzidos. Atualizado até ${currentMonth}`);
  }, [isLoading]);

  const updateState = (newState: Partial<FinancialState>) => {
    const updated = { ...state, ...newState };
    setState(updated);
    saveState(updated);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        currentView === view
          ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            FinHealth Pro
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem view="ASSETS" icon={Wallet} label="Ativos & Bens" />
          <NavItem view="LIABILITIES" icon={CreditCard} label="Dívidas & Passivos" />
          <NavItem view="CASHFLOW" icon={ArrowRightLeft} label="Receitas & Despesas" />
          <NavItem view="ADVISOR" icon={Bot} label="Consultor IA" />
        </nav>
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">v2.0.0 - Firebase</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed w-full bg-white z-20 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          FinHealth Pro
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-10 bg-white pt-16 px-4">
          <nav className="space-y-2">
            <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
            <NavItem view="ASSETS" icon={Wallet} label="Ativos & Bens" />
            <NavItem view="LIABILITIES" icon={CreditCard} label="Dívidas & Passivos" />
            <NavItem view="CASHFLOW" icon={ArrowRightLeft} label="Receitas & Despesas" />
            <NavItem view="ADVISOR" icon={Bot} label="Consultor IA" />
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {currentView === 'DASHBOARD' && <Dashboard state={state} />}
          {currentView === 'ASSETS' && (
            <AssetsManager
              assets={state.assets}
              onUpdate={(assets) => updateState({ assets })}
            />
          )}
          {currentView === 'LIABILITIES' && (
            <LiabilitiesManager
              liabilities={state.liabilities}
              settings={state.settings}
              onUpdate={(liabilities) => updateState({ liabilities })}
              onSettingsUpdate={(settings) => updateState({ settings })}
            />
          )}
          {currentView === 'CASHFLOW' && (
            <TransactionsManager
              transactions={state.transactions}
              assets={state.assets}
              onUpdate={(transactions) => updateState({ transactions })}
            />
          )}
          {currentView === 'ADVISOR' && <AiAdvisor state={state} />}
        </div>
      </main>
    </div>
  );
};

export default App;
