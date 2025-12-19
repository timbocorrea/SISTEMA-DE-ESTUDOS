
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

interface GeminiBuddyProps {
  currentContext: string;
}

const GeminiBuddy: React.FC<GeminiBuddyProps> = ({ currentContext }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Contexto do curso: ${currentContext}\n\nDúvida do aluno: ${userMessage}`,
        config: {
          systemInstruction: "Você é o 'Study Buddy', um tutor acadêmico para estudantes de Análise e Desenvolvimento de Sistemas (ADS). Responda de forma didática e técnica, focando em conceitos de Engenharia de Software e POO."
        }
      });

      const aiResponse = response.text || "Desculpe, não consegui processar sua dúvida agora.";
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Erro ao conectar com o Study Buddy. Verifique sua conexão." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[500px] overflow-hidden">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
          <i className="fas fa-robot"></i>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">Study Buddy AI</h3>
          <p className="text-[10px] text-slate-400">Especialista em Engenharia de Software</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600 mb-3">
              <i className="fas fa-comment-dots text-xl"></i>
            </div>
            <p className="text-xs text-slate-500">Olá! Tem alguma dúvida sobre os conceitos desta aula?</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl px-4 py-2 text-sm flex gap-1 items-center">
              <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-75"></span>
              <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="p-4 border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Pergunte ao Buddy..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-4 pr-10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-300">
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeminiBuddy;
