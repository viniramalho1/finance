import React from 'react';
import { FinancialState, LiabilityStatus, TransactionType } from '../types';
import { CalendarDays, CheckCircle, Clock, TrendingUp } from 'lucide-react';

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
  urgency: 'high' | 'medium' | 'low';
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

  const activeDebts = state.liabilities.filter(
    l => l.status === LiabilityStatus.ACTIVE && l.installmentsCount > 0
  );

  const events: CalendarEvent[] = activeDebts.map(l => {
    const payoffDate = new Date(now.getFullYear(), now.getMonth() + l.installmentsCount, 1);
    const monthsAway = l.installmentsCount;
    const isUrgent = monthsAway <= 3;
    const isSoon = monthsAway <= 12;
    const urgency: 'high' | 'medium' | 'low' = isUrgent ? 'high' : isSoon ? 'medium' : 'low';

    return {
      date: payoffDate,
      type: 'payoff',
      label: `${l.name} quitada`,
      subtitle: `${l.installmentsCount} parcela(s) restante(s) · ${fmt(l.installmentValue)}/mês`,
      amount: l.installmentValue,
      urgency,
      icon: isUrgent ? (
        <CheckCircle size={16} color="#00d4aa" />
      ) : isSoon ? (
        <Clock size={16} color="#60a5fa" />
      ) : (
        <CalendarDays size={16} color="#475569" />
      ),
    };
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

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

  // Next 6 months summary
  const next6: { date: Date; balance: number; debtsActive: number; installments: number }[] = [];
  {
    let runningInstallments = monthlyInstallments;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      const endingDebts = activeDebts.filter(l => l.installmentsCount === i);
      endingDebts.forEach(l => { runningInstallments -= l.installmentValue; });
      const stillActive = activeDebts.filter(l => l.installmentsCount > i).length;
      next6.push({
        date: d,
        balance: totalIncome - monthlyExpenses - runningInstallments,
        debtsActive: stillActive,
        installments: runningInstallments,
      });
    }
  }

  const urgencyStyle = (u: 'high' | 'medium' | 'low') => {
    if (u === 'high') return {
      card: 'bg-[#00d4aa]/5 border-[#00d4aa]/20',
      badge: 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20',
      dot: 'border-[#00d4aa]/40 bg-[#00d4aa]/10',
    };
    if (u === 'medium') return {
      card: 'bg-blue-500/5 border-blue-500/20',
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      dot: 'border-blue-500/40 bg-blue-500/10',
    };
    return {
      card: 'bg-[#0a1221] border-[#1a2640]',
      badge: 'bg-[#1a2640] text-slate-500 border border-[#253547]',
      dot: 'border-[#253547] bg-[#1a2640]',
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Calendário Financeiro</h2>
        <p className="text-slate-500 text-sm mt-0.5">Linha do tempo de quitações e projeções</p>
      </div>

      {/* Next 6 months strip */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={14} color="#00d4aa" />
          Projeção — Próximos 6 meses
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {next6.map((m, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-[#0a1221] border border-[#1a2640]">
              <p className="text-xs font-medium text-slate-500">{shortLabel(m.date)}</p>
              <p className={`text-sm font-bold mt-1.5 ${m.balance >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                {fmt(m.balance)}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{m.debtsActive} dívida(s)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Debt payoff timeline */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
          <CalendarDays size={14} color="#6366f1" />
          Linha do Tempo de Quitações
        </h3>

        {events.length === 0 ? (
          <div className="text-center py-10 text-slate-600">
            <CheckCircle size={36} className="mx-auto mb-3 opacity-30" color="#00d4aa" />
            <p className="text-sm">Nenhuma dívida ativa com data de quitação calculada.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[#1a2640]" />

            <div className="space-y-4">
              {events.map((event, i) => {
                const style = urgencyStyle(event.urgency);
                return (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 ${style.dot}`}>
                      {event.icon}
                    </div>

                    <div className={`flex-1 p-4 rounded-xl border ${style.card}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{event.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{event.subtitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${style.badge}`}>
                            {monthLabel(event.date)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs">
                        <div>
                          <span className="text-slate-600">Liberado: </span>
                          <span className="font-semibold" style={{ color: '#00d4aa' }}>{fmt(event.amount)}/mês</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cashflow impact table */}
      {monthViews.length > 0 && (
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a2640]">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Impacto no Saldo Mensal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a2640] bg-[#0a1221]">
                  <th className="text-left px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Mês de quitação</th>
                  <th className="text-left px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Dívida(s) quitada(s)</th>
                  <th className="text-right px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Liberado no mês</th>
                  <th className="text-right px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Liberado acumulado</th>
                  <th className="text-right px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Saldo previsto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#1a2640] bg-[#0a1221]/50">
                  <td className="px-5 py-3 text-slate-500 font-medium text-sm">Hoje</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">—</td>
                  <td className="text-right px-5 py-3 text-slate-600 text-xs">—</td>
                  <td className="text-right px-5 py-3 text-slate-600 text-xs">—</td>
                  <td className={`text-right px-5 py-3 font-semibold text-sm ${monthlyBalance >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                    {fmt(monthlyBalance)}
                  </td>
                </tr>
                {monthViews.map((mv, i) => {
                  const freed = mv.events.reduce((s, e) => s + e.amount, 0);
                  return (
                    <tr key={i} className="border-b border-[#1a2640] hover:bg-[#152038] transition-colors">
                      <td className="px-5 py-3 text-slate-300 font-medium text-sm">{monthLabel(mv.date)}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {mv.events.map(e => e.label.replace(' quitada', '')).join(', ')}
                      </td>
                      <td className="text-right px-5 py-3 font-medium text-sm" style={{ color: '#00d4aa' }}>+{fmt(freed)}</td>
                      <td className="text-right px-5 py-3 text-[#6366f1] font-medium text-sm">{fmt(mv.cumulativeFreed)}</td>
                      <td className={`text-right px-5 py-3 font-bold text-sm ${mv.projectedBalance >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
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

      {/* Active debts status */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Status das Dívidas Ativas</h3>
        {activeDebts.length === 0 ? (
          <div className="text-center py-6" style={{ color: '#00d4aa' }}>
            <CheckCircle size={32} className="mx-auto mb-2" />
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
                  <div key={l.id} className="p-4 bg-[#0a1221] border border-[#1a2640] rounded-xl hover:border-[#253547] transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-slate-200 text-sm">{l.name}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {l.installmentsCount} parcela(s) restante(s) · vence {monthLabel(payoffDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-200">{fmt(l.totalValue)}</p>
                        <p className="text-xs text-slate-600">{fmt(l.installmentValue)}/mês</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#1a2640] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: isNear ? '#00d4aa' : '#6366f1' }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 shrink-0">{pct.toFixed(0)}% pago</span>
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
