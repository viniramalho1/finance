import React, { useState } from 'react';
import { Asset, AssetType, Liquidity } from '../types';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Coins } from 'lucide-react';

interface AssetsManagerProps {
  assets: Asset[];
  onUpdate: (assets: Asset[]) => void;
}

const AssetsManager: React.FC<AssetsManagerProps> = ({ assets, onUpdate }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState = {
    name: '',
    type: AssetType.INVESTMENT,
    currentValue: 0,
    acquisitionValue: 0,
    acquisitionDate: new Date().toISOString().split('T')[0],
    liquidity: Liquidity.MEDIUM,
    monthlyYield: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(assets.map(a => a.id === editingId ? { ...a, ...formData, id: editingId } : a));
    } else {
      onUpdate([...assets, { ...formData, id: crypto.randomUUID() }]);
    }
    setFormData(initialFormState);
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este ativo?')) {
      onUpdate(assets.filter(a => a.id !== id));
    }
  };

  const handleEdit = (asset: Asset) => {
    setFormData({
        name: asset.name,
        type: asset.type,
        currentValue: asset.currentValue,
        acquisitionValue: asset.acquisitionValue,
        acquisitionDate: asset.acquisitionDate,
        liquidity: asset.liquidity,
        monthlyYield: asset.monthlyYield || 0
    });
    setEditingId(asset.id);
    setIsFormOpen(true);
  };

  const calculateReturn = (current: number, initial: number) => {
    if (initial === 0) return 0;
    return ((current - initial) / initial) * 100;
  };

  const calculateMonthlyIncome = (value: number, yieldRate: number) => {
    return value * (yieldRate / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Meus Ativos</h2>
        <button
          onClick={() => {
            setFormData(initialFormState);
            setEditingId(null);
            setIsFormOpen(!isFormOpen);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Novo Ativo
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Editar Ativo' : 'Cadastrar Ativo'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Nome do Ativo</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Ex: Tesouro Direto 2035" />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700">Tipo</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as AssetType})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                    {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Liquidez</label>
                <select value={formData.liquidity} onChange={e => setFormData({...formData, liquidity: e.target.value as Liquidity})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                    {Object.values(Liquidity).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Valor Atual (R$)</label>
                <input required type="number" step="0.01" value={formData.currentValue} onChange={e => setFormData({...formData, currentValue: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Valor de Aquisição (R$)</label>
                <input required type="number" step="0.01" value={formData.acquisitionValue} onChange={e => setFormData({...formData, acquisitionValue: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Data de Aquisição</label>
                <input required type="date" value={formData.acquisitionDate} onChange={e => setFormData({...formData, acquisitionDate: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Rendimento Mensal Estimado (%)</label>
                <input 
                    type="number" 
                    step="0.01" 
                    value={formData.monthlyYield} 
                    onChange={e => setFormData({...formData, monthlyYield: parseFloat(e.target.value)})} 
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="Ex: 0.8" 
                />
                <p className="text-xs text-slate-500 mt-1">Gera aprox. R$ {calculateMonthlyIncome(formData.currentValue, formData.monthlyYield).toLocaleString('pt-BR', {minimumFractionDigits: 2})} / mês</p>
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Atual</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rentabilidade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Renda Passiva</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Liquidez</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {assets.map((asset) => {
                        const roi = calculateReturn(asset.currentValue, asset.acquisitionValue);
                        const monthlyIncome = calculateMonthlyIncome(asset.currentValue, asset.monthlyYield || 0);
                        
                        return (
                        <tr key={asset.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{asset.name}</div>
                                <div className="text-xs text-slate-500">{asset.type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">R$ {asset.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`flex items-center gap-1 ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {roi >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                                    {roi.toFixed(2)}% (Total)
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                    <Coins size={16} />
                                    R$ {monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    <span className="text-xs text-slate-400 font-normal">({asset.monthlyYield || 0}%)</span>
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${asset.liquidity === Liquidity.HIGH ? 'bg-green-100 text-green-800' : 
                                      asset.liquidity === Liquidity.MEDIUM ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-red-100 text-red-800'}`}>
                                    {asset.liquidity}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleEdit(asset)} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 size={18}/></button>
                                <button onClick={() => handleDelete(asset.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    )})}
                    {assets.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum ativo cadastrado.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AssetsManager;