import React, { useState, useMemo } from 'react';
import { FinancialState, TransactionType, LiabilityStatus } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { Flame, TrendingUp, ArrowDownCircle, Calculator, Info, Target, Snowflake, Waves } from 'lucide-react';

interface PlanningToolsProps {
  state: FinancialState;
}

const fmt = (v: number) =>
  `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TOOLTIP_STYLE = {
  background: '#0f1a2e',
  border: '1px solid #1e2d40',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
};

const INPUT_CLASS = "w-full bg-[#0a1628] border border-[#1e2d40] text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors placeholder-slate-600";

const PlanningTools: React.FC<PlanningToolsProps> = ({ state }) => {
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

  // FIRE Calculator
  const [targetExpensesInput, setTargetExpensesInput] = useState('');
  const targetMonthlyExpenses = targetExpensesInput !== '' && !isNaN(Number(targetExpensesInput))
    ? Math.max(0, Number(targetExpensesInput))
    : totalOutflow;

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

  // Investment Simulator
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

  // Snowball vs Avalanche
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Planejamento</h2>
        <p className="text-slate-500 text-sm mt-0.5">Ferramentas para acelerar sua independência financeira</p>
      </div>

      {/* FIRE Calculator */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Flame size={18} color="#f97316" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Calculadora FIRE</h3>
            <p className="text-xs text-slate-600">Independência Financeira / Aposentadoria Antecipada</p>
          </div>
        </div>

        {/* Target expenses */}
        <div className="mb-5 p-4 bg-[#0a1221] border border-[#1a2640] rounded-xl">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Despesas mensais futuras desejadas
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
              <input
                type="number"
                min={0}
                step={100}
                placeholder={totalOutflow.toFixed(0)}
                value={targetExpensesInput}
                onChange={e => setTargetExpensesInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#0a1628] border border-[#1e2d40] text-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00d4aa] transition-colors"
              />
            </div>
            {targetExpensesInput !== '' && (
              <button
                onClick={() => setTargetExpensesInput('')}
                className="text-xs text-slate-600 hover:text-slate-400 underline"
              >
                Usar gastos atuais ({fmt(totalOutflow)})
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            {targetExpensesInput === ''
              ? 'Usando seus gastos mensais atuais como referência.'
              : `Numero FIRE calculado com base em ${fmt(targetMonthlyExpenses)}/mês.`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="bg-[#0a1221] border border-[#1a2640] rounded-xl p-4">
            <p className="text-xs text-orange-400 font-medium uppercase tracking-wider mb-1">Numero FIRE</p>
            <p className="text-2xl font-bold text-orange-400">{fmt(fireNumber)}</p>
            <p className="text-xs text-slate-600 mt-1">{fmt(targetMonthlyExpenses)}/mês × 12 × 25</p>
          </div>
          <div className="bg-[#0a1221] border border-[#1a2640] rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Patrimônio Líquido</p>
            <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>{fmt(netWorth)}</p>
            <p className="text-xs text-slate-600 mt-1">Progresso: {fireProgress.toFixed(1)}% do FIRE</p>
          </div>
          <div className="bg-[#0a1221] border border-[#1a2640] rounded-xl p-4">
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-1">Tempo Estimado</p>
            <p className="text-2xl font-bold text-emerald-400">
              {yearsToFIRE === 0 ? 'FIRE!' : yearsToFIRE === Infinity ? 'Infinity' : `${yearsToFIRE.toFixed(1)} anos`}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {yearsToFIRE === Infinity ? 'Saldo mensal insuficiente' : 'No ritmo atual'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progresso rumo ao FIRE</span>
            <span style={{ color: '#f0b429' }}>{fireProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#1a2640] rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${fireProgress}%`, background: 'linear-gradient(90deg, #f97316, #f0b429)' }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>R$ 0</span>
            <span>{fmt(fireNumber)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#0a1221] rounded-xl border border-[#1a2640]">
          <div>
            <p className="text-xs text-slate-600">Renda passiva atual</p>
            <p className="font-semibold text-[#6366f1] text-sm mt-0.5">{fmt(monthlyPassive)}/mês</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Meta de renda passiva</p>
            <p className="font-semibold text-orange-400 text-sm mt-0.5">{fmt(targetPassiveIncome)}/mês</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Cobertura passiva</p>
            <p className={`font-semibold text-sm mt-0.5 ${monthlyPassive >= totalOutflow ? 'text-[#00d4aa]' : 'text-slate-400'}`}>
              {totalOutflow > 0 ? ((monthlyPassive / totalOutflow) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Falta acumular</p>
            <p className="font-semibold text-red-400 text-sm mt-0.5">{fmt(Math.max(0, fireNumber - netWorth))}</p>
          </div>
        </div>
      </div>

      {/* Investment Simulator */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-[#6366f1]/10">
            <TrendingUp size={18} color="#6366f1" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Simulador de Aportes</h3>
            <p className="text-xs text-slate-600">Veja o impacto de aportes extras no longo prazo</p>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-sm text-slate-400">
              Aporte extra mensal: <span className="font-bold" style={{ color: '#00d4aa' }}>{fmt(extraMonthly)}</span>
            </label>
            {fireImpactMonths !== null && fireImpactMonths > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: '#00d4aa15', color: '#00d4aa', border: '1px solid #00d4aa30' }}>
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
            className="w-full h-1.5 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>R$ 0</span>
            <span>R$ 10.000</span>
          </div>
        </div>

        <div className="h-60 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={simData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2640" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
              <Bar dataKey="Sem aporte extra" fill="#253547" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Com aporte extra" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {simData.map(row => {
            const gain = row['Com aporte extra'] - row['Sem aporte extra'];
            return (
              <div key={row.label} className="bg-[#0a1221] border border-[#1a2640] rounded-xl p-3.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{row.label}</p>
                <p className="font-bold text-slate-200 mt-1">{fmt(row['Com aporte extra'])}</p>
                <p className="text-xs mt-0.5" style={{ color: '#00d4aa' }}>+{fmt(gain)} a mais</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 p-3 bg-[#0a1221] border border-[#1a2640] rounded-xl flex gap-2">
          <Info size={13} color="#f0b429" className="mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">
            Simulação partindo do patrimônio líquido atual ({fmt(netWorth)}), com taxa de rendimento de {(avgMonthlyYieldRate * 100).toFixed(2)}%/mês
            e saldo mensal de {fmt(monthlyBalance)} como aporte recorrente.
          </p>
        </div>
      </div>

      {/* Snowball vs Avalanche */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-[#00d4aa]/10">
            <ArrowDownCircle size={18} color="#00d4aa" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Snowball vs Avalanche</h3>
            <p className="text-xs text-slate-600">Estratégias de quitação de dívidas</p>
          </div>
        </div>

        {activeDebts.length === 0 ? (
          <div className="text-center py-10 text-slate-600">
            <p className="text-sm">Nenhuma dívida ativa cadastrada.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Snowball */}
              <div className="bg-[#0a1221] border border-blue-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Snowflake size={16} color="#60a5fa" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-400 text-sm">Snowball</h4>
                    <p className="text-xs text-slate-600">Menor saldo primeiro</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Tempo de quitação</span>
                    <span className="text-sm font-bold text-blue-400">{snowball.months}m ({(snowball.months / 12).toFixed(1)}a)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Total de juros</span>
                    <span className="text-sm font-bold text-red-400">{fmt(snowball.totalInterest)}</span>
                  </div>
                  <div className="mt-2 pt-3 border-t border-[#1a2640]">
                    <p className="text-xs text-slate-600 mb-2">Ordem de quitação:</p>
                    <div className="flex flex-wrap gap-1">
                      {snowball.order.map((name, i) => (
                        <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-2 py-0.5">
                          {i + 1}. {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Avalanche */}
              <div className="bg-[#0a1221] border border-[#6366f1]/20 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-lg bg-[#6366f1]/10">
                    <Waves size={16} color="#a78bfa" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#a78bfa] text-sm">Avalanche</h4>
                    <p className="text-xs text-slate-600">Maior juros primeiro</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Tempo de quitação</span>
                    <span className="text-sm font-bold text-[#a78bfa]">{avalanche.months}m ({(avalanche.months / 12).toFixed(1)}a)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Total de juros</span>
                    <span className="text-sm font-bold text-red-400">{fmt(avalanche.totalInterest)}</span>
                  </div>
                  <div className="mt-2 pt-3 border-t border-[#1a2640]">
                    <p className="text-xs text-slate-600 mb-2">Ordem de quitação:</p>
                    <div className="flex flex-wrap gap-1">
                      {avalanche.order.map((name, i) => (
                        <span key={i} className="text-xs bg-[#6366f1]/10 text-[#a78bfa] border border-[#6366f1]/20 rounded px-2 py-0.5">
                          {i + 1}. {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {interestSaved > 0 && (
                <div className="bg-[#00d4aa]/5 border border-[#00d4aa]/20 rounded-xl p-3.5 flex gap-2.5 items-start">
                  <Target size={14} color="#00d4aa" className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#00d4aa' }}>Avalanche economiza mais</p>
                    <p className="text-sm font-bold" style={{ color: '#00d4aa' }}>{fmt(interestSaved)} em juros</p>
                  </div>
                </div>
              )}
              {monthsDiff !== 0 && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 flex gap-2.5 items-start">
                  <TrendingUp size={14} color="#60a5fa" className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-400">
                      {monthsDiff > 0 ? 'Avalanche termina mais rapido' : 'Snowball termina mais rapido'}
                    </p>
                    <p className="text-sm font-bold text-blue-400">{Math.abs(monthsDiff)} meses de diferença</p>
                  </div>
                </div>
              )}
            </div>

            {/* Debts table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2640]">
                    <th className="text-left py-2 text-slate-600 font-medium">Dívida</th>
                    <th className="text-right py-2 text-slate-600 font-medium">Saldo</th>
                    <th className="text-right py-2 text-slate-600 font-medium">Juros/mês</th>
                    <th className="text-right py-2 text-slate-600 font-medium">Parcela</th>
                    <th className="text-right py-2 text-slate-600 font-medium">Parcelas</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDebts
                    .slice()
                    .sort((a, b) => b.interestRate - a.interestRate)
                    .map(d => (
                      <tr key={d.id} className="border-b border-[#1a2640]">
                        <td className="py-2 text-slate-300">{d.name}</td>
                        <td className="text-right text-slate-300">{fmt(d.totalValue)}</td>
                        <td className="text-right text-red-400">{d.interestRate.toFixed(2)}%</td>
                        <td className="text-right text-slate-300">{fmt(d.installmentValue)}</td>
                        <td className="text-right text-slate-500">{d.installmentsCount}x</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 p-3 bg-[#0a1221] border border-[#1a2640] rounded-xl flex gap-2">
              <Calculator size={13} color="#475569" className="mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600">
                Simulação considera {fmt(Math.max(0, monthlyBalance))}/mês de saldo disponível para abatimento extra,
                que cresce conforme cada dívida é quitada.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanningTools;
