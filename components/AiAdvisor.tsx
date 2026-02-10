import React, { useState } from 'react';
import { FinancialState } from '../types';
import { analyzeFinances } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Send, Loader2 } from 'lucide-react';

interface AiAdvisorProps {
  state: FinancialState;
}

const AiAdvisor: React.FC<AiAdvisorProps> = ({ state }) => {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');

  const handleAnalysis = async (customQuestion?: string) => {
    setLoading(true);
    const result = await analyzeFinances(state, customQuestion);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
            <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="text-yellow-300" />
                    Consultor Inteligente
                </h2>
                <p className="text-indigo-100 max-w-xl">
                    Utilize nossa IA para analisar sua saúde financeira, identificar oportunidades de economia e simular cenários futuros.
                </p>
            </div>
        </div>

        <div className="mt-8">
            <button 
                onClick={() => handleAnalysis()}
                disabled={loading}
                className="bg-white text-indigo-600 px-6 py-3 rounded-full font-bold shadow hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                {loading && !question ? <Loader2 className="animate-spin" /> : 'Gerar Análise Completa'}
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Simulações e Perguntas</h3>
        <div className="flex gap-2 mb-6">
            <input 
                type="text" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex: Se eu quitar o financiamento do carro, como fica meu fluxo de caixa?"
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button 
                onClick={() => handleAnalysis(question)}
                disabled={loading || !question}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            >
                {loading && question ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Perguntar
            </button>
        </div>
        
        {response && (
             <div className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fade-in">
                <ReactMarkdown>{response}</ReactMarkdown>
            </div>
        )}

        {!response && !loading && (
            <div className="text-center py-12 text-slate-400">
                <p>Os resultados da análise aparecerão aqui.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AiAdvisor;