import React, { useState } from 'react';
import { Transaction, TransactionType, Recurrence, Asset, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, TrendingUp, Briefcase } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TransactionsManagerProps {
  transactions: Transaction[];
  assets: Asset[];
  onUpdate: (transactions: Transaction[]) => void;
}

const CHART_COLORS = ['#00d4aa', '#6366f1', '#f0b429', '#f43f5e', '#60a5fa', '#a78bfa', '#34d399', '#fb923c'];

const TOOLTIP_STYLE = {
  background: '#0f1a2e',
  border: '1px solid #1e2d40',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
};

const INPUT_CLASS = "w-full bg-[#0a1628] border border-[#1e2d40] text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors placeholder-slate-600";
const LABEL_CLASS = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const TransactionsManager: React.FC<TransactionsManagerProps> = ({ transactions, assets, onUpdate }) => {
  const [formData, setFormData] = useState({
    description: '',
    type: TransactionType.EXPENSE,
    category: '',
    amount: 0,
    recurrence: Recurrence.VARIABLE,
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate([...transactions, { ...formData, id: crypto.randomUUID(), isPaid: false }]);
    setFormData({ ...formData, description: '', amount: 0, category: '' });
  };

  const handleDelete = (id: string) => {
    onUpdate(transactions.filter(t => t.id !== id));
  };

  const handleTypeChange = (type: TransactionType) => {
    setFormData({ ...formData, type, category: '' });
  };

  const categories = formData.type === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const totalActiveIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPassiveIncome = assets.reduce((sum, asset) => {
    return sum + (asset.currentValue * ((asset.monthlyYield || 0) / 100));
  }, 0);

  const totalMacroIncome = totalActiveIncome + totalPassiveIncome;
  const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const balance = totalMacroIncome - totalExpense;

  const expenseByCategory = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => {
      const cat = t.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const categoryChartData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const incomeByCategory = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => {
      const cat = t.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const incomeCategoryData = Object.entries(incomeByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Receitas & Despesas</h2>
        <p className="text-slate-500 text-sm mt-0.5">Controle seu fluxo de caixa mensal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Novo Lançamento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={LABEL_CLASS}>Descrição</label>
                <input required type="text" placeholder="Ex: Salário Mensal" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={INPUT_CLASS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>Tipo</label>
                  <select value={formData.type}
                    onChange={e => handleTypeChange(e.target.value as TransactionType)}
                    className={INPUT_CLASS}>
                    <option value={TransactionType.INCOME}>Receita</option>
                    <option value={TransactionType.EXPENSE}>Despesa</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Valor (R$)</label>
                  <input required type="number" step="0.01" value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className={INPUT_CLASS} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>Categoria</label>
                <input required type="text" list="tx-categories" placeholder="Selecione ou digite"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className={INPUT_CLASS} />
                <datalist id="tx-categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className={LABEL_CLASS}>Recorrência</label>
                <select value={formData.recurrence}
                  onChange={e => setFormData({ ...formData, recurrence: e.target.value as Recurrence })}
                  className={INPUT_CLASS}>
                  {Object.values(Recurrence).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Data</label>
                <input type="date" value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className={INPUT_CLASS} />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#00d4aa', color: '#070b11' }}
              >
                <Plus size={17} strokeWidth={2.5} />
                Adicionar
              </button>
            </form>
          </div>

          {/* Category pie chart */}
          {categoryChartData.length > 0 && (
            <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Gastos por Categoria</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={60} dataKey="value" paddingAngle={3}>
                      {categoryChartData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Macro income banner */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5" style={{ borderLeft: '3px solid #00d4aa' }}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ArrowUpCircle size={14} color="#00d4aa" />
              Visão Macro de Renda
            </h3>
            <div className="grid grid-cols-3 gap-4 divide-x divide-[#1a2640]">
              <div className="pr-4">
                <p className="text-slate-600 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Briefcase size={11} /> Ativa
                </p>
                <p className="text-xl font-bold text-slate-100">
                  R$ {totalActiveIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="px-4">
                <p className="text-slate-600 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp size={11} /> Passiva
                </p>
                <p className="text-xl font-bold text-[#6366f1]">
                  R$ {totalPassiveIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="pl-4">
                <p className="text-slate-600 text-xs uppercase tracking-wider mb-1">Total</p>
                <p className="text-xl font-bold" style={{ color: '#00d4aa' }}>
                  R$ {totalMacroIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Income / Expense summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Receitas</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                R$ {totalMacroIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Despesas</p>
              <p className="text-xl font-bold text-red-400 mt-1">
                R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Saldo</p>
              <p className={`text-xl font-bold mt-1 ${balance >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Breakdown lists */}
          {(categoryChartData.length > 0 || incomeCategoryData.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryChartData.length > 0 && (
                <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Despesas</h4>
                  <div className="space-y-2">
                    {categoryChartData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-slate-400 text-xs">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-slate-200 text-xs">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                          <span className="text-slate-600 text-xs ml-1">({totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {incomeCategoryData.length > 0 && (
                <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Receitas</h4>
                  <div className="space-y-2">
                    {incomeCategoryData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-slate-400 text-xs">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-emerald-400 text-xs">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                          <span className="text-slate-600 text-xs ml-1">({totalActiveIncome > 0 ? ((item.value / totalActiveIncome) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transaction table */}
          <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a2640]">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Histórico de Lançamentos</h3>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full">
                <thead className="sticky top-0">
                  <tr className="border-b border-[#1a2640] bg-[#0a1221]">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Descrição</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Categoria</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-[#1a2640] hover:bg-[#152038] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-200">
                          {t.type === TransactionType.INCOME
                            ? <ArrowUpCircle size={15} color="#00d4aa" className="shrink-0" />
                            : <ArrowDownCircle size={15} color="#f43f5e" className="shrink-0" />}
                          <span>{t.description}</span>
                        </div>
                        <div className="text-xs text-slate-600 ml-6 mt-0.5">{t.recurrence}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-[#1a2640] rounded text-xs text-slate-500">{t.category || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{t.date}</td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button onClick={() => handleDelete(t.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-600 text-sm">
                        Nenhum lançamento cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsManager;
