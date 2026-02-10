import React, { useState } from 'react';
import { Transaction, TransactionType, Recurrence, Asset } from '../types';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, TrendingUp, Briefcase } from 'lucide-react';

interface TransactionsManagerProps {
  transactions: Transaction[];
  assets: Asset[];
  onUpdate: (transactions: Transaction[]) => void;
}

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

  // Active Income (Salary, freelance, etc.)
  const totalActiveIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  
  // Passive Income (From Assets Yield)
  const totalPassiveIncome = assets.reduce((sum, asset) => {
    return sum + (asset.currentValue * ((asset.monthlyYield || 0) / 100));
  }, 0);

  const totalMacroIncome = totalActiveIncome + totalPassiveIncome;

  const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Novo Lançamento / Salário</h3>
            <p className="text-sm text-slate-500 mb-4">Adicione aqui seu salário ou outras receitas manuais.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Descrição</label>
                    <input required type="text" placeholder="Ex: Salário Mensal" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Tipo</label>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TransactionType})} className="mt-1 block w-full rounded-md border-slate-300 border p-2">
                            <option value={TransactionType.INCOME}>Receita</option>
                            <option value={TransactionType.EXPENSE}>Despesa</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Valor</label>
                        <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 border p-2" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Categoria</label>
                    <input required type="text" placeholder="Ex: Mercado, Salário" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 border p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Recorrência</label>
                    <select value={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.value as Recurrence})} className="mt-1 block w-full rounded-md border-slate-300 border p-2">
                         {Object.values(Recurrence).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <button type="submit" className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <Plus size={18} /> Adicionar
                </button>
            </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* Macro View Card */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowUpCircle className="text-emerald-400" />
                Visão Macro de Renda
            </h3>
            <div className="grid grid-cols-3 gap-4 divide-x divide-slate-700">
                <div className="px-2">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Briefcase size={12} /> Salário / Ativa
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
                <p className="text-emerald-600 text-sm font-medium">Receitas Totais (Macro)</p>
                <p className="text-2xl font-bold text-emerald-700">R$ {totalMacroIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
             </div>
             <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-red-600 text-sm font-medium">Despesas Estimadas</p>
                <p className="text-2xl font-bold text-red-700">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
             </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 p-6 border-b border-slate-100">Histórico de Lançamentos (Ativo)</h3>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Descrição</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Categoria</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 flex items-center gap-2">
                                    {t.type === TransactionType.INCOME ? <ArrowUpCircle size={16} className="text-emerald-500"/> : <ArrowDownCircle size={16} className="text-red-500"/>}
                                    {t.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs">{t.category}</span>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsManager;