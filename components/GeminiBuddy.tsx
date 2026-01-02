import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createSupabaseClient } from '../services/supabaseClient';

interface GeminiBuddyProps {
  currentContext?: string; // Conteúdo da aula (opcional)
  systemContext?: string; // Contexto de navegação do sistema
  userName?: string;
  initialMessage?: string; // Mensagem inicial para "Welcome Back"
  onNavigate?: (courseId: string, lessonId: string) => void;
}

// Module-level variable to track if welcome message has been shown in this session (resets on page reload)
let hasShownWelcome = false;

const GeminiBuddy: React.FC<GeminiBuddyProps> = ({
  currentContext = '',
  systemContext = 'Navegando no sistema',
  userName,
  initialMessage,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  // Enhanced message type to support actions
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, action?: { label: string, courseId: string, lessonId: string } }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Client for Edge Functions
  const supabase = createSupabaseClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

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

    // Check if welcome message was already shown in this session using module variable
    if (hasShownWelcome) return;

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

      // Mark as shown for this session
      hasShownWelcome = true;

      // Auto-close após 5 segundos
      const autoCloseTimer = setTimeout(() => {
        setIsOpen(false);
      }, 5000);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [initialMessage, isDelayed]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && !selectedImage) || isLoading) return;

    const userMessage = prompt;
    // Show image in chat history if present
    const displayMessage = selectedImage ?
      (userMessage ? `${userMessage}\n[Imagem enviada]` : '[Imagem enviada]')
      : userMessage;

    setMessages(prev => [...prev, { role: 'user', text: displayMessage }]);
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
      8. VISÃO (Imagens): Se o usuário enviar uma imagem, analise-a detalhadamente. Pode ser um código, um diagrama ou uma captura de tela de erro. Ajudar a resolver o problema mostrado.
    `;

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          messages: [
            { role: 'system', text: `${systemInstruction}\nContexto: ${fullContext}` },
            { role: 'user', text: userMessage || 'Analise a imagem.' }
          ]
        }
      });

      if (error) throw new Error(error.message || 'Erro ao comunicar com a IA');

      const aiResponse = data.response;

      // Parse [[RESUME:courseId:lessonId]] action
      const actionMatch = aiResponse.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
      let action: { label: string; courseId: string; lessonId: string } | undefined = undefined;

      if (actionMatch) {
        const cleanResponse = aiResponse.replace(actionMatch[0], '');
        action = {
          label: 'Retomar aula 🚀',
          courseId: actionMatch[1],
          lessonId: actionMatch[2]
        };
        setMessages(prev => [...prev, { role: 'ai', text: cleanResponse, action }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      }

    } catch (error) {
      console.error(error);
      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setMessages(prev => [...prev, { role: 'ai', text: `Erro: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  // Determine relative position based on route (Lesson pages have a mobile footer)
  const location = useLocation();
  const isLessonPage = location.pathname.includes('/lesson/');
  const mobileBottomClass = isLessonPage ? 'bottom-24' : 'bottom-6';

  if (isDelayed) return null;

  // Render Floating Widget
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir assistente IA"
        className={`fixed ${mobileBottomClass} md:bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${isOpen
          ? 'bg-red-500 rotate-90'
          : 'bg-indigo-600 md:bg-indigo-600/40 md:hover:bg-indigo-600 md:hover:shadow-indigo-600/40 backdrop-blur-sm'
          }`}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} text-white text-2xl`}></i>
      </button>

      {/* Chat Window */}
      <div className={`fixed ${isLessonPage ? 'bottom-40' : 'bottom-24'} md:bottom-24 right-4 md:right-6 z-40 w-full max-w-[calc(100vw-2rem)] md:w-[380px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 translate-y-0 h-[450px] md:h-[500px]' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'
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
          {messages.length === 0 ? (
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
          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-slate-600 object-cover" />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs border border-white shadow-sm hover:bg-red-600 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${selectedImage
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              title="Enviar imagem"
              disabled={isLoading}
            >
              <i className="fas fa-paperclip"></i>
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePaste}
              placeholder="Digite sua dúvida (IA do Sistema)..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={isLoading || (!prompt.trim() && !selectedImage)}
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
