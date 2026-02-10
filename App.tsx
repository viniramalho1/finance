import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, CreditCard, ArrowRightLeft, Bot, Menu, X } from 'lucide-react';
import { FinancialState, ViewState } from './types';
import { loadState, saveState } from './services/storageService';
import Dashboard from './components/Dashboard';
import AssetsManager from './components/AssetsManager';
import LiabilitiesManager from './components/LiabilitiesManager';
import TransactionsManager from './components/TransactionsManager';
import AiAdvisor from './components/AiAdvisor';

const App: React.FC = () => {
  const [state, setState] = useState<FinancialState>(loadState());
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = (newState: Partial<FinancialState>) => {
    setState(prev => ({ ...prev, ...newState }));
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
          <p className="text-xs text-slate-400 text-center">v1.0.0 - Dados locais</p>
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
          {currentView === 'ASSETS' && <AssetsManager assets={state.assets} onUpdate={(assets) => updateState({ assets })} />}
          {currentView === 'LIABILITIES' && <LiabilitiesManager liabilities={state.liabilities} onUpdate={(liabilities) => updateState({ liabilities })} />}
          {currentView === 'CASHFLOW' && <TransactionsManager transactions={state.transactions} assets={state.assets} onUpdate={(transactions) => updateState({ transactions })} />}
          {currentView === 'ADVISOR' && <AiAdvisor state={state} />}
        </div>
      </main>
    </div>
  );
};

export default App;