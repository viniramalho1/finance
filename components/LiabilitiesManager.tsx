import React, { useState } from 'react';
import { Liability, LiabilityType, LiabilityStatus, AppSettings, LIABILITY_CATEGORIES } from '../types';
import { Plus, Trash2, Edit2, Settings, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';

interface LiabilitiesManagerProps {
  liabilities: Liability[];
  settings: AppSettings;
  onUpdate: (liabilities: Liability[]) => void;
  onSettingsUpdate: (settings: AppSettings) => void;
}

const INPUT_CLASS = "w-full bg-[#0a1628] border border-[#1e2d40] text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors placeholder-slate-600";
const LABEL_CLASS = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

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

  const statusStyle = (s: LiabilityStatus) => {
    if (s === LiabilityStatus.PAID) return { text: '#00d4aa', bg: 'bg-[#00d4aa]/10 border border-[#00d4aa]/20' };
    if (s === LiabilityStatus.ACTIVE) return { text: '#60a5fa', bg: 'bg-blue-500/10 border border-blue-500/20' };
    return { text: '#f43f5e', bg: 'bg-red-500/10 border border-red-500/20' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Dívidas & Passivos</h2>
          <p className="text-slate-500 text-sm mt-0.5">Controle e elimine suas dívidas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-[#1a2640] text-slate-400 px-3 py-2.5 rounded-lg hover:bg-[#253547] transition-colors text-sm"
          >
            <Settings size={15} />
            Configurações
            {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={() => { setFormData(initialFormState); setEditingId(null); setInputMode('total'); setIsFormOpen(!isFormOpen); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#f43f5e', color: '#fff' }}
          >
            <Plus size={17} strokeWidth={2.5} />
            Nova Dívida
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-5 animate-fade-in-down">
          <h4 className="font-semibold text-slate-300 mb-4 text-sm">Redução Automática de Parcelas</h4>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <label className={LABEL_CLASS}>Dia do mês para redução automática</label>
              <input
                type="number" min="1" max="28"
                value={settings.debtReduceDay}
                onChange={e => onSettingsUpdate({ ...settings, debtReduceDay: parseInt(e.target.value) || 1 })}
                className="w-24 bg-[#0a1628] border border-[#1e2d40] text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors"
              />
            </div>
            <div className="text-sm text-slate-500">
              {settings.lastReducedMonth
                ? `Ultima reducao aplicada em: ${settings.lastReducedMonth}`
                : 'Nenhuma reducao automatica aplicada ainda'}
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Todo dia {settings.debtReduceDay} de cada mês, 1 parcela será subtraída de todas as dívidas ativas ao abrir o aplicativo.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
          <p className="text-red-400 text-xs font-medium uppercase tracking-wider">Dívida Total Ativa</p>
          <p className="text-xl font-bold text-red-400 mt-1.5">
            R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
          <p className="text-amber-400 text-xs font-medium uppercase tracking-wider">Parcelas Mensais</p>
          <p className="text-xl font-bold text-amber-400 mt-1.5">
            R$ {totalInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
          <p className="text-orange-400 text-xs font-medium uppercase tracking-wider">Juros Mensais Est.</p>
          <p className="text-xl font-bold text-orange-400 mt-1.5">
            R$ {totalMonthlyInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total de Juros Futuros</p>
          <p className="text-xl font-bold text-slate-300 mt-1.5">
            R$ {totalInterestAll.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6 animate-fade-in-down">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-200">
              {editingId ? 'Editar Dívida' : 'Cadastrar Dívida'}
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-600 hover:text-slate-400">
              <X size={18} />
            </button>
          </div>

          {/* Input mode toggle */}
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Como deseja informar o valor?</p>
            <div className="flex rounded-lg overflow-hidden border border-[#1a2640] w-fit text-sm">
              <button
                type="button"
                onClick={() => setInputMode('total')}
                className={`px-4 py-2 transition-colors ${inputMode === 'total' ? 'text-[#070b11] font-semibold' : 'bg-[#0a1628] text-slate-500 hover:text-slate-300'}`}
                style={inputMode === 'total' ? { background: '#f43f5e' } : {}}
              >
                Informar saldo devedor
              </button>
              <button
                type="button"
                onClick={() => setInputMode('installments')}
                className={`px-4 py-2 transition-colors ${inputMode === 'installments' ? 'text-[#070b11] font-semibold' : 'bg-[#0a1628] text-slate-500 hover:text-slate-300'}`}
                style={inputMode === 'installments' ? { background: '#f43f5e' } : {}}
              >
                Calcular pelo parcelamento
              </button>
            </div>
            {inputMode === 'installments' && (
              <p className="text-xs text-slate-600 mt-1.5">O saldo devedor será calculado automaticamente: parcelas × valor.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={LABEL_CLASS}>Descrição da Dívida</label>
              <input required type="text" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Financiamento do Carro"
                className={INPUT_CLASS} />
            </div>

            <div>
              <label className={LABEL_CLASS}>Tipo</label>
              <select value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as LiabilityType })}
                className={INPUT_CLASS}>
                {Object.values(LiabilityType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Categoria</label>
              <input list="liability-categories" value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Habitação"
                className={INPUT_CLASS} />
              <datalist id="liability-categories">
                {LIABILITY_CATEGORIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as LiabilityStatus })}
                className={INPUT_CLASS}>
                {Object.values(LiabilityStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Juros (% a.m.)</label>
              <input type="number" step="0.01" min="0" value={formData.interestRate}
                onChange={e => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={INPUT_CLASS} />
            </div>

            {inputMode === 'total' && (
              <div>
                <label className={LABEL_CLASS}>Saldo Devedor Atual (R$)</label>
                <input required type="number" step="0.01" value={formData.totalValue}
                  onChange={e => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                  className={INPUT_CLASS} />
              </div>
            )}

            <div>
              <label className={LABEL_CLASS}>Valor da Parcela (R$)</label>
              <input required type="number" step="0.01" value={formData.installmentValue}
                onChange={e => setFormData({ ...formData, installmentValue: parseFloat(e.target.value) || 0 })}
                className={INPUT_CLASS} />
            </div>

            <div>
              <label className={LABEL_CLASS}>Nº Parcelas Restantes</label>
              <input required type="number" min="1" value={formData.installmentsCount}
                onChange={e => setFormData({ ...formData, installmentsCount: parseInt(e.target.value) || 1 })}
                className={INPUT_CLASS} />
            </div>

            <div>
              <label className={LABEL_CLASS}>Data de Início</label>
              <input type="date" value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className={INPUT_CLASS} />
            </div>

            {/* Analysis preview */}
            {formData.installmentValue > 0 && formData.installmentsCount > 0 && (
              <div className="md:col-span-2 bg-[#0a1221] border border-[#1a2640] rounded-xl p-4 text-sm">
                <p className="font-semibold text-slate-400 mb-3 text-xs uppercase tracking-wider">Análise da Dívida</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-slate-600 text-xs">Saldo devedor</p>
                    <p className="font-bold text-red-400 mt-0.5">R$ {computedTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Total a pagar</p>
                    <p className="font-bold text-slate-300 mt-0.5">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Custo de juros</p>
                    <p className="font-bold text-amber-400 mt-0.5">R$ {interestCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Quitação prevista</p>
                    <p className="font-bold text-slate-300 mt-0.5">{getPayoffDate(formData.installmentsCount)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 text-slate-400 bg-[#1a2640] rounded-lg hover:bg-[#253547] transition-colors text-sm">
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors" style={{ background: '#f43f5e', color: '#fff' }}>
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
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Dívida</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Saldo / Parcela</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Progresso</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Juros</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Quitação</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Status</th>
                <th className="px-4 py-3.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-[#0a1221]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {liabilities.map((item) => {
                const orig = item.originalInstallments || item.installmentsCount || 1;
                const paid = orig - item.installmentsCount;
                const progress = Math.min(100, (paid / orig) * 100);
                const monthlyInterest = getMonthlyInterest(item);
                const monthlyPrincipal = getMonthlyPrincipal(item);
                const remainingInterest = getTotalInterestRemaining(item);
                const sStyle = statusStyle(item.status);

                return (
                  <tr key={item.id} className="border-b border-[#1a2640] hover:bg-[#152038] transition-colors">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-200">{item.name}</div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs text-slate-600">{item.type}</span>
                        {item.category && (
                          <span className="text-xs bg-[#1a2640] text-slate-500 px-1.5 py-0.5 rounded">{item.category}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-400">R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-slate-600 mt-0.5">R$ {item.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês ({item.installmentsCount}x rest.)</div>
                    </td>
                    <td className="px-4 py-4" style={{ minWidth: '140px' }}>
                      <div className="text-xs text-slate-600 mb-1.5">{paid}/{orig} pagas</div>
                      <div className="w-full bg-[#1a2640] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%`, background: progress > 70 ? '#00d4aa' : '#6366f1' }}
                        />
                      </div>
                      <div className="text-xs text-slate-600 mt-1">{progress.toFixed(0)}% quitado</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {item.interestRate > 0 ? (
                        <div className="text-xs space-y-0.5">
                          <div className="text-slate-400 font-medium">{item.interestRate}% a.m.</div>
                          <div className="text-amber-400">Juros: R$ {monthlyInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          <div style={{ color: '#00d4aa' }}>Principal: R$ {monthlyPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          {remainingInterest > 0 && (
                            <div className="text-red-400">Total juros: R$ {remainingInterest.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">Sem juros</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={11} />
                        {getPayoffDate(item.installmentsCount)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${sStyle.bg}`} style={{ color: sStyle.text }}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <button onClick={() => handleEdit(item)} className="text-slate-600 hover:text-[#00d4aa] mr-3 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {liabilities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-600 text-sm">
                    Nenhuma dívida cadastrada.
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

export default LiabilitiesManager;
