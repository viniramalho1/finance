import React from 'react';
import { FinancialState, AssetType, LiabilityType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Landmark, Coins, PiggyBank } from 'lucide-react';

interface DashboardProps {
  state: FinancialState;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const totalAssets = state.assets.reduce((sum, item) => sum + item.currentValue, 0);
  const totalLiabilities = state.liabilities.reduce((sum, item) => sum + item.totalValue, 0); // Remaining debt
  const netWorth = totalAssets - totalLiabilities;
  
  // Active Income (from Transactions)
  const monthlyActiveIncome = state.transactions
    .filter(t => t.type === 'Receita')
    .reduce((sum, t) => sum + t.amount, 0);

  // Passive Income (from Assets)
  const monthlyPassiveIncome = state.assets.reduce((sum, asset) => {
    return sum + (asset.currentValue * ((asset.monthlyYield || 0) / 100));
  }, 0);
    
  const monthlyExpenses = state.transactions
    .filter(t => t.type === 'Despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyInstallments = state.liabilities
    .filter(l => l.status === 'Ativa')
    .reduce((sum, l) => sum + l.installmentValue, 0);

  const totalMonthlyIncome = monthlyActiveIncome + monthlyPassiveIncome;
  const totalMonthlyOutflow = monthlyExpenses + monthlyInstallments;
  const monthlyBalance = totalMonthlyIncome - totalMonthlyOutflow;

  const assetData = state.assets.reduce((acc, asset) => {
    const existing = acc.find(item => item.name === asset.type);
    if (existing) {
      existing.value += asset.currentValue;
    } else {
      acc.push({ name: asset.type, value: asset.currentValue });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const cashFlowData = [
    { name: 'Renda Total', valor: totalMonthlyIncome, active: monthlyActiveIncome, passive: monthlyPassiveIncome },
    { name: 'Saídas Totais', valor: totalMonthlyOutflow, active: 0, passive: 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard Financeiro</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Patrimônio Bruto (Total Assets) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Patrimônio Bruto</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800">
                        R$ {totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <TrendingUp size={24} />
                </div>
            </div>
             <div className="mt-4 text-xs text-slate-400">Total de {state.assets.length} ativos</div>
        </div>

        {/* Dívida Total */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Dívida Total</p>
                    <h3 className="text-2xl font-bold mt-1 text-red-500">
                        R$ {totalLiabilities.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                    <TrendingDown size={24} />
                </div>
            </div>
             <div className="mt-4 text-xs text-slate-400">{state.liabilities.length} passivos</div>
        </div>

        {/* Patrimônio Líquido */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Patrimônio Líquido</p>
                    <h3 className={`text-2xl font-bold mt-1 ${netWorth >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        R$ {netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Landmark size={24} />
                </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Ativos - Passivos</div>
        </div>

        {/* Renda Mensal Total */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Renda Mensal Estimada</p>
                    <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                        R$ {totalMonthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <Coins size={24} />
                </div>
            </div>
             <div className="mt-4 text-xs text-slate-400">
                Ativa: {((monthlyActiveIncome/totalMonthlyIncome)*100 || 0).toFixed(0)}% | 
                Passiva: {((monthlyPassiveIncome/totalMonthlyIncome)*100 || 0).toFixed(0)}%
             </div>
        </div>

        {/* Parcelas Mensais */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Parcelas Mensais</p>
                    <h3 className="text-2xl font-bold mt-1 text-orange-500">
                        R$ {monthlyInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <Wallet size={24} />
                </div>
            </div>
             <div className="mt-4 text-xs text-slate-400">Comprometimento de dívidas</div>
        </div>

        {/* Saldo Mensal (Previsto) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Saldo Mensal (Previsto)</p>
                    <h3 className={`text-2xl font-bold mt-1 ${monthlyBalance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                        R$ {monthlyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
                <div className={`p-2 rounded-lg ${monthlyBalance >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>
                    <PiggyBank size={24} />
                </div>
            </div>
             <div className="mt-4 text-xs text-slate-400">Renda - (Despesas + Parcelas)</div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Allocation */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribuição de Ativos</h3>
          <div className="h-64 w-full">
            {assetData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={assetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {assetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400">Sem dados de ativos</div>
            )}
          </div>
        </div>

        {/* Income vs Expense */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Fluxo Mensal Estimado (Macro)</h3>
           <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cashFlowData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Legend />
                <Bar dataKey="valor" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 justify-center text-sm">
             <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span>Entrada Ativa: R$ {monthlyActiveIncome.toLocaleString('pt-BR')}</span>
             </div>
             <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span>Entrada Passiva: R$ {monthlyPassiveIncome.toLocaleString('pt-BR')}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;