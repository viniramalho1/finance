import { FinancialState, AssetType, Liquidity, LiabilityType, LiabilityStatus, TransactionType, Recurrence } from '../types';

const STORAGE_KEY = 'finhealth_pro_data_v1';

const DEFAULT_STATE: FinancialState = {
  assets: [
    {
      id: '1',
      name: 'Reserva de Emergência',
      type: AssetType.CASH,
      currentValue: 28000,
      acquisitionValue: 10000,
      acquisitionDate: '2023-01-15',
      liquidity: Liquidity.HIGH,
      monthlyYield: 1.85 
    },
    {
      id: '2',
      name: 'Apartamento Areal',
      type: AssetType.REAL_ESTATE,
      currentValue: 220000,
      acquisitionValue: 190000,
      acquisitionDate: '2025-07-20',
      liquidity: Liquidity.LOW,
      monthlyYield: 0.5 
    }
  ],
  liabilities: [
    {
      id: '1',
      name: 'Financiamento apto',
      type: LiabilityType.FINANCING,
      totalValue: 175986,
      interestRate: 1.5,
      installmentsCount: 408,
      installmentValue: 1012,
      startDate: '2022-08-10',
      status: LiabilityStatus.ACTIVE
    }
  ],
  transactions: [
    {
      id: '1',
      description: 'Salário Mensal',
      type: TransactionType.INCOME,
      category: 'Trabalho',
      amount: 4000,
      recurrence: Recurrence.FIXED,
      date: new Date().toISOString().split('T')[0],
      isPaid: true
    }
  ]
};

export const saveState = (state: FinancialState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state', error);
  }
};

export const loadState = (): FinancialState => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_STATE;
  } catch (error) {
    console.error('Failed to load state', error);
    return DEFAULT_STATE;
  }
};