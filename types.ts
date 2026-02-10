export enum AssetType {
  CASH = 'Dinheiro',
  REAL_ESTATE = 'Imóvel',
  VEHICLE = 'Veículo',
  INVESTMENT = 'Investimento',
  CRYPTO = 'Criptomoeda',
  OTHER = 'Outros'
}

export enum Liquidity {
  HIGH = 'Alta',
  MEDIUM = 'Média',
  LOW = 'Baixa'
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currentValue: number;
  acquisitionValue: number;
  acquisitionDate: string;
  liquidity: Liquidity;
  monthlyYield?: number; // Porcentagem de rendimento mensal (0 a 100)
}

export enum LiabilityType {
  CREDIT_CARD = 'Cartão de Crédito',
  LOAN = 'Empréstimo',
  FINANCING = 'Financiamento',
  INSTALLMENT = 'Parcelamento',
  OTHER = 'Outros'
}

export enum LiabilityStatus {
  ACTIVE = 'Ativa',
  PAID = 'Quitada',
  LATE = 'Atrasada'
}

export interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  totalValue: number;
  interestRate: number; // % ao mês
  installmentsCount: number;
  installmentValue: number;
  startDate: string;
  status: LiabilityStatus;
}

export enum TransactionType {
  INCOME = 'Receita',
  EXPENSE = 'Despesa'
}

export enum Recurrence {
  FIXED = 'Fixa',
  VARIABLE = 'Variável',
  EVENTUAL = 'Eventual'
}

export interface Transaction {
  id: string;
  description: string;
  type: TransactionType;
  category: string;
  amount: number;
  recurrence: Recurrence;
  date: string;
  isPaid: boolean;
}

export interface FinancialState {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
}

export type ViewState = 'DASHBOARD' | 'ASSETS' | 'LIABILITIES' | 'CASHFLOW' | 'ADVISOR';