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
  monthlyYield?: number;
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
  category: string;
  totalValue: number;
  originalInstallments: number;
  interestRate: number;
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

export interface AppSettings {
  debtReduceDay: number;
  lastReducedMonth: string;
}

export interface FinancialState {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  settings: AppSettings;
}

export type ViewState = 'DASHBOARD' | 'ASSETS' | 'LIABILITIES' | 'CASHFLOW' | 'ADVISOR';

export const LIABILITY_CATEGORIES = [
  'Habitação', 'Veículo', 'Educação', 'Saúde', 'Eletrônicos',
  'Viagem', 'Emergência', 'Pessoal', 'Outros'
];

export const EXPENSE_CATEGORIES = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação',
  'Lazer', 'Vestuário', 'Assinaturas', 'Utilidades', 'Outros'
];

export const INCOME_CATEGORIES = [
  'Salário', 'Freelance', 'Aluguel', 'Dividendos', 'Rendimentos',
  'Vendas', 'Bônus', 'Pensão', 'Outros'
];
