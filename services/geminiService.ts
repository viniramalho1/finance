import { GoogleGenAI } from "@google/genai";
import { FinancialState } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeFinances = async (state: FinancialState, userQuestion?: string): Promise<string> => {
  const client = getClient();
  if (!client) return "Erro: Chave API não configurada. Por favor, verifique suas configurações.";

  const totalAssets = state.assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLiabilities = state.liabilities.reduce((sum, l) => sum + l.totalValue, 0);
  const netWorth = totalAssets - totalLiabilities;
  const monthlyIncome = state.transactions
    .filter(t => t.type === 'Receita')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = state.transactions
    .filter(t => t.type === 'Despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const context = `
    Você é um consultor financeiro especialista. Analise os seguintes dados do usuário (valores em BRL):
    
    Patrimônio Líquido: ${netWorth.toFixed(2)}
    Total Ativos: ${totalAssets.toFixed(2)}
    Total Passivos (Dívidas): ${totalLiabilities.toFixed(2)}
    Receita Mensal Estimada: ${monthlyIncome.toFixed(2)}
    Despesa Mensal Estimada: ${monthlyExpenses.toFixed(2)}

    Detalhes dos Ativos: ${JSON.stringify(state.assets.map(a => ({ nome: a.name, tipo: a.type, valor: a.currentValue, liquidez: a.liquidity })))}
    Detalhes dos Passivos: ${JSON.stringify(state.liabilities.map(l => ({ nome: l.name, tipo: l.type, valorTotal: l.totalValue, parcela: l.installmentValue, juros: l.interestRate })))}
    
    Instrução: ${userQuestion ? `O usuário perguntou: "${userQuestion}". Responda especificamente a isso com base nos dados.` : "Forneça uma análise resumida da saúde financeira, identifique riscos (como alta dívida ou baixa liquidez) e sugira 3 ações práticas para melhorar o patrimônio."}
    
    Formate a resposta em Markdown, use listas com bolinhas para facilitar a leitura. Seja direto e encorajador.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context,
    });
    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, ocorreu um erro ao conectar com o assistente inteligente.";
  }
};