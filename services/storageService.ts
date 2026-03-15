import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  FinancialState, AssetType, Liquidity, LiabilityType,
  LiabilityStatus, TransactionType, Recurrence
} from '../types';

const DOC_REF = doc(db, 'users', 'default');

export const DEFAULT_STATE: FinancialState = {
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
      category: 'Habitação',
      totalValue: 175986,
      originalInstallments: 408,
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
      category: 'Salário',
      amount: 4000,
      recurrence: Recurrence.FIXED,
      date: new Date().toISOString().split('T')[0],
      isPaid: true
    }
  ],
  settings: {
    debtReduceDay: 10,
    lastReducedMonth: ''
  }
};

export const saveState = async (state: FinancialState): Promise<void> => {
  console.log('[Firebase] Salvando dados...');
  try {
    await setDoc(DOC_REF, {
      assets: JSON.parse(JSON.stringify(state.assets)),
      liabilities: JSON.parse(JSON.stringify(state.liabilities)),
      transactions: JSON.parse(JSON.stringify(state.transactions)),
      settings: JSON.parse(JSON.stringify(state.settings)),
    });
    console.log('[Firebase] Dados salvos com sucesso!');
  } catch (error) {
    console.error('[Firebase] ERRO ao salvar:', error);
  }
};

export const subscribeToState = (
  callback: (state: FinancialState) => void
): (() => void) => {
  console.log('[Firebase] Iniciando listener em users/default...');
  return onSnapshot(DOC_REF, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      console.log('[Firebase] Documento encontrado:', data);
      // Normalize with backward-compat defaults
      const normalized: FinancialState = {
        assets: data.assets || DEFAULT_STATE.assets,
        liabilities: (data.liabilities || DEFAULT_STATE.liabilities).map((l: any) => ({
          ...l,
          category: l.category || '',
          originalInstallments: l.originalInstallments || l.installmentsCount || 1,
        })),
        transactions: data.transactions || DEFAULT_STATE.transactions,
        settings: data.settings || { debtReduceDay: 10, lastReducedMonth: '' },
      };
      callback(normalized);
    } else {
      console.log('[Firebase] Documento não existe, criando com dados padrão...');
      saveState(DEFAULT_STATE);
      callback(DEFAULT_STATE);
    }
  }, (error) => {
    console.error('[Firebase] ERRO no listener:', error);
    callback(DEFAULT_STATE);
  });
};
