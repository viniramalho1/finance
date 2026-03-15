import React, { useState } from 'react';
import { Liability, LiabilityType, LiabilityStatus, AppSettings, LIABILITY_CATEGORIES } from '../types';
import { Plus, Trash2, Edit2, Settings, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface LiabilitiesManagerProps {
  liabilities: Liability[];
  settings: AppSettings;
  onUpdate: (liabilities: Liability[]) => void;
  onSettingsUpdate: (settings: AppSettings) => void;
}

const LiabilitiesManager: React.FC<LiabilitiesManagerProps> = ({
  liabilities, settings, onUpdate, onSettingsUpdate
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'total' | 'installments'>('total');
  const [showSettings, setShowSettings] = useState(false);

  const initialFormState = {
    name: '',
    type: LiabilityType.CREDIT_CARD,
    category: 'Consumo',
    totalValue: 0,
    interestRate: 0,
    installmentsCount: 12,
    installmentValue: 0,
    originalInstallments: 12,
    startDate: new Date().toISOString().split('T')[0],
    status: LiabilityStatus.ACTIVE,
  };

  const [formData, setFormData] = useState(initialFormState);

  const computedTotalValue = inputMode === 'installments'
    ? formData.installmentsCount * formData.installmentValue
    : formData.totalValue;

  const totalCost = formData.installmentsCount * formData.installmentValue;
  const interestCost = Math.max(0, totalCost - computedTotalValue);

  const getPayoffDate = (months: number) => {
    if (months <= 0) return 'Quitada';
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const getMonthlyInterest = (l: Liability) => l.totalValue * (l.interestRate / 100);
  const getMonthlyPrincipal = (l: Liability) => Math.max(0, l.installmentValue - getMonthlyInterest(l));
  const getTotalInterestRemaining = (l: Liability) =>
    Math.max(0, l.installmentValue * l.installmentsCount - l.totalValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTotal = inputMode === 'installments'
      ? formData.installmentsCount * formData.installmentValue
      : formData.totalValue;

    const payload = {
      ...formData,
      totalValue: finalTotal,
      originalInstallments: editingId
        ? Math.max(formData.installmentsCount, liabilities.find(l => l.id === editingId)?.originalInstallments ?? formData.installmentsCount)
        : formData.installmentsCount,
    };

    if (editingId) {
      onUpdate(liabilities.map(l => l.id === editingId ? { ...l, ...payload, id: editingId } : l));
    } else {
      onUpdate([...liabilities, { ...payload, id: crypto.randomUUID() }]);
    }
    setFormData(initialFormState);
    setIsFormOpen(false);
    setEditingId(null);
    setInputMode('total');
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
      category: item.category || '',
      totalValue: item.totalValue,
      interestRate: item.interestRate,
      installmentsCount: item.installmentsCount,
      installmentValue: item.installmentValue,
      originalInstallments: item.originalInstallments || item.installmentsCount,
      startDate: item.startDate,
      status: item.status,
    });
    setEditingId(item.id);
    setInputMode('total');
    setIsFormOpen(true);
  };

  const totalDebt = liabilities.filter(l => l.status === LiabilityStatus.ACTIVE).reduce((s, l) => s + l.totalValue, 0);
  const totalInstallments = liabilities.filter(l => l.status === LiabilityStatus.ACTIVE).reduce((s, l) => s + l.installmentValue, 0);
  const totalInterestAll = liabilities.filter(l => l.status === LiabilityStatus.ACTIVE).reduce((s, l) => s + getTotalInterestRemaining(l), 0);
  const totalMonthlyInterest = liabilities.filter(l => l.status === LiabilityStatus.ACTIVE).reduce((s, l) => s + getMonthlyInterest(l), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-slate-800">Passivos e Dívidas</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm"
          >
            <Settings size={16} />
            Configurações
            {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => { setFormData(initialFormState); setEditingId(null); setInputMode('total'); setIsFormOpen(!isFormOpen); }}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus size={20} />
            Nova Dívida
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fade-in-down">
          <h4 className="font-semibold text-slate-700 mb-3">Redução Automática de Parcelas</h4>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Dia do mês para redução automática</label>
              <input
                type="number" min="1" max="28"
                value={settings.debtReduceDay}
                onChange={e => onSettingsUpdate({ ...settings, debtReduceDay: parseInt(e.target.value) || 1 })}
                className="w-24 border border-slate-300 rounded-md p-2 text-sm"
              />
            </div>
            <div className="text-sm text-slate-500">
              {settings.lastReducedMonth
                ? `✅ Última redução aplicada em: ${settings.lastReducedMonth}`
                : '⏳ Nenhuma redução automática aplicada ainda'}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Todo dia {settings.debtReduceDay} de cada mês, 1 parcela será subtraída de todas as dívidas ativas ao abrir o aplicativo.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <p className="text-red-600 text-xs font-medium uppercase">Dívida Total Ativa</p>
          <p className="text-xl font-bold text-red-700 mt-1">R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
          <p className="text-orange-600 text-xs font-medium uppercase">Parcelas Mensais</p>
          <p className="text-xl font-bold text-orange-700 mt-1">R$ {totalInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <p className="text-amber-600 text-xs font-medium uppercase">Juros Mensais Est.</p>
          <p className="text-xl font-bold text-amber-700 mt-1">R$ {totalMonthlyInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
          <p className="text-yellow-700 text-xs font-medium uppercase">Total de Juros Futuros</p>
          <p className="text-xl font-bold text-yellow-800 mt-1">R$ {totalInterestAll.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Editar Dívida' : 'Cadastrar Dívida'}</h3>

          <div className="mb-5">
            <p className="text-sm font-medium text-slate-600 mb-2">Como deseja informar o valor?</p>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 w-fit text-sm">
              <button
                type="button"
                onClick={() => setInputMode('total')}
                className={`px-4 py-2 transition-colors ${inputMode === 'total' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Informar saldo devedor
              </button>
              <button
                type="button"
                onClick={() => setInputMode('installments')}
                className={`px-4 py-2 transition-colors ${inputMode === 'installments' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Calcular pelo parcelamento
              </button>
            </div>
            {inputMode === 'installments' && (
              <p className="text-xs text-slate-400 mt-1">O saldo devedor será calculado automaticamente: parcelas × valor.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Descrição da Dívida</label>
              <input required type="text" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Financiamento do Carro"
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 shadow-sm sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo</label>
              <select value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as LiabilityType })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm">
                {Object.values(LiabilityType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Categoria</label>
              <input list="liability-categories" value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Habitação"
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
              <datalist id="liability-categories">
                {LIABILITY_CATEGORIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as LiabilityStatus })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm">
                {Object.values(LiabilityStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Juros (% a.m.)</label>
              <input type="number" step="0.01" min="0" value={formData.interestRate}
                onChange={e => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
            </div>

            {inputMode === 'total' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Saldo Devedor Atual (R$)</label>
                <input required type="number" step="0.01" value={formData.totalValue}
                  onChange={e => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Valor da Parcela (R$)</label>
              <input required type="number" step="0.01" value={formData.installmentValue}
                onChange={e => setFormData({ ...formData, installmentValue: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nº Parcelas Restantes</label>
              <input required type="number" min="1" value={formData.installmentsCount}
                onChange={e => setFormData({ ...formData, installmentsCount: parseInt(e.target.value) || 1 })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Data de Início</label>
              <input type="date" value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-slate-300 border p-2 sm:text-sm" />
            </div>

            {/* Debt analysis preview */}
            {formData.installmentValue > 0 && formData.installmentsCount > 0 && (
              <div className="md:col-span-2 bg-slate-50 rounded-lg p-4 text-sm">
                <p className="font-semibold text-slate-700 mb-3">Análise da Dívida</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-slate-500 text-xs">Saldo devedor</p>
                    <p className="font-bold text-red-600">R$ {computedTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Total a pagar</p>
                    <p className="font-bold text-slate-800">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Custo de juros</p>
                    <p className="font-bold text-amber-600">R$ {interestCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Quitação prevista</p>
                    <p className="font-bold text-slate-700">{getPayoffDate(formData.installmentsCount)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dívida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Saldo / Parcela</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Progresso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Juros</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quitação</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {liabilities.map((item) => {
                const orig = item.originalInstallments || item.installmentsCount || 1;
                const paid = orig - item.installmentsCount;
                const progress = Math.min(100, (paid / orig) * 100);
                const monthlyInterest = getMonthlyInterest(item);
                const monthlyPrincipal = getMonthlyPrincipal(item);
                const remainingInterest = getTotalInterestRemaining(item);

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.name}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">{item.type}</span>
                        {item.category && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.category}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-slate-500">R$ {item.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês ({item.installmentsCount}x rest.)</div>
                    </td>
                    <td className="px-4 py-4" style={{ minWidth: '140px' }}>
                      <div className="text-xs text-slate-500 mb-1">{paid}/{orig} pagas</div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{progress.toFixed(0)}% quitado</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {item.interestRate > 0 ? (
                        <div className="text-xs space-y-0.5">
                          <div className="text-slate-600 font-medium">{item.interestRate}% a.m.</div>
                          <div className="text-amber-600">Juros: R$ {monthlyInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          <div className="text-emerald-600">Principal: R$ {monthlyPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          {remainingInterest > 0 && (
                            <div className="text-red-500">Total juros: R$ {remainingInterest.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sem juros</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Calendar size={12} />
                        {getPayoffDate(item.installmentsCount)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full
                        ${item.status === LiabilityStatus.PAID ? 'bg-green-100 text-green-800' :
                          item.status === LiabilityStatus.ACTIVE ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
              {liabilities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Nenhuma dívida cadastrada.</td>
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
