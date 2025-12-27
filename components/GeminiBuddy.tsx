import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

interface GeminiBuddyProps {
  currentContext?: string; // Conteúdo da aula (opcional)
  systemContext?: string; // Contexto de navegação do sistema
  userName?: string;
  apiKey?: string | null;
  initialMessage?: string; // Mensagem inicial para "Welcome Back"
  onNavigate?: (courseId: string, lessonId: string) => void;
}

const GeminiBuddy: React.FC<GeminiBuddyProps> = ({
  currentContext = '',
  systemContext = 'Navegando no sistema',
  userName,
  apiKey,
  initialMessage,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  // Enhanced message type to support actions
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, action?: { label: string, courseId: string, lessonId: string } }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string>('gemini-1.5-flash');
  const [provider, setProvider] = useState<'google' | 'openai' | 'zhipu' | 'groq'>('google');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const [isDelayed, setIsDelayed] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayed(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Handle Initial Message with Action Parsing
  useEffect(() => {
    if (isDelayed) return; // Wait for delay

    if (initialMessage && messages.length === 0) {
      // Regex to find [[RESUME:courseId:lessonId]]
      const actionMatch = initialMessage.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
      let text = initialMessage;
      let action = undefined;

      if (actionMatch) {
        text = text.replace(actionMatch[0], ''); // Remove tag from text
        action = {
          label: 'Continuar de onde parou 🚀',
          courseId: actionMatch[1],
          lessonId: actionMatch[2]
        };
      }

      setIsOpen(true); // Auto-open for ANY initial message (Welcome or Resume)
      setMessages([{ role: 'ai', text, action }]);
    }
  }, [initialMessage, isDelayed]);

  // Detect Provider and Model
  useEffect(() => {
    if (!apiKey) return;

    if (apiKey.startsWith('sk-')) {
      setProvider('openai');
      setActiveModel('gpt-3.5-turbo');
      setDebugInfo('Provider: OpenAI detected');
      return;
    }

    if (apiKey.startsWith('gsk_')) {
      setProvider('groq');
      setActiveModel('llama-3.3-70b-versatile');
      setDebugInfo('Provider: Groq (Llama 3) detected');
      return;
    }

    // Zhipu keys format: id.secret
    if (apiKey.includes('.') && apiKey.length > 20 && !apiKey.startsWith('AIza')) {
      setProvider('zhipu');
      setActiveModel('glm-4-flash');
      setDebugInfo('Provider: Zhipu AI detected');
      return;
    }

    setProvider('google');
    // Google Auto-detect logic
    const findBestModel = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey });
        // @ts-ignore
        const result = await ai.models.list();
        const textResult = result as any;
        const models = textResult.models || textResult || [];

        const availableNames = Array.isArray(models)
          ? models.map((m: any) => (m.name || '').replace('models/', ''))
          : [];

        setDebugInfo(`Found: ${availableNames.join(', ')}`);

        // Priority list
        const candidates = [
          'gemini-1.5-flash',
          'gemini-1.5-flash-001',
          'gemini-1.5-pro',
          'gemini-1.5-pro-001',
          'gemini-pro',
          'gemini-1.0-pro'
        ];

        const best = candidates.find(c => availableNames.includes(c));

        if (best) {
          setActiveModel(best);
        } else {
          const fallback = availableNames.find((n: string) => n.includes('gemini'));
          if (fallback) setActiveModel(fallback);
        }
      } catch (e) {
        setDebugInfo(`List Error: ${(e as Error).message}`);
      }
    };

    findBestModel();
  }, [apiKey]);


  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setPrompt('');
    setIsLoading(true);

    const fullContext = `
      Contexto do Sistema: ${systemContext}
      ${currentContext ? `Conteúdo da Aula Atual: ${currentContext}` : ''}
    `;

    const systemInstruction = `
      Você é o 'Study Buddy', um assistente inteligente integrado à plataforma de ensino.
      Seu objetivo é ajudar o usuário ${userName || 'Estudante'} tanto com dúvidas sobre o conteúdo das aulas quanto com a navegação no sistema.
      
      Diretrizes:
      1. Se a pergunta for sobre a matéria (Java, POO, etc), explique de forma didática.
      2. Se a pergunta for sobre o sistema (Onde vejo notas? Como saio?), guie o usuário com base no contextos do sistema fornecido.
      3. IMPORTANTE: Use o HISTÓRICO DE ATIVIDADES para responder perguntas como "onde parei?", "o que fiz?", "qual foi a última aula?". O histórico mostra as ações recentes do usuário com timestamps.
      4. NAVEGAÇÃO: Quando o usuário pedir para retomar/voltar/acessar uma aula específica que aparece no histórico, você DEVE gerar um link clicável usando o formato: [[RESUME:ID_CURSO:ID_AULA]]. Exemplo: se no histórico aparece "Abriu a aula 'Decreto 7.005' [ID_CURSO:abc123|ID_AULA:xyz789]", você deve incluir na sua resposta: "[[RESUME:abc123:xyz789]]" e dizer algo como "Clique no botão abaixo para retomar."
      5. Seja sempre encorajador, paciente e educado.
      6. Responda em português do Brasil.
      7. IMPORTANTE: Mantenha a conversa natural e fluida. EVITE REPETIR saudações (como "Olá [Nome]") ou formalidades excessivas em cada resposta. Se já estiver conversando, vá direto à resposta.
    `;

    try {
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: [
              { role: "system", content: `${systemInstruction}\nContexto: ${fullContext}` },
              { role: "user", content: userMessage }
            ]
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro OpenAI');

        let aiResponse = data.choices[0]?.message?.content || "Sem resposta.";

        // Parse [[RESUME:courseId:lessonId]] action
        const actionMatch = aiResponse.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
        let action = undefined;
        if (actionMatch) {
          aiResponse = aiResponse.replace(actionMatch[0], '');
          action = {
            label: 'Retomar aula 🚀',
            courseId: actionMatch[1],
            lessonId: actionMatch[2]
          };
        }

        setMessages(prev => [...prev, { role: 'ai', text: aiResponse, action }]);

      } else if (provider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: [
              { role: "system", content: `${systemInstruction}\nContexto: ${fullContext}` },
              { role: "user", content: userMessage }
            ]
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro Groq');

        let aiResponse = data.choices[0]?.message?.content || "Sem resposta.";

        // Parse [[RESUME:courseId:lessonId]] action
        const actionMatch = aiResponse.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
        let action = undefined;
        if (actionMatch) {
          aiResponse = aiResponse.replace(actionMatch[0], '');
          action = {
            label: 'Retomar aula 🚀',
            courseId: actionMatch[1],
            lessonId: actionMatch[2]
          };
        }

        setMessages(prev => [...prev, { role: 'ai', text: aiResponse, action }]);

      } else if (provider === 'zhipu') {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: [
              { role: "system", content: `${systemInstruction}\nContexto: ${fullContext}` },
              { role: "user", content: userMessage }
            ],
            stream: false
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `Erro Zhipu: ${response.status}`);

        let aiResponse = data.choices[0]?.message?.content || "Sem resposta.";

        // Parse [[RESUME:courseId:lessonId]] action
        const actionMatch = aiResponse.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
        let action = undefined;
        if (actionMatch) {
          aiResponse = aiResponse.replace(actionMatch[0], '');
          action = {
            label: 'Retomar aula 🚀',
            courseId: actionMatch[1],
            lessonId: actionMatch[2]
          };
        }

        setMessages(prev => [...prev, { role: 'ai', text: aiResponse, action }]);

      } else {
        // Google Gemini
        const ai = new GoogleGenAI({ apiKey: apiKey! });
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: `Contexto: ${fullContext}\n\nDúvida: ${userMessage}`,
          config: { systemInstruction }
        });

        let aiResponse = response.text || "Sem resposta.";

        // Parse [[RESUME:courseId:lessonId]] action
        const actionMatch = aiResponse.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
        let action = undefined;
        if (actionMatch) {
          aiResponse = aiResponse.replace(actionMatch[0], '');
          action = {
            label: 'Retomar aula 🚀',
            courseId: actionMatch[1],
            lessonId: actionMatch[2]
          };
        }

        setMessages(prev => [...prev, { role: 'ai', text: aiResponse, action }]);
      }
    } catch (error) {
      console.error(error);
      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('429') || errorMessage.includes('quota')) errorMessage = "Cota excedida.";
        else if (errorMessage.includes('not found')) errorMessage = `Modelo indisponível.`;
        else if (errorMessage.includes('余额不足') || errorMessage.includes('insufficient balance')) errorMessage = "Saldo insuficiente (IA).";
      }
      setMessages(prev => [...prev, { role: 'ai', text: `Erro: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDelayed) return null;

  // Render Floating Widget
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} text-white text-2xl`}></i>
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-20 md:bottom-24 right-4 md:right-6 z-[9998] w-full max-w-[calc(100vw-2rem)] md:w-[380px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 translate-y-0 h-[450px] md:h-[500px]' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'
        }`}>
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-inner">
            <i className="fas fa-robot text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Study Buddy AI</h3>
            <p className="text-[10px] text-slate-400">Assistente Virtual Inteligente</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/95 backdrop-blur-sm">
          {!apiKey ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <i className="fas fa-lock text-2xl mb-2 opacity-50"></i>
              <p>IA não ativada. Contate o administrador.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-indigo-400 mb-4 animate-pulse">
                <i className="fas fa-comment-dots text-2xl"></i>
              </div>
              <p className="text-sm text-slate-300 font-medium">Olá! Como posso ajudar você hoje?</p>
              <p className="text-[10px] text-slate-500 mt-2">Pergunte sobre aulas ou sobre o sistema.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {m.action && onNavigate && (
                    <button
                      onClick={() => onNavigate(m.action!.courseId, m.action!.lessonId)}
                      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-play-circle"></i>
                      {m.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl px-4 py-3 flex gap-1.5 items-center border border-slate-700">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleAsk} className="p-3 bg-slate-800 border-t border-slate-700">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={apiKey ? "Digite sua dúvida..." : "Bloqueado"}
              disabled={!apiKey || isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!apiKey || isLoading || !prompt.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-indigo-400"
            >
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default GeminiBuddy;
