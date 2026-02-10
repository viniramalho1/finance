import React, { useState } from 'react';
import { Liability, LiabilityType, LiabilityStatus } from '../types';
import { Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';

interface LiabilitiesManagerProps {
  liabilities: Liability[];
  onUpdate: (liabilities: Liability[]) => void;
}

const LiabilitiesManager: React.FC<LiabilitiesManagerProps> = ({ liabilities, onUpdate }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    name: '',
    type: LiabilityType.CREDIT_CARD,
    totalValue: 0,
    interestRate: 0,
    installmentsCount: 1,
    installmentValue: 0,
    startDate: new Date().toISOString().split('T')[0],
    status: LiabilityStatus.ACTIVE
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(liabilities.map(l => l.id === editingId ? { ...l, ...formData, id: editingId } : l));
    } else {
      onUpdate([...liabilities, { ...formData, id: crypto.randomUUID() }]);
    }
    setFormData(initialFormState);
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta dívida?')) {
      onUpdate(liabilities.filter(l => l.id !== id));
    }
  };

  const handleEdit = (item: Liability) => {
    setFormData({
        name: item.name,
        type: item.type,
        totalValue: item.totalValue,
        interestRate: item.interestRate,
        installmentsCount: item.installmentsCount,
        installmentValue: item.installmentValue,
        startDate: item.startDate,
        status: item.status
    });
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Passivos e Dívidas</h2>
        <button
          onClick={() => {
            setFormData(initialFormState);
            setEditingId(null);
            setIsFormOpen(!isFormOpen);
          }}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={20} />
          Nova Dívida
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Editar Dívida' : 'Cadastrar Dívida'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Descrição da Dívida</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2" />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700">Tipo</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as LiabilityType})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2">
                    {Object.values(LiabilityType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as LiabilityStatus})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2">
                    {Object.values(LiabilityStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Valor Total Devido (R$)</label>
                <input required type="number" step="0.01" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2" />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Valor da Parcela (R$)</label>
                <input required type="number" step="0.01" value={formData.installmentValue} onChange={e => setFormData({...formData, installmentValue: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2" />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Juros (% a.m.)</label>
                <input type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2" />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Nº de Parcelas Restantes</label>
                <input type="number" value={formData.installmentsCount} onChange={e => setFormData({...formData, installmentsCount: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2" />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Parcela</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Juros</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {liabilities.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{item.name}</div>
                                <div className="text-xs text-slate-500">{item.type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                                R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                R$ {item.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                <span className="text-xs text-slate-400 ml-1">({item.installmentsCount}x)</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                {item.interestRate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${item.status === LiabilityStatus.PAID ? 'bg-green-100 text-green-800' : 
                                      item.status === LiabilityStatus.ACTIVE ? 'bg-blue-100 text-blue-800' : 
                                      'bg-red-100 text-red-800'}`}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 size={18}/></button>
                                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                    {liabilities.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhuma dívida cadastrada.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default LiabilitiesManager;