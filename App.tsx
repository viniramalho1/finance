import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Wallet, CreditCard, ArrowRightLeft, Bot,
  Menu, X, Calculator, History, CalendarDays, TrendingUp
} from 'lucide-react';
import { FinancialState, ViewState, LiabilityStatus } from './types';
import { saveState, subscribeToState, DEFAULT_STATE } from './services/storageService';
import Dashboard from './components/Dashboard';
import AssetsManager from './components/AssetsManager';
import LiabilitiesManager from './components/LiabilitiesManager';
import TransactionsManager from './components/TransactionsManager';
import AiAdvisor from './components/AiAdvisor';
import PlanningTools from './components/PlanningTools';
import WealthHistory from './components/WealthHistory';
import FinancialCalendar from './components/FinancialCalendar';

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

    const countPendingMonths = (): number => {
      if (!lastReduced) {
        return currentDay >= reduceDay ? 1 : 0;
      }
      const [lastYear, lastMonth] = lastReduced.split('-').map(Number);
      const lastReducedDate = new Date(lastYear, lastMonth - 1, reduceDay);
      const nextReduceDate = new Date(lastReducedDate);
      nextReduceDate.setMonth(nextReduceDate.getMonth() + 1);
      let count = 0;
      const cursor = new Date(nextReduceDate);
      while (cursor <= today) {
        const reduceThisMonth = new Date(cursor.getFullYear(), cursor.getMonth(), reduceDay);
        if (reduceThisMonth <= today) count++;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return count;
    };

    const months = countPendingMonths();
    if (months <= 0) return;

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
  }, [isLoading]);

  // Save monthly wealth snapshot
  useEffect(() => {
    if (isLoading) return;
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const alreadySaved = (state.wealthHistory || []).some(s => s.month === currentMonth);
    if (alreadySaved) return;

    const totalAssets = state.assets.reduce((s, a) => s + a.currentValue, 0);
    const totalLiabilities = state.liabilities
      .filter(l => l.status === LiabilityStatus.ACTIVE)
      .reduce((s, l) => s + l.totalValue, 0);
    const snapshot = { month: currentMonth, netWorth: totalAssets - totalLiabilities, totalAssets, totalLiabilities };
    const updated = { ...state, wealthHistory: [...(state.wealthHistory || []), snapshot] };
    setState(updated);
    saveState(updated);
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
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium ${
        currentView === view
          ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
          : 'text-slate-500 hover:bg-[#1a2640] hover:text-slate-300'
      }`}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b11]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1e2d40] border-t-[#00d4aa] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm tracking-wide">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#070b11]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0d1526] border-r border-[#1a2640] fixed h-full z-10">
        <div className="p-5 border-b border-[#1a2640]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00d4aa, #0099cc)' }}>
              <TrendingUp size={15} color="#070b11" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
                Fin<span style={{ color: '#00d4aa' }}>Health</span>
              </h1>
              <p className="text-[10px] text-slate-600 mt-0.5 tracking-widest uppercase">Pro</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-4 text-[9px] font-semibold text-slate-600 uppercase tracking-[0.15em] mb-2 mt-1">Principal</p>
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem view="ASSETS" icon={Wallet} label="Ativos & Bens" />
          <NavItem view="LIABILITIES" icon={CreditCard} label="Dívidas & Passivos" />
          <NavItem view="CASHFLOW" icon={ArrowRightLeft} label="Receitas & Despesas" />
          <NavItem view="ADVISOR" icon={Bot} label="Consultor IA" />
          <p className="px-4 text-[9px] font-semibold text-slate-600 uppercase tracking-[0.15em] mb-2 mt-5">Ferramentas</p>
          <NavItem view="PLANNING" icon={Calculator} label="Planejamento" />
          <NavItem view="HISTORY" icon={History} label="Histórico" />
          <NavItem view="CALENDAR" icon={CalendarDays} label="Calendário" />
        </nav>

        <div className="p-4 border-t border-[#1a2640]">
          <p className="text-[10px] text-slate-600 text-center tracking-widest">v2.0.0 · Firebase</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed w-full bg-[#0d1526] z-20 border-b border-[#1a2640] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00d4aa, #0099cc)' }}>
            <TrendingUp size={13} color="#070b11" strokeWidth={2.5} />
          </div>
          <h1 className="text-base font-bold text-slate-100 tracking-tight">
            Fin<span style={{ color: '#00d4aa' }}>Health</span>
          </h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-10 bg-[#0d1526] pt-16 px-3 overflow-y-auto">
          <nav className="space-y-0.5 py-4">
            <p className="px-4 text-[9px] font-semibold text-slate-600 uppercase tracking-[0.15em] mb-2">Principal</p>
            <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
            <NavItem view="ASSETS" icon={Wallet} label="Ativos & Bens" />
            <NavItem view="LIABILITIES" icon={CreditCard} label="Dívidas & Passivos" />
            <NavItem view="CASHFLOW" icon={ArrowRightLeft} label="Receitas & Despesas" />
            <NavItem view="ADVISOR" icon={Bot} label="Consultor IA" />
            <p className="px-4 text-[9px] font-semibold text-slate-600 uppercase tracking-[0.15em] mb-2 mt-5">Ferramentas</p>
            <NavItem view="PLANNING" icon={Calculator} label="Planejamento" />
            <NavItem view="HISTORY" icon={History} label="Histórico" />
            <NavItem view="CALENDAR" icon={CalendarDays} label="Calendário" />
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto min-h-screen">
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
          {currentView === 'PLANNING' && <PlanningTools state={state} />}
          {currentView === 'HISTORY' && <WealthHistory state={state} />}
          {currentView === 'CALENDAR' && <FinancialCalendar state={state} />}
        </div>
      </main>
    </div>
  );
};

export default App;
