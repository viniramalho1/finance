import React from 'react';
import { FinancialState, TransactionType, LiabilityStatus } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, Landmark, Coins, PiggyBank,
  Shield, Target, Percent
} from 'lucide-react';

interface DashboardProps {
  state: FinancialState;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

// Wealth growth simulation over N months
const projectWealth = (state: FinancialState, months = 24) => {
  const monthlyActiveIncome = state.transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = state.transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalAssetsInit = state.assets.reduce((s, a) => s + a.currentValue, 0);
  const totalYield = state.assets.reduce((s, a) => s + a.currentValue * (a.monthlyYield || 0) / 100, 0);
  const avgYieldRate = totalAssetsInit > 0 ? totalYield / totalAssetsInit : 0; // fraction per month

  let totalAssets = totalAssetsInit;
  let activeLiabilities = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .map(l => ({ ...l }));

  const points = [];

  for (let i = 0; i <= months; i++) {
    const totalLiab = activeLiabilities.reduce((s, l) => s + l.totalValue, 0);
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const label = i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    points.push({
      label,
      patrimônio: Math.round(totalAssets - totalLiab),
      ativos: Math.round(totalAssets),
      dívidas: Math.round(totalLiab),
    });

    if (i < months) {
      // Assets grow by yield
      totalAssets *= (1 + avgYieldRate);

      // Monthly savings (active income - expenses - installments)
      const monthlyInstallments = activeLiabilities.reduce((s, l) => s + l.installmentValue, 0);
      const savings = monthlyActiveIncome - monthlyExpenses - monthlyInstallments;
      totalAssets = Math.max(0, totalAssets + savings);

      // Amortize liabilities (Price system)
      activeLiabilities = activeLiabilities
        .map(l => {
          if (l.installmentsCount <= 0) return l;
          const interest = l.totalValue * (l.interestRate / 100);
          const principal = Math.max(0, l.installmentValue - interest);
          return {
            ...l,
            totalValue: Math.max(0, l.totalValue - principal),
            installmentsCount: l.installmentsCount - 1,
          };
        })
        .filter(l => l.installmentsCount > 0 && l.totalValue > 0);
    }
  }

  return points;
};

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const totalAssets = state.assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLiabilities = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .reduce((sum, l) => sum + l.totalValue, 0);
  const netWorth = totalAssets - totalLiabilities;

  const monthlyActiveIncome = state.transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyPassiveIncome = state.assets.reduce((sum, asset) => {
    return sum + (asset.currentValue * ((asset.monthlyYield || 0) / 100));
  }, 0);

  const monthlyExpenses = state.transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyInstallments = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .reduce((sum, l) => sum + l.installmentValue, 0);

  const totalMonthlyIncome = monthlyActiveIncome + monthlyPassiveIncome;
  const totalMonthlyOutflow = monthlyExpenses + monthlyInstallments;
  const monthlyBalance = totalMonthlyIncome - totalMonthlyOutflow;

  // Health indicators
  const comprometimento = totalMonthlyIncome > 0 ? (monthlyInstallments / totalMonthlyIncome) * 100 : 0;
  const liberdadeFinanceira = totalMonthlyOutflow > 0 ? (monthlyPassiveIncome / totalMonthlyOutflow) * 100 : 0;
  const taxaPoupanca = totalMonthlyIncome > 0 ? (monthlyBalance / totalMonthlyIncome) * 100 : 0;

  // Monthly interest cost
  const totalMonthlyInterest = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .reduce((sum, l) => sum + l.totalValue * (l.interestRate / 100), 0);

  // Charts data
  const assetData = state.assets.reduce((acc, asset) => {
    const existing = acc.find(item => item.name === asset.type);
    if (existing) existing.value += asset.currentValue;
    else acc.push({ name: asset.type, value: asset.currentValue });
    return acc;
  }, [] as { name: string; value: number }[]);

  const expenseByCategory = state.transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => {
      const cat = t.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const categoryData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const cashFlowData = [
    { name: 'Renda Ativa', valor: monthlyActiveIncome, fill: '#10b981' },
    { name: 'Renda Passiva', valor: monthlyPassiveIncome, fill: '#6366f1' },
    { name: 'Despesas', valor: monthlyExpenses, fill: '#ef4444' },
    { name: 'Parcelas', valor: monthlyInstallments, fill: '#f59e0b' },
  ];

  const projectionData = projectWealth(state, 24);

  const comprometimentoColor = comprometimento < 20 ? 'text-emerald-600' : comprometimento < 35 ? 'text-amber-600' : 'text-red-600';
  const comprometimentoBg = comprometimento < 20 ? 'bg-emerald-50 border-emerald-100' : comprometimento < 35 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
  const liberdadeColor = liberdadeFinanceira >= 100 ? 'text-emerald-600' : liberdadeFinanceira >= 50 ? 'text-indigo-600' : 'text-slate-600';
  const poupancaColor = taxaPoupanca >= 20 ? 'text-emerald-600' : taxaPoupanca >= 10 ? 'text-amber-600' : 'text-red-600';

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard Financeiro</h2>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Patrimônio Bruto</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">{formatCurrency(totalAssets)}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={24} /></div>
          </div>
          <div className="mt-4 text-xs text-slate-400">{state.assets.length} ativo(s) cadastrado(s)</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Dívida Total</p>
              <h3 className="text-2xl font-bold mt-1 text-red-500">{formatCurrency(totalLiabilities)}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600"><TrendingDown size={24} /></div>
          </div>
          {totalMonthlyInterest > 0 && (
            <div className="mt-4 text-xs text-amber-600">Juros mensais: R$ {totalMonthlyInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Patrimônio Líquido</p>
              <h3 className={`text-2xl font-bold mt-1 ${netWorth >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{formatCurrency(netWorth)}</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Landmark size={24} /></div>
          </div>
          <div className="mt-4 text-xs text-slate-400">Ativos − Passivos</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Renda Mensal</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(totalMonthlyIncome)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Coins size={24} /></div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Ativa: {((monthlyActiveIncome / totalMonthlyIncome) * 100 || 0).toFixed(0)}% |
            Passiva: {((monthlyPassiveIncome / totalMonthlyIncome) * 100 || 0).toFixed(0)}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Parcelas Mensais</p>
              <h3 className="text-2xl font-bold mt-1 text-orange-500">{formatCurrency(monthlyInstallments)}</h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Wallet size={24} /></div>
          </div>
          <div className="mt-4 text-xs text-slate-400">{state.liabilities.filter(l => l.status === LiabilityStatus.ACTIVE).length} dívida(s) ativa(s)</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Saldo Mensal</p>
              <h3 className={`text-2xl font-bold mt-1 ${monthlyBalance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>{formatCurrency(monthlyBalance)}</h3>
            </div>
            <div className={`p-2 rounded-lg ${monthlyBalance >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>
              <PiggyBank size={24} />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">Renda − (Despesas + Parcelas)</div>
        </div>
      </div>

      {/* Health Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Indicadores de Saúde Financeira</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Comprometimento de Renda */}
          <div className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col gap-2 ${comprometimentoBg}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-600">Comprometimento de Renda</p>
                <p className={`text-3xl font-bold mt-1 ${comprometimentoColor}`}>{comprometimento.toFixed(1)}%</p>
              </div>
              <div className={`p-2 rounded-lg ${comprometimentoBg}`}><Percent size={22} className={comprometimentoColor} /></div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${comprometimento < 20 ? 'bg-emerald-500' : comprometimento < 35 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, comprometimento)}%` }} />
            </div>
            <p className="text-xs text-slate-500">
              {comprometimento < 20 ? '✅ Saudável (< 20%)' : comprometimento < 35 ? '⚠️ Atenção (20–35%)' : '🚨 Crítico (> 35%)'}
            </p>
            <p className="text-xs text-slate-400">Parcelas mensais / Renda total</p>
          </div>

          {/* Liberdade Financeira */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-600">Liberdade Financeira</p>
                <p className={`text-3xl font-bold mt-1 ${liberdadeColor}`}>{liberdadeFinanceira.toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg"><Shield size={22} className="text-indigo-600" /></div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, liberdadeFinanceira)}%` }} />
            </div>
            <p className="text-xs text-slate-500">
              {liberdadeFinanceira >= 100 ? '🏆 Financeiramente livre!' :
                liberdadeFinanceira >= 75 ? '🚀 Quase lá! (75%+)' :
                liberdadeFinanceira >= 50 ? '📈 Avançado (50%+)' :
                liberdadeFinanceira >= 25 ? '💪 Em progresso (25%+)' : '🌱 Início da jornada'}
            </p>
            <p className="text-xs text-slate-400">Renda passiva / Despesas totais</p>
          </div>

          {/* Taxa de Poupança */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-600">Taxa de Poupança</p>
                <p className={`text-3xl font-bold mt-1 ${poupancaColor}`}>{taxaPoupanca.toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-teal-50 rounded-lg"><Target size={22} className="text-teal-600" /></div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${taxaPoupanca >= 20 ? 'bg-emerald-500' : taxaPoupanca >= 10 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(0, Math.min(100, taxaPoupanca))}%` }} />
            </div>
            <p className="text-xs text-slate-500">
              {taxaPoupanca >= 30 ? '🏆 Excelente (30%+)' : taxaPoupanca >= 20 ? '✅ Ótimo (20%+)' : taxaPoupanca >= 10 ? '⚠️ Regular (10%+)' : '🚨 Muito baixo'}
            </p>
            <p className="text-xs text-slate-400">Saldo mensal / Renda total</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Asset Distribution + Expenses by Category + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Distribuição de Ativos</h3>
          <div className="h-56">
            {assetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {assetData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem ativos cadastrados</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Gastos por Categoria</h3>
          <div className="h-56">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem despesas lançadas</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Fluxo Mensal</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={32}>
                  {cashFlowData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patrimony Growth Projection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Projeção de Crescimento Patrimonial</h3>
            <p className="text-sm text-slate-400 mt-0.5">Simulação 24 meses · baseada no fluxo mensal atual</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Patrimônio em 24 meses</p>
            <p className={`text-lg font-bold ${(projectionData[24]?.patrimônio ?? 0) >= netWorth ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(projectionData[projectionData.length - 1]?.patrimônio ?? 0)}
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
                contentStyle={{ fontSize: '12px' }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="ativos" name="Ativos" stroke="#6366f1" fill="url(#gradAtivos)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="patrimônio" name="Patrimônio Líquido" stroke="#10b981" fill="url(#gradPatrimonio)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="dívidas" name="Dívidas" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-400">Hoje</p>
            <p className="font-bold text-slate-700">{formatCurrency(projectionData[0]?.patrimônio ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">6 meses</p>
            <p className="font-bold text-indigo-600">{formatCurrency(projectionData[6]?.patrimônio ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">12 meses</p>
            <p className="font-bold text-indigo-600">{formatCurrency(projectionData[12]?.patrimônio ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">24 meses</p>
            <p className="font-bold text-emerald-600">{formatCurrency(projectionData[24]?.patrimônio ?? 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
