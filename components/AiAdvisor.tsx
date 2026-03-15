import React, { useState } from 'react';
import { FinancialState } from '../types';
import { analyzeFinances } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Send, Loader2, Brain } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Consultor IA</h2>
        <p className="text-slate-500 text-sm mt-0.5">Análise financeira inteligente com IA</p>
      </div>

      {/* Hero card */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-2xl p-7 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #00d4aa, transparent)', transform: 'translate(30%, -30%)' }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #00d4aa22, #6366f122)' }}>
              <Brain size={22} color="#00d4aa" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100">Análise Inteligente</h3>
              <p className="text-xs text-slate-500">Powered by Google Gemini</p>
            </div>
          </div>

          <p className="text-slate-400 text-sm max-w-xl leading-relaxed mb-6">
            Utilize nossa IA para analisar sua saúde financeira, identificar oportunidades de economia e simular cenários futuros com base nos seus dados reais.
          </p>

          <button
            onClick={() => handleAnalysis()}
            disabled={loading}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #0099cc)', color: '#070b11' }}
          >
            {loading && !question ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            Gerar Análise Completa
          </button>
        </div>
      </div>

      {/* Question input */}
      <div className="bg-[#0f1a2e] border border-[#1a2640] rounded-xl p-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Simulações & Perguntas</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && question && !loading) handleAnalysis(question); }}
            placeholder="Ex: Se eu quitar o financiamento do carro, como fica meu fluxo de caixa?"
            className="flex-1 bg-[#0a1628] border border-[#1e2d40] text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors placeholder-slate-600"
          />
          <button
            onClick={() => handleAnalysis(question)}
            disabled={loading || !question}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: '#1a2640', color: '#94a3b8' }}
          >
            {loading && question ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>

        {/* Response area */}
        {loading && (
          <div className="mt-6 text-center py-10">
            <Loader2 size={28} className="animate-spin mx-auto mb-3" color="#00d4aa" />
            <p className="text-slate-500 text-sm">Analisando seus dados financeiros...</p>
          </div>
        )}

        {response && !loading && (
          <div className="mt-6 bg-[#0a1221] border border-[#1a2640] rounded-xl p-6 animate-fade-in prose-dark">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}

        {!response && !loading && (
          <div className="text-center py-10 text-slate-600">
            <Brain size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Os resultados da análise aparecerão aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAdvisor;
