import React from 'react';
import { FinancialState, TransactionType, LiabilityStatus, Liquidity } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, ComposedChart, Line, ReferenceLine
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, Landmark, Coins, PiggyBank,
  Shield, Target, Percent, Zap, Umbrella
} from 'lucide-react';

interface DashboardProps {
  state: FinancialState;
}

const CHART_COLORS = ['#00d4aa', '#6366f1', '#f0b429', '#f43f5e', '#60a5fa', '#a78bfa', '#34d399', '#fb923c'];

const TOOLTIP_STYLE = {
  background: '#0f1a2e',
  border: '1px solid #1e2d40',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
};

const projectWealth = (state: FinancialState, months = 24) => {
  const monthlyActiveIncome = state.transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = state.transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalAssetsInit = state.assets.reduce((s, a) => s + a.currentValue, 0);
  const totalYield = state.assets.reduce((s, a) => s + a.currentValue * (a.monthlyYield || 0) / 100, 0);
  const avgYieldRate = totalAssetsInit > 0 ? totalYield / totalAssetsInit : 0;

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
      totalAssets *= (1 + avgYieldRate);
      const monthlyInstallments = activeLiabilities.reduce((s, l) => s + l.installmentValue, 0);
      const savings = monthlyActiveIncome - monthlyExpenses - monthlyInstallments;
      totalAssets = Math.max(0, totalAssets + savings);

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

const buildPayoffTimeline = (state: FinancialState, currentMonthlyIncome: number, currentMonthlyBalance: number) => {
  const byMonth: Record<string, { freed: number; debts: string[] }> = {};

  state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE && l.installmentsCount > 0 && l.installmentValue > 0 && l.installmentsCount <= 24)
    .forEach(l => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() + l.installmentsCount, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { freed: 0, debts: [] };
      byMonth[key].freed += l.installmentValue;
      byMonth[key].debts.push(l.name);
    });

  const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  return sorted.map(([key, val]) => {
    cumulative += val.freed;
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return {
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      liberado: Math.round(val.freed),
      acumulado: Math.round(cumulative),
      rendaTotal: Math.round(currentMonthlyIncome + cumulative),
      saldoPrevisto: Math.round(currentMonthlyBalance + cumulative),
      debts: val.debts,
    };
  });
};

const formatCurrency = (v: number) =>
  `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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

  const comprometimento = totalMonthlyIncome > 0 ? (monthlyInstallments / totalMonthlyIncome) * 100 : 0;
  const liberdadeFinanceira = totalMonthlyOutflow > 0 ? (monthlyPassiveIncome / totalMonthlyOutflow) * 100 : 0;
  const taxaPoupanca = totalMonthlyIncome > 0 ? (monthlyBalance / totalMonthlyIncome) * 100 : 0;

  const liquidAssets = state.assets
    .filter(a => a.liquidity === Liquidity.HIGH)
    .reduce((s, a) => s + a.currentValue, 0);
  const emergencyMonths = totalMonthlyOutflow > 0 ? liquidAssets / totalMonthlyOutflow : 0;

  const totalMonthlyInterest = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .reduce((sum, l) => sum + l.totalValue * (l.interestRate / 100), 0);

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
    { name: 'Renda Ativa', valor: monthlyActiveIncome, fill: '#00d4aa' },
    { name: 'Renda Passiva', valor: monthlyPassiveIncome, fill: '#6366f1' },
    { name: 'Despesas', valor: monthlyExpenses, fill: '#f43f5e' },
    { name: 'Parcelas', valor: monthlyInstallments, fill: '#f0b429' },
  ];

  const projectionData = projectWealth(state, 24);

  const comprometimentoColor = comprometimento < 20 ? '#00d4aa' : comprometimento < 35 ? '#f0b429' : '#f43f5e';
  const liberdadeColor = liberdadeFinanceira >= 100 ? '#00d4aa' : liberdadeFinanceira >= 50 ? '#6366f1' : '#94a3b8';
  const poupancaColor = taxaPoupanca >= 20 ? '#00d4aa' : taxaPoupanca >= 10 ? '#f0b429' : '#f43f5e';
  const emergencyColor = emergencyMonths >= 6 ? '#00d4aa' : emergencyMonths >= 3 ? '#f0b429' : '#f43f5e';

  const getComprometimentoLabel = () => {
    if (comprometimento < 20) return 'Saudavel — abaixo de 20%';
    if (comprometimento < 35) return 'Atencao — entre 20% e 35%';
    return 'Critico — acima de 35%';
  };

  const getLiberdadeLabel = () => {
    if (liberdadeFinanceira >= 100) return 'Financeiramente livre';
    if (liberdadeFinanceira >= 75) return 'Quase la — 75%+';
    if (liberdadeFinanceira >= 50) return 'Avancado — 50%+';
    if (liberdadeFinanceira >= 25) return 'Em progresso — 25%+';
    return 'Inicio da jornada';
  };

  const getPoupancaLabel = () => {
    if (taxaPoupanca >= 30) return 'Excelente — 30%+';
    if (taxaPoupanca >= 20) return 'Otimo — 20%+';
    if (taxaPoupanca >= 10) return 'Regular — 10%+';
    return 'Muito baixo';
  };

  const getEmergencyLabel = () => {
    if (emergencyMonths >= 6) return 'Seguro — 6+ meses';
    if (emergencyMonths >= 3) return 'Atencao — 3 a 6 meses';
    return 'Insuficiente — menos de 3 meses';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-0.5">Visão geral do seu patrimônio</p>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Patrimônio Bruto */}
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col justify-between hover:border-[#253547] transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Patrimônio Bruto</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-100">{formatCurrency(totalAssets)}</h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <TrendingUp size={20} color="#60a5fa" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-600">{state.assets.length} ativo(s) cadastrado(s)</div>
        </div>

        {/* Dívida Total */}
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col justify-between hover:border-[#253547] transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dívida Total</p>
              <h3 className="text-2xl font-bold mt-2 text-red-400">{formatCurrency(totalLiabilities)}</h3>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-lg">
              <TrendingDown size={20} color="#f43f5e" />
            </div>
          </div>
          {totalMonthlyInterest > 0 && (
            <div className="mt-4 text-xs text-amber-500">
              Juros mensais: R$ {totalMonthlyInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        {/* Patrimônio Líquido */}
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col justify-between hover:border-[#253547] transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Patrimônio Líquido</p>
              <h3 className={`text-2xl font-bold mt-2 ${netWorth >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                {formatCurrency(netWorth)}
              </h3>
            </div>
            <div className="p-2.5 bg-[#00d4aa]/10 rounded-lg">
              <Landmark size={20} color="#00d4aa" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-600">Ativos − Passivos</div>
        </div>

        {/* Renda Mensal */}
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col justify-between hover:border-[#253547] transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Renda Mensal</p>
              <h3 className="text-2xl font-bold mt-2 text-emerald-400">{formatCurrency(totalMonthlyIncome)}</h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-lg">
              <Coins size={20} color="#34d399" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-600">
            Ativa: {((monthlyActiveIncome / totalMonthlyIncome) * 100 || 0).toFixed(0)}% ·
            Passiva: {((monthlyPassiveIncome / totalMonthlyIncome) * 100 || 0).toFixed(0)}%
          </div>
        </div>

        {/* Parcelas Mensais */}
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col justify-between hover:border-[#253547] transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Parcelas Mensais</p>
              <h3 className="text-2xl font-bold mt-2 text-amber-400">{formatCurrency(monthlyInstallments)}</h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-lg">
              <Wallet size={20} color="#f0b429" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-600">
            {state.liabilities.filter(l => l.status === LiabilityStatus.ACTIVE).length} dívida(s) ativa(s)
          </div>
        </div>

        {/* Saldo Mensal */}
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col justify-between hover:border-[#253547] transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo Mensal</p>
              <h3 className={`text-2xl font-bold mt-2 ${monthlyBalance >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                {formatCurrency(monthlyBalance)}
              </h3>
            </div>
            <div className={`p-2.5 rounded-lg ${monthlyBalance >= 0 ? 'bg-[#00d4aa]/10' : 'bg-red-500/10'}`}>
              <PiggyBank size={20} color={monthlyBalance >= 0 ? '#00d4aa' : '#f43f5e'} />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-600">Renda − (Despesas + Parcelas)</div>
        </div>
      </div>

      {/* Health Indicators */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Indicadores de Saúde Financeira</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Comprometimento */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Comprometimento</p>
                <p className="text-3xl font-bold mt-1" style={{ color: comprometimentoColor }}>
                  {comprometimento.toFixed(1)}%
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1a2640]">
                <Percent size={18} style={{ color: comprometimentoColor }} />
              </div>
            </div>
            <div className="w-full bg-[#1a2640] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, comprometimento)}%`, background: comprometimentoColor }}
              />
            </div>
            <p className="text-xs text-slate-600">{getComprometimentoLabel()}</p>
          </div>

          {/* Liberdade Financeira */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Liberdade Financeira</p>
                <p className="text-3xl font-bold mt-1" style={{ color: liberdadeColor }}>
                  {liberdadeFinanceira.toFixed(1)}%
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1a2640]">
                <Shield size={18} style={{ color: liberdadeColor }} />
              </div>
            </div>
            <div className="w-full bg-[#1a2640] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, liberdadeFinanceira)}%`, background: liberdadeColor }}
              />
            </div>
            <p className="text-xs text-slate-600">{getLiberdadeLabel()}</p>
          </div>

          {/* Taxa de Poupança */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Poupança</p>
                <p className="text-3xl font-bold mt-1" style={{ color: poupancaColor }}>
                  {taxaPoupanca.toFixed(1)}%
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1a2640]">
                <Target size={18} style={{ color: poupancaColor }} />
              </div>
            </div>
            <div className="w-full bg-[#1a2640] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, taxaPoupanca))}%`, background: poupancaColor }}
              />
            </div>
            <p className="text-xs text-slate-600">{getPoupancaLabel()}</p>
          </div>

          {/* Fundo de Emergência */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fundo de Emergência</p>
                <p className="text-3xl font-bold mt-1" style={{ color: emergencyColor }}>
                  {emergencyMonths.toFixed(1)}m
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1a2640]">
                <Umbrella size={18} style={{ color: emergencyColor }} />
              </div>
            </div>
            <div className="w-full bg-[#1a2640] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, (emergencyMonths / 6) * 100)}%`, background: emergencyColor }}
              />
            </div>
            <p className="text-xs text-slate-600">{getEmergencyLabel()}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Distribuição de Ativos</h3>
          <div className="h-52">
            {assetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                    {assetData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem ativos cadastrados</div>
            )}
          </div>
        </div>

        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Gastos por Categoria</h3>
          <div className="h-52">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                    {categoryData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem despesas lançadas</div>
            )}
          </div>
        </div>

        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Fluxo Mensal</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2640" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={28}>
                  {cashFlowData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patrimony Projection */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-200">Projeção de Crescimento Patrimonial</h3>
            <p className="text-xs text-slate-600 mt-1">Simulação 24 meses · baseada no fluxo mensal atual</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600">Em 24 meses</p>
            <p className={`text-lg font-bold ${(projectionData[24]?.patrimônio ?? 0) >= netWorth ? 'text-[#00d4aa]' : 'text-red-400'}`}>
              {formatCurrency(projectionData[projectionData.length - 1]?.patrimônio ?? 0)}
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2640" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} interval={3} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} contentStyle={TOOLTIP_STYLE} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
              <Area type="monotone" dataKey="ativos" name="Ativos" stroke="#6366f1" fill="url(#gradAtivos)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="patrimônio" name="Patrimônio Líquido" stroke="#00d4aa" fill="url(#gradPatrimonio)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="dívidas" name="Dívidas" stroke="#f43f5e" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[#1a2640]">
          <div className="text-center">
            <p className="text-xs text-slate-600">Hoje</p>
            <p className="font-bold text-slate-300 mt-0.5">{formatCurrency(projectionData[0]?.patrimônio ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600">6 meses</p>
            <p className="font-bold text-[#6366f1] mt-0.5">{formatCurrency(projectionData[6]?.patrimônio ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600">12 meses</p>
            <p className="font-bold text-[#6366f1] mt-0.5">{formatCurrency(projectionData[12]?.patrimônio ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600">24 meses</p>
            <p className="font-bold text-[#00d4aa] mt-0.5">{formatCurrency(projectionData[24]?.patrimônio ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Debt Payoff Cashflow Release */}
      {(() => {
        const payoffData = buildPayoffTimeline(state, totalMonthlyIncome, monthlyBalance);
        if (payoffData.length === 0) return null;
        const totalFreed = payoffData[payoffData.length - 1]?.acumulado ?? 0;
        return (
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Zap size={16} color="#f0b429" />
                  Liberação de Caixa por Quitação de Dívidas
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Renda mensal liberada conforme as dívidas terminam
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">Total liberado ao final</p>
                <p className="text-lg font-bold text-[#00d4aa]">{formatCurrency(totalFreed)}/mês</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={payoffData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2640" />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payoffData.find(p => p.label === label);
                      return (
                        <div style={TOOLTIP_STYLE} className="p-3 rounded-xl text-xs">
                          <p className="font-semibold text-slate-300 mb-2">{label}</p>
                          {entry?.debts.map(d => (
                            <p key={d} className="text-slate-500">+ {d}</p>
                          ))}
                          <p className="text-[#00d4aa] mt-1.5">+{formatCurrency((payload.find(p => p.dataKey === 'liberado')?.value as number) ?? 0)}/mês liberado</p>
                          <p className="text-[#6366f1]">Acumulado: {formatCurrency((payload.find(p => p.dataKey === 'acumulado')?.value as number) ?? 0)}/mês</p>
                          <p className="text-[#f0b429] font-semibold">Renda prevista: {formatCurrency((payload.find(p => p.dataKey === 'rendaTotal')?.value as number) ?? 0)}/mês</p>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="liberado" name="Liberado no mês" fill="#00d4aa" radius={[4, 4, 0, 0]} barSize={28} />
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                  <Line yAxisId="right" type="monotone" dataKey="rendaTotal" name="Renda total" stroke="#f0b429" strokeWidth={2} dot={{ r: 3, fill: '#f0b429' }} strokeDasharray="5 3" />
                  <Line yAxisId="right" type="monotone" dataKey="saldoPrevisto" name="Saldo previsto" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} />
                  <ReferenceLine yAxisId="left" y={0} stroke="#1a2640" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1a2640]">
              <p className="text-xs text-slate-600 mb-2">Datas de quitação previstas:</p>
              <div className="flex flex-wrap gap-2">
                {payoffData.map(p => (
                  <div key={p.label} className="flex items-center gap-1.5 bg-[#00d4aa]/5 border border-[#00d4aa]/20 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-semibold text-[#00d4aa]">{p.label}</span>
                    <span className="text-xs text-slate-500">— +{formatCurrency(p.liberado)}/mês</span>
                    <span className="text-xs text-slate-600">({p.debts.join(', ')})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Dashboard;
