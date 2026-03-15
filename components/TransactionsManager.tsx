import React, { useState } from 'react';
import { Transaction, TransactionType, Recurrence, Asset, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, TrendingUp, Briefcase } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TransactionsManagerProps {
  transactions: Transaction[];
  assets: Asset[];
  onUpdate: (transactions: Transaction[]) => void;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

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

  // Income calculations
  const totalActiveIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPassiveIncome = assets.reduce((sum, asset) => {
    return sum + (asset.currentValue * ((asset.monthlyYield || 0) / 100));
  }, 0);

  const totalMacroIncome = totalActiveIncome + totalPassiveIncome;
  const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

  // Spending by category
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

  // Income by category
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Novo Lançamento</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Descrição</label>
              <input required type="text" placeholder="Ex: Salário Mensal" value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 shadow-sm sm:text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tipo</label>
                <select value={formData.type}
                  onChange={e => handleTypeChange(e.target.value as TransactionType)}
                  className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm">
                  <option value={TransactionType.INCOME}>Receita</option>
                  <option value={TransactionType.EXPENSE}>Despesa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                <input required type="number" step="0.01" value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Categoria</label>
              <input required type="text" list="tx-categories" placeholder="Selecione ou digite"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
              <datalist id="tx-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Recorrência</label>
              <select value={formData.recurrence}
                onChange={e => setFormData({ ...formData, recurrence: e.target.value as Recurrence })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm">
                {Object.values(Recurrence).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Data</label>
              <input type="date" value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
            </div>
            <button type="submit" className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <Plus size={18} /> Adicionar
            </button>
          </form>
        </div>

        {/* Category charts */}
        {categoryChartData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-3">Gastos por Categoria</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={3}>
                    {categoryChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Macro View */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowUpCircle className="text-emerald-400" />
            Visão Macro de Renda
          </h3>
          <div className="grid grid-cols-3 gap-4 divide-x divide-slate-700">
            <div className="px-2">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                <Briefcase size={12} /> Ativa
              </p>
              <p className="text-xl font-bold">R$ {totalActiveIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="px-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                <TrendingUp size={12} /> Passiva (Ativos)
              </p>
              <p className="text-xl font-bold text-indigo-300">R$ {totalPassiveIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="px-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Mensal</p>
              <p className="text-xl font-bold text-emerald-400">R$ {totalMacroIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <p className="text-emerald-600 text-sm font-medium">Receitas Totais</p>
            <p className="text-2xl font-bold text-emerald-700">R$ {totalMacroIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <p className="text-red-600 text-sm font-medium">Despesas Lançadas</p>
            <p className="text-2xl font-bold text-red-700">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Spending breakdown */}
        {(categoryChartData.length > 0 || incomeCategoryData.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryChartData.length > 0 && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Despesas por Categoria</h4>
                <div className="space-y-2">
                  {categoryChartData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-slate-800">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs text-slate-400 ml-1">({totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {incomeCategoryData.length > 0 && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Receitas por Categoria</h4>
                <div className="space-y-2">
                  {incomeCategoryData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-emerald-700">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs text-slate-400 ml-1">({totalActiveIncome > 0 ? ((item.value / totalActiveIncome) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transaction table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <h3 className="text-base font-bold text-slate-800 p-6 border-b border-slate-100">Histórico de Lançamentos</h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        {t.type === TransactionType.INCOME
                          ? <ArrowUpCircle size={16} className="text-emerald-500 shrink-0" />
                          : <ArrowDownCircle size={16} className="text-red-500 shrink-0" />}
                        <span>{t.description}</span>
                      </div>
                      <div className="text-xs text-slate-400 ml-6">{t.recurrence}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">{t.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{t.date}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum lançamento cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsManager;
