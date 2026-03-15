import React, { useState, useMemo } from 'react';
import { FinancialState, TransactionType, LiabilityStatus } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { Flame, TrendingUp, ArrowDownCircle, Calculator, Info } from 'lucide-react';

interface PlanningToolsProps {
  state: FinancialState;
}

const fmt = (v: number) =>
  `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const PlanningTools: React.FC<PlanningToolsProps> = ({ state }) => {
  // ---- Shared financial data ----
  const totalAssets = state.assets.reduce((s, a) => s + a.currentValue, 0);
  const totalLiabilities = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .reduce((s, l) => s + l.totalValue, 0);
  const netWorth = totalAssets - totalLiabilities;

  const monthlyActiveIncome = state.transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((s, t) => s + t.amount, 0);
  const monthlyPassive = state.assets
    .reduce((s, a) => s + a.currentValue * (a.monthlyYield || 0) / 100, 0);
  const totalMonthlyIncome = monthlyActiveIncome + monthlyPassive;

  const monthlyExpenses = state.transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((s, t) => s + t.amount, 0);
  const monthlyInstallments = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .reduce((s, l) => s + l.installmentValue, 0);
  const totalOutflow = monthlyExpenses + monthlyInstallments;
  const monthlyBalance = totalMonthlyIncome - totalOutflow;

  const totalYieldBRL = state.assets.reduce((s, a) => s + a.currentValue * (a.monthlyYield || 0) / 100, 0);
  const avgMonthlyYieldRate = totalAssets > 0 ? totalYieldBRL / totalAssets : 0.008;

  // ---- FIRE Calculator ----
  const [targetExpensesInput, setTargetExpensesInput] = useState('');
  const targetMonthlyExpenses = targetExpensesInput !== '' && !isNaN(Number(targetExpensesInput))
    ? Math.max(0, Number(targetExpensesInput))
    : totalOutflow;

  // 4% rule: accumulate 25x annual expenses
  const fireNumber = targetMonthlyExpenses * 12 * 25;
  const fireProgress = fireNumber > 0 ? Math.min(100, (Math.max(0, netWorth) / fireNumber) * 100) : 0;

  const simulateYearsToFIRE = (extraMonthly = 0): number => {
    if (netWorth >= fireNumber) return 0;
    let worth = Math.max(0, netWorth);
    const monthlySavings = monthlyBalance + extraMonthly;
    let months = 0;
    while (worth < fireNumber && months < 720) {
      worth = worth * (1 + avgMonthlyYieldRate) + monthlySavings;
      months++;
    }
    return months >= 720 ? Infinity : months / 12;
  };

  const yearsToFIRE = useMemo(() => simulateYearsToFIRE(), [netWorth, fireNumber, monthlyBalance, avgMonthlyYieldRate]);
  const targetPassiveIncome = targetMonthlyExpenses;

  // ---- Investment Simulator ----
  const [extraMonthly, setExtraMonthly] = useState(500);

  const simulateAssets = (months: number, extra: number): number => {
    const r = avgMonthlyYieldRate;
    let worth = netWorth;
    const savings = monthlyBalance + extra;
    for (let i = 0; i < months; i++) {
      worth = worth * (1 + r) + savings;
    }
    return Math.max(0, Math.round(worth));
  };

  const simData = useMemo(() => [
    {
      label: '5 anos',
      'Sem aporte extra': simulateAssets(60, 0),
      'Com aporte extra': simulateAssets(60, extraMonthly),
    },
    {
      label: '10 anos',
      'Sem aporte extra': simulateAssets(120, 0),
      'Com aporte extra': simulateAssets(120, extraMonthly),
    },
    {
      label: '20 anos',
      'Sem aporte extra': simulateAssets(240, 0),
      'Com aporte extra': simulateAssets(240, extraMonthly),
    },
  ], [extraMonthly, totalAssets, monthlyBalance, avgMonthlyYieldRate]);

  const yearsWithExtra = useMemo(() => simulateYearsToFIRE(extraMonthly), [extraMonthly, netWorth, fireNumber, monthlyBalance, avgMonthlyYieldRate]);
  const fireImpactMonths = yearsToFIRE !== Infinity && yearsWithExtra !== Infinity
    ? Math.round((yearsToFIRE - yearsWithExtra) * 12)
    : null;

  // ---- Snowball vs Avalanche ----
  const activeDebts = state.liabilities.filter(
    l => l.status === LiabilityStatus.ACTIVE && l.installmentsCount > 0 && l.installmentValue > 0
  );

  const simulateDebtStrategy = (strategy: 'snowball' | 'avalanche') => {
    if (activeDebts.length === 0) return { months: 0, totalInterest: 0, order: [] as string[] };

    let debts = activeDebts.map(l => ({
      id: l.id,
      name: l.name,
      balance: l.totalValue,
      rate: l.interestRate / 100,
      minPayment: l.installmentValue,
      paid: false,
    }));

    let months = 0;
    let totalInterest = 0;
    let extraPool = Math.max(0, monthlyBalance);
    const payoffOrder: string[] = [];

    while (debts.some(d => !d.paid) && months < 600) {
      months++;

      const active = debts.filter(d => !d.paid);
      if (strategy === 'snowball') {
        active.sort((a, b) => a.balance - b.balance);
      } else {
        active.sort((a, b) => b.rate - a.rate);
      }
      const priorityId = active[0]?.id;
      let remainingExtra = extraPool;
      const newlyPaidPayments: number[] = [];

      debts = debts.map(d => {
        if (d.paid) return d;
        const interest = d.balance * d.rate;
        totalInterest += interest;
        const principal = Math.min(d.balance, Math.max(0, d.minPayment - interest));
        let newBalance = d.balance - principal;

        if (d.id === priorityId && remainingExtra > 0) {
          const applied = Math.min(remainingExtra, newBalance);
          newBalance = Math.max(0, newBalance - applied);
          remainingExtra -= applied;
        }

        const nowPaid = newBalance < 0.01;
        if (nowPaid && !d.paid) {
          newlyPaidPayments.push(d.minPayment);
          payoffOrder.push(d.name);
        }
        return { ...d, balance: newBalance, paid: nowPaid };
      });

      newlyPaidPayments.forEach(mp => { extraPool += mp; });
    }

    return { months, totalInterest: Math.round(totalInterest), order: payoffOrder };
  };

  const snowball = useMemo(() => simulateDebtStrategy('snowball'), [activeDebts, monthlyBalance]);
  const avalanche = useMemo(() => simulateDebtStrategy('avalanche'), [activeDebts, monthlyBalance]);

  const interestSaved = snowball.totalInterest - avalanche.totalInterest;
  const monthsDiff = snowball.months - avalanche.months;

  // Timeline data for debt comparison chart
  const debtTimelineData = useMemo(() => {
    const maxMonths = Math.max(snowball.months, avalanche.months, 1);
    const step = Math.max(1, Math.floor(maxMonths / 12));
    const points = [];
    for (let m = 0; m <= maxMonths; m += step) {
      const d = new Date();
      d.setMonth(d.getMonth() + m);
      const label = m === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      points.push({ label, mes: m });
    }
    return points;
  }, [snowball.months, avalanche.months]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Ferramentas de Planejamento</h2>

      {/* FIRE Calculator */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={22} className="text-orange-500" />
          <h3 className="text-lg font-semibold text-slate-800">Calculadora FIRE</h3>
          <span className="text-xs text-slate-400 ml-1">Independência Financeira / Aposentadoria Antecipada</span>
        </div>

        {/* Target expenses input */}
        <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Despesas mensais futuras desejadas
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
              <input
                type="number"
                min={0}
                step={100}
                placeholder={totalOutflow.toFixed(0)}
                value={targetExpensesInput}
                onChange={e => setTargetExpensesInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            {targetExpensesInput !== '' && (
              <button
                onClick={() => setTargetExpensesInput('')}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Usar gastos atuais ({fmt(totalOutflow)})
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {targetExpensesInput === ''
              ? 'Usando seus gastos mensais atuais como referência.'
              : `Número FIRE calculado com base em ${fmt(targetMonthlyExpenses)}/mês.`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-orange-600 font-medium mb-1">Número FIRE</p>
            <p className="text-2xl font-bold text-orange-700">{fmt(fireNumber)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {fmt(targetMonthlyExpenses)}/mês × 12 × 25 (regra dos 4%)
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs text-indigo-600 font-medium mb-1">Patrimônio Líquido Atual</p>
            <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{fmt(netWorth)}</p>
            <p className="text-xs text-slate-400 mt-1">Progresso: {fireProgress.toFixed(1)}% do FIRE</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-xs text-emerald-600 font-medium mb-1">Tempo Estimado</p>
            <p className="text-2xl font-bold text-emerald-700">
              {yearsToFIRE === 0 ? '🏆 FIRE!' : yearsToFIRE === Infinity ? '∞' : `${yearsToFIRE.toFixed(1)} anos`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {yearsToFIRE === Infinity ? 'Saldo mensal insuficiente' : 'No ritmo atual de acumulação'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progresso rumo ao FIRE</span>
            <span>{fireProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-700"
              style={{ width: `${fireProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>R$ 0</span>
            <span>{fmt(fireNumber)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs text-slate-500">Renda passiva atual</p>
            <p className="font-semibold text-indigo-600">{fmt(monthlyPassive)}/mês</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Meta de renda passiva (FIRE)</p>
            <p className="font-semibold text-orange-600">{fmt(targetPassiveIncome)}/mês</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cobertura passiva atual</p>
            <p className={`font-semibold ${monthlyPassive >= totalOutflow ? 'text-emerald-600' : 'text-slate-700'}`}>
              {totalOutflow > 0 ? ((monthlyPassive / totalOutflow) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Falta acumular</p>
            <p className="font-semibold text-red-500">{fmt(Math.max(0, fireNumber - netWorth))}</p>
          </div>
        </div>
      </div>

      {/* Investment Simulator */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={22} className="text-indigo-500" />
          <h3 className="text-lg font-semibold text-slate-800">Simulador de Aportes</h3>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">
              Aporte extra mensal: <span className="text-indigo-600 font-bold">{fmt(extraMonthly)}</span>
            </label>
            {fireImpactMonths !== null && fireImpactMonths > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                -{fireImpactMonths} meses para FIRE
              </span>
            )}
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={100}
            value={extraMonthly}
            onChange={e => setExtraMonthly(Number(e.target.value))}
            className="w-full h-2 accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>R$ 0</span>
            <span>R$ 10.000</span>
          </div>
        </div>

        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={simData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Sem aporte extra" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Com aporte extra" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {simData.map(row => {
            const gain = row['Com aporte extra'] - row['Sem aporte extra'];
            return (
              <div key={row.label} className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-xs font-medium text-indigo-600">{row.label}</p>
                <p className="font-bold text-slate-700">{fmt(row['Com aporte extra'])}</p>
                <p className="text-xs text-emerald-600 mt-0.5">+{fmt(gain)} a mais</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
          <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Simulação partindo do patrimônio líquido atual ({fmt(netWorth)}), com taxa de rendimento médio de {(avgMonthlyYieldRate * 100).toFixed(2)}%/mês
            e saldo mensal de {fmt(monthlyBalance)} como aporte recorrente.
          </p>
        </div>
      </div>

      {/* Snowball vs Avalanche */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownCircle size={22} className="text-teal-500" />
          <h3 className="text-lg font-semibold text-slate-800">Snowball vs Avalanche</h3>
          <span className="text-xs text-slate-400 ml-1">Estratégias de quitação de dívidas</span>
        </div>

        {activeDebts.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Nenhuma dívida ativa cadastrada.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Snowball */}
              <div className="border border-blue-100 bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">❄️</span>
                  <div>
                    <h4 className="font-semibold text-blue-800">Snowball</h4>
                    <p className="text-xs text-blue-600">Menor saldo primeiro</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Tempo de quitação</span>
                    <span className="text-sm font-bold text-blue-700">{snowball.months} meses ({(snowball.months / 12).toFixed(1)} anos)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total de juros pagos</span>
                    <span className="text-sm font-bold text-red-600">{fmt(snowball.totalInterest)}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-100">
                    <p className="text-xs text-slate-500 mb-1">Ordem de quitação:</p>
                    {snowball.order.map((name, i) => (
                      <span key={i} className="inline-block text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5 mr-1 mb-1">
                        {i + 1}. {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Avalanche */}
              <div className="border border-purple-100 bg-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🌊</span>
                  <div>
                    <h4 className="font-semibold text-purple-800">Avalanche</h4>
                    <p className="text-xs text-purple-600">Maior juros primeiro</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Tempo de quitação</span>
                    <span className="text-sm font-bold text-purple-700">{avalanche.months} meses ({(avalanche.months / 12).toFixed(1)} anos)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total de juros pagos</span>
                    <span className="text-sm font-bold text-red-600">{fmt(avalanche.totalInterest)}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-purple-100">
                    <p className="text-xs text-slate-500 mb-1">Ordem de quitação:</p>
                    {avalanche.order.map((name, i) => (
                      <span key={i} className="inline-block text-xs bg-purple-100 text-purple-700 rounded px-2 py-0.5 mr-1 mb-1">
                        {i + 1}. {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {interestSaved > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex gap-2 items-start">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Avalanche economiza mais</p>
                    <p className="text-sm font-bold text-emerald-600">{fmt(interestSaved)} em juros</p>
                  </div>
                </div>
              )}
              {monthsDiff !== 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2 items-start">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-xs font-semibold text-blue-700">
                      {monthsDiff > 0 ? 'Avalanche termina mais rápido' : 'Snowball termina mais rápido'}
                    </p>
                    <p className="text-sm font-bold text-blue-600">{Math.abs(monthsDiff)} meses de diferença</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current debts table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-medium">Dívida</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Saldo</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Juros/mês</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Parcela</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Parcelas</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDebts
                    .slice()
                    .sort((a, b) => b.interestRate - a.interestRate)
                    .map(d => (
                      <tr key={d.id} className="border-b border-slate-50">
                        <td className="py-2 text-slate-700">{d.name}</td>
                        <td className="text-right text-slate-700">{fmt(d.totalValue)}</td>
                        <td className="text-right text-red-500">{d.interestRate.toFixed(2)}%</td>
                        <td className="text-right text-slate-700">{fmt(d.installmentValue)}</td>
                        <td className="text-right text-slate-500">{d.installmentsCount}x</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 p-3 bg-slate-50 rounded-lg flex gap-2">
              <Calculator size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">
                Simulação considera {fmt(Math.max(0, monthlyBalance))}/mês de saldo disponível para abatimento extra,
                que cresce conforme cada dívida é quitada (efeito bola de neve).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanningTools;
