import React, { useState } from 'react';
import { Asset, AssetType, Liquidity } from '../types';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Coins, X } from 'lucide-react';

interface AssetsManagerProps {
  assets: Asset[];
  onUpdate: (assets: Asset[]) => void;
}

const INPUT_CLASS = "w-full bg-[#0a1628] border border-[#1e2d40] text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors placeholder-slate-600";
const LABEL_CLASS = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

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

  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalPassive = assets.reduce((s, a) => s + calculateMonthlyIncome(a.currentValue, a.monthlyYield || 0), 0);

  const liquidityColor = (l: Liquidity) => {
    if (l === Liquidity.HIGH) return { text: '#00d4aa', bg: 'bg-[#00d4aa]/10 border border-[#00d4aa]/20' };
    if (l === Liquidity.MEDIUM) return { text: '#f0b429', bg: 'bg-[#f0b429]/10 border border-[#f0b429]/20' };
    return { text: '#f43f5e', bg: 'bg-[#f43f5e]/10 border border-[#f43f5e]/20' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Ativos & Bens</h2>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie seus investimentos e patrimônio</p>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormState);
            setEditingId(null);
            setIsFormOpen(!isFormOpen);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: '#00d4aa', color: '#070b11' }}
        >
          <Plus size={17} strokeWidth={2.5} />
          Novo Ativo
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total em Ativos</p>
          <p className="text-xl font-bold text-slate-100 mt-1">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Renda Passiva Mensal</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#00d4aa' }}>
            R$ {totalPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Quantidade</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{assets.length} ativo(s)</p>
        </div>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6 animate-fade-in-down">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-200">
              {editingId ? 'Editar Ativo' : 'Cadastrar Ativo'}
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-600 hover:text-slate-400">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className={LABEL_CLASS}>Nome do Ativo</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={INPUT_CLASS}
                placeholder="Ex: Tesouro Direto 2035"
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Tipo</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as AssetType })}
                className={INPUT_CLASS}
              >
                {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Liquidez</label>
              <select
                value={formData.liquidity}
                onChange={e => setFormData({ ...formData, liquidity: e.target.value as Liquidity })}
                className={INPUT_CLASS}
              >
                {Object.values(Liquidity).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Valor Atual (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.currentValue}
                onChange={e => setFormData({ ...formData, currentValue: parseFloat(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Valor de Aquisição (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.acquisitionValue}
                onChange={e => setFormData({ ...formData, acquisitionValue: parseFloat(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Data de Aquisição</label>
              <input
                required
                type="date"
                value={formData.acquisitionDate}
                onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Rendimento Mensal Estimado (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.monthlyYield}
                onChange={e => setFormData({ ...formData, monthlyYield: parseFloat(e.target.value) })}
                className={INPUT_CLASS}
                placeholder="Ex: 0.8"
              />
              {formData.monthlyYield > 0 && (
                <p className="text-xs mt-1.5" style={{ color: '#00d4aa' }}>
                  Gera aprox. R$ {calculateMonthlyIncome(formData.currentValue, formData.monthlyYield).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                </p>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 text-slate-400 bg-[#1a2640] rounded-lg hover:bg-[#253547] transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#00d4aa', color: '#070b11' }}
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#1a2640]">
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Nome</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Valor Atual</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Rentabilidade</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Renda Passiva</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Liquidez</th>
                <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const roi = calculateReturn(asset.currentValue, asset.acquisitionValue);
                const monthlyIncome = calculateMonthlyIncome(asset.currentValue, asset.monthlyYield || 0);
                const liqStyle = liquidityColor(asset.liquidity);

                return (
                  <tr key={asset.id} className="border-b border-[#1a2640] hover:bg-[#152038] transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-slate-200">{asset.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{asset.type}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-100">
                        R$ {asset.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`flex items-center gap-1 text-sm font-medium ${roi >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                        {roi >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                        {roi.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-sm font-medium" style={{ color: '#00d4aa' }}>
                        <Coins size={14} />
                        R$ {monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-xs text-slate-600 font-normal">({asset.monthlyYield || 0}%)</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${liqStyle.bg}`} style={{ color: liqStyle.text }}>
                        {asset.liquidity}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <button onClick={() => handleEdit(asset)} className="text-slate-600 hover:text-[#00d4aa] mr-3 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(asset.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-600 text-sm">
                    Nenhum ativo cadastrado. Clique em "Novo Ativo" para começar.
                  </td>
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
