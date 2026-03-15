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
      <h2 className="text-2xl font-bold text-slate-800">Histórico de Patrimônio</h2>

      {history.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center">
          <History size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Histórico ainda vazio</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Um snapshot do seu patrimônio é salvo automaticamente todo mês.
            Volte no próximo mês para acompanhar a evolução do seu patrimônio ao longo do tempo.
          </p>
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg inline-block">
            <p className="text-xs text-indigo-600 font-medium">Patrimônio líquido hoje</p>
            <p className={`text-2xl font-bold mt-1 ${currentNetWorth >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
              {fmt(currentNetWorth)}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-blue-500" />
                <p className="text-sm text-slate-500 font-medium">Ativos</p>
              </div>
              <p className="text-2xl font-bold text-slate-800">{fmt(last?.totalAssets ?? 0)}</p>
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${assetsChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {assetsChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {assetsChange >= 0 ? '+' : ''}{fmt(assetsChange)} desde {formatLabel(first.month)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={18} className="text-red-500" />
                <p className="text-sm text-slate-500 font-medium">Dívidas</p>
              </div>
              <p className="text-2xl font-bold text-red-500">{fmt(last?.totalLiabilities ?? 0)}</p>
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${liabChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {liabChange <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                {liabChange >= 0 ? '+' : ''}{fmt(liabChange)} desde {formatLabel(first.month)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Landmark size={18} className="text-indigo-500" />
                <p className="text-sm text-slate-500 font-medium">Patrimônio Líquido</p>
              </div>
              <p className={`text-2xl font-bold ${(last?.netWorth ?? 0) >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {fmt(last?.netWorth ?? 0)}
              </p>
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${netWorthChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {netWorthChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {netWorthChange >= 0 ? '+' : ''}{fmt(netWorthChange)} desde {formatLabel(first.month)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              Evolução Patrimonial — {history.length} snapshot(s) registrado(s)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAtivos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmt(v), name]}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Ativos" stroke="#6366f1" fill="url(#gradAtivos)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="Patrimônio Líquido" stroke="#10b981" fill="url(#gradNet)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="Dívidas" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Snapshots mensais</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-medium">Mês</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Ativos</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Dívidas</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Patrimônio Líquido</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Variação PL</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice().reverse().map((s, i, arr) => {
                    const prev = arr[i + 1];
                    const diff = prev ? s.netWorth - prev.netWorth : null;
                    return (
                      <tr key={s.month} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 text-slate-700 font-medium">{formatLabel(s.month)}</td>
                        <td className="text-right text-slate-600">{fmt(s.totalAssets)}</td>
                        <td className="text-right text-red-500">{fmt(s.totalLiabilities)}</td>
                        <td className={`text-right font-semibold ${s.netWorth >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                          {fmt(s.netWorth)}
                        </td>
                        <td className={`text-right text-xs font-medium ${diff === null ? 'text-slate-400' : diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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
