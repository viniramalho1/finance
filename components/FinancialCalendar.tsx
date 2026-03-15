import React from 'react';
import { FinancialState, LiabilityStatus, TransactionType } from '../types';
import { CalendarDays, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface FinancialCalendarProps {
  state: FinancialState;
}

const fmt = (v: number) =>
  `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const monthLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const shortLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

interface CalendarEvent {
  date: Date;
  type: 'payoff' | 'milestone';
  label: string;
  subtitle: string;
  amount: number;
  color: string;
  icon: React.ReactNode;
}

const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ state }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthlyIncome = state.transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((s, t) => s + t.amount, 0);
  const monthlyPassive = state.assets
    .reduce((s, a) => s + a.currentValue * (a.monthlyYield || 0) / 100, 0);
  const totalIncome = monthlyIncome + monthlyPassive;
  const monthlyExpenses = state.transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((s, t) => s + t.amount, 0);
  const monthlyInstallments = state.liabilities
    .filter(l => l.status === LiabilityStatus.ACTIVE)
    .reduce((s, l) => s + l.installmentValue, 0);
  const monthlyBalance = totalIncome - monthlyExpenses - monthlyInstallments;

  // Build debt payoff events
  const activeDebts = state.liabilities.filter(
    l => l.status === LiabilityStatus.ACTIVE && l.installmentsCount > 0
  );

  const events: CalendarEvent[] = activeDebts.map(l => {
    const payoffDate = new Date(now.getFullYear(), now.getMonth() + l.installmentsCount, 1);
    const monthsAway = l.installmentsCount;
    const isUrgent = monthsAway <= 3;
    const isSoon = monthsAway <= 12;

    return {
      date: payoffDate,
      type: 'payoff',
      label: `${l.name} quitada`,
      subtitle: `${l.installmentsCount} parcela(s) restante(s) · ${fmt(l.installmentValue)}/mês`,
      amount: l.installmentValue,
      color: isUrgent ? 'emerald' : isSoon ? 'blue' : 'slate',
      icon: isUrgent ? (
        <CheckCircle size={18} className="text-emerald-500" />
      ) : isSoon ? (
        <Clock size={18} className="text-blue-500" />
      ) : (
        <CalendarDays size={18} className="text-slate-400" />
      ),
    };
  });

  // Sort events by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build month-by-month view for next 24 months
  interface MonthView {
    date: Date;
    events: CalendarEvent[];
    cumulativeFreed: number;
    projectedBalance: number;
  }

  const monthViews: MonthView[] = [];
  let cumulativeFreed = 0;

  for (let i = 0; i <= 24; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const monthEvents = events.filter(e =>
      e.date.getFullYear() === d.getFullYear() &&
      e.date.getMonth() === d.getMonth()
    );
    const freed = monthEvents.reduce((s, e) => s + e.amount, 0);
    cumulativeFreed += freed;

    if (monthEvents.length > 0) {
      monthViews.push({
        date: d,
        events: monthEvents,
        cumulativeFreed,
        projectedBalance: monthlyBalance + cumulativeFreed,
      });
    }
  }

  // Next 6 months summary (even without events)
  const next6: { date: Date; balance: number; debtsActive: number; installments: number }[] = [];
  {
    let runningFreed = 0;
    let runningInstallments = monthlyInstallments;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      // Check if any debt ends this month
      const endingDebts = activeDebts.filter(l => l.installmentsCount === i);
      endingDebts.forEach(l => { runningFreed += l.installmentValue; runningInstallments -= l.installmentValue; });
      const stillActive = activeDebts.filter(l => l.installmentsCount > i).length;
      next6.push({
        date: d,
        balance: totalIncome - monthlyExpenses - runningInstallments,
        debtsActive: stillActive,
        installments: runningInstallments,
      });
    }
  }

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    slate: 'bg-slate-50 border-slate-200',
  };

  const badgeMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Calendário Financeiro</h2>

      {/* Summary strip for next 6 months */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500" />
          Projeção dos próximos 6 meses
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {next6.map((m, i) => (
            <div key={i} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">{shortLabel(m.date)}</p>
              <p className={`text-sm font-bold mt-1 ${m.balance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                {fmt(m.balance)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{m.debtsActive} dívida(s)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Debt payoff timeline */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-indigo-500" />
          Linha do Tempo de Quitações
        </h3>

        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle size={40} className="text-emerald-300 mx-auto mb-3" />
            <p className="text-sm">Nenhuma dívida ativa com data de quitação calculada.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />

            <div className="space-y-4">
              {events.map((event, i) => (
                <div key={i} className="flex gap-4 items-start pl-0">
                  {/* Dot on line */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    event.color === 'emerald' ? 'border-emerald-300 bg-emerald-50' :
                    event.color === 'blue' ? 'border-blue-300 bg-blue-50' :
                    'border-slate-200 bg-white'
                  }`}>
                    {event.icon}
                  </div>

                  {/* Card */}
                  <div className={`flex-1 p-4 rounded-xl border ${colorMap[event.color]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{event.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{event.subtitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeMap[event.color]}`}>
                          {monthLabel(event.date)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Liberado: </span>
                        <span className="font-semibold text-emerald-600">{fmt(event.amount)}/mês</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cashflow impact table */}
      {monthViews.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-700 mb-4">Impacto no Saldo Mensal por Quitação</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Mês de quitação</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Dívida(s) quitada(s)</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Liberado no mês</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Liberado acumulado</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Saldo mensal previsto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50 bg-slate-50">
                  <td className="py-2 text-slate-500 font-medium">Hoje</td>
                  <td className="text-slate-400 text-xs">—</td>
                  <td className="text-right text-slate-400">—</td>
                  <td className="text-right text-slate-400">—</td>
                  <td className={`text-right font-semibold ${monthlyBalance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                    {fmt(monthlyBalance)}
                  </td>
                </tr>
                {monthViews.map((mv, i) => {
                  const freed = mv.events.reduce((s, e) => s + e.amount, 0);
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 text-slate-700 font-medium">{monthLabel(mv.date)}</td>
                      <td className="text-xs text-slate-500">
                        {mv.events.map(e => e.label.replace(' quitada', '')).join(', ')}
                      </td>
                      <td className="text-right text-emerald-600 font-medium">+{fmt(freed)}</td>
                      <td className="text-right text-indigo-600 font-medium">{fmt(mv.cumulativeFreed)}</td>
                      <td className={`text-right font-bold ${mv.projectedBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(mv.projectedBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All active debts quick view */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-base font-semibold text-slate-700 mb-4">Status das Dívidas Ativas</h3>
        {activeDebts.length === 0 ? (
          <div className="text-center py-4 text-emerald-500">
            <CheckCircle size={36} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhuma dívida ativa!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDebts
              .slice()
              .sort((a, b) => a.installmentsCount - b.installmentsCount)
              .map(l => {
                const payoffDate = new Date(now.getFullYear(), now.getMonth() + l.installmentsCount, 1);
                const pct = l.originalInstallments > 0
                  ? ((l.originalInstallments - l.installmentsCount) / l.originalInstallments) * 100
                  : 0;
                const isNear = l.installmentsCount <= 12;
                return (
                  <div key={l.id} className="p-4 border border-slate-100 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-700 text-sm">{l.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {l.installmentsCount} parcela(s) restante(s) · vence {monthLabel(payoffDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-700">{fmt(l.totalValue)}</p>
                        <p className="text-xs text-slate-400">{fmt(l.installmentValue)}/mês</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${isNear ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{pct.toFixed(0)}% pago</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialCalendar;
