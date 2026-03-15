import React from 'react';
import { FinancialState, WealthSnapshot } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { History, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

interface WealthHistoryProps {
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

const WealthHistory: React.FC<WealthHistoryProps> = ({ state }) => {
  const history = (state.wealthHistory || [])
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));

  const formatLabel = (month: string): string => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  const chartData = history.map(s => ({
    label: formatLabel(s.month),
    'Ativos': s.totalAssets,
    'Patrimônio Líquido': s.netWorth,
    'Dívidas': s.totalLiabilities,
  }));

  const first = history[0];
  const last = history[history.length - 1];

  const netWorthChange = first && last ? last.netWorth - first.netWorth : 0;
  const assetsChange = first && last ? last.totalAssets - first.totalAssets : 0;
  const liabChange = first && last ? last.totalLiabilities - first.totalLiabilities : 0;

  const currentNetWorth = state.assets.reduce((s, a) => s + a.currentValue, 0)
    - state.liabilities.filter(l => l.status === 'Ativa').reduce((s, l) => s + l.totalValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Histórico de Patrimônio</h2>
        <p className="text-slate-500 text-sm mt-0.5">Evolução patrimonial ao longo do tempo</p>
      </div>

      {history.length === 0 ? (
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-12 text-center">
          <div className="p-4 rounded-full bg-[#1a2640] w-fit mx-auto mb-4">
            <History size={32} color="#475569" />
          </div>
          <h3 className="text-base font-semibold text-slate-400 mb-2">Histórico ainda vazio</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Um snapshot do seu patrimônio é salvo automaticamente todo mês.
            Volte no próximo mês para acompanhar a evolução do seu patrimônio ao longo do tempo.
          </p>
          <div className="mt-6 p-4 bg-[#0a1221] border border-[#1a2640] rounded-xl inline-block">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Patrimônio líquido hoje</p>
            <p className={`text-2xl font-bold mt-1 ${currentNetWorth >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
              {fmt(currentNetWorth)}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} color="#60a5fa" />
                <p className="text-xs text-slate-500 uppercase tracking-wider">Ativos</p>
              </div>
              <p className="text-2xl font-bold text-slate-100">{fmt(last?.totalAssets ?? 0)}</p>
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${assetsChange >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                {assetsChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {assetsChange >= 0 ? '+' : ''}{fmt(assetsChange)} desde {formatLabel(first.month)}
              </div>
            </div>

            <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} color="#f43f5e" />
                <p className="text-xs text-slate-500 uppercase tracking-wider">Dívidas</p>
              </div>
              <p className="text-2xl font-bold text-red-400">{fmt(last?.totalLiabilities ?? 0)}</p>
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${liabChange <= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                {liabChange <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                {liabChange >= 0 ? '+' : ''}{fmt(liabChange)} desde {formatLabel(first.month)}
              </div>
            </div>

            <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Landmark size={16} color="#00d4aa" />
                <p className="text-xs text-slate-500 uppercase tracking-wider">Patrimônio Líquido</p>
              </div>
              <p className={`text-2xl font-bold ${(last?.netWorth ?? 0) >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                {fmt(last?.netWorth ?? 0)}
              </p>
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${netWorthChange >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                {netWorthChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {netWorthChange >= 0 ? '+' : ''}{fmt(netWorthChange)} desde {formatLabel(first.month)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-300">Evolução Patrimonial</h3>
              <span className="text-xs text-slate-600">{history.length} snapshot(s)</span>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2640" />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => `R$${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number, name: string) => [fmt(v), name]} contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                  <Area type="monotone" dataKey="Ativos" stroke="#6366f1" fill="url(#gradAtivos)" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                  <Area type="monotone" dataKey="Patrimônio Líquido" stroke="#00d4aa" fill="url(#gradNet)" strokeWidth={2.5} dot={{ r: 3, fill: '#00d4aa' }} />
                  <Area type="monotone" dataKey="Dívidas" stroke="#f43f5e" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2, fill: '#f43f5e' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a2640]">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Snapshots Mensais</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a2640] bg-[#0a1221]">
                    <th className="text-left px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Mês</th>
                    <th className="text-right px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Ativos</th>
                    <th className="text-right px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Dívidas</th>
                    <th className="text-right px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Patrimônio Líquido</th>
                    <th className="text-right px-5 py-3 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Variação PL</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice().reverse().map((s, i, arr) => {
                    const prev = arr[i + 1];
                    const diff = prev ? s.netWorth - prev.netWorth : null;
                    return (
                      <tr key={s.month} className="border-b border-[#1a2640] hover:bg-[#152038] transition-colors">
                        <td className="px-5 py-3 text-slate-300 font-medium">{formatLabel(s.month)}</td>
                        <td className="text-right px-5 py-3 text-slate-400">{fmt(s.totalAssets)}</td>
                        <td className="text-right px-5 py-3 text-red-400">{fmt(s.totalLiabilities)}</td>
                        <td className={`text-right px-5 py-3 font-semibold ${s.netWorth >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                          {fmt(s.netWorth)}
                        </td>
                        <td className={`text-right px-5 py-3 text-xs font-medium ${diff === null ? 'text-slate-600' : diff >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                          {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${fmt(diff)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WealthHistory;
