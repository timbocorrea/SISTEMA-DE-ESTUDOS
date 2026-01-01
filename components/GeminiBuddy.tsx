import React, { useState, useEffect, useRef } from 'react';
// Google SDK removed in favor of direct REST API for better compatibility

interface GeminiBuddyProps {
  currentContext?: string; // Conteúdo da aula (opcional)
  systemContext?: string; // Contexto de navegação do sistema
  userName?: string;
  apiKey?: string | null;
  initialMessage?: string; // Mensagem inicial para "Welcome Back"
  onNavigate?: (courseId: string, lessonId: string) => void;
}

// Module-level variable to track if welcome message has been shown in this session (resets on page reload)
let hasShownWelcome = false;

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Detect Provider and Model
  useEffect(() => {
    if (!apiKey) return;

    // Log masked key for verification (first 8 + last 4 chars)
    const maskedKey = apiKey.length > 12
      ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
      : apiKey.substring(0, 4) + '...';
    console.log(`🔑 [GeminiBuddy] API Key in use: ${maskedKey}`);

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
    // Google Auto-detect logic via REST
    const findBestModel = async () => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error(`List Error: ${response.status} ${response.statusText}`);

        const data = await response.json();
        const models = data.models || [];

        const availableNames = Array.isArray(models)
          ? models.map((m: any) => (m.name || '').replace('models/', ''))
          : [];

        setDebugInfo(`Found: ${availableNames.join(', ')}`);
        console.log('Gemini Models Found:', availableNames);

        // Priority list
        const candidates = [
          'gemini-flash-latest',
          'gemini-1.5-flash',
          'gemini-1.5-flash-001',
          'gemini-1.5-flash-8b',
          'gemini-1.5-pro',
          'gemini-1.5-pro-001',
          'gemini-pro',
          'gemini-pro-latest',
          'gemini-1.0-pro',
          'gemini-2.0-flash-exp',
          'gemini-2.0-flash'
        ];

        const best = candidates.find(c => availableNames.includes(c));

        if (best) {
          console.log('Gemini: Selected Best Model:', best);
          setActiveModel(best);
        } else {
          // If no preferred model found but API works, keep default or pick first gemini
          const fallback = availableNames.find((n: string) => n.includes('gemini'));
          if (fallback) setActiveModel(fallback);
        }
      } catch (e) {
        const msg = (e as Error).message;
        console.error('Gemini Model List Error:', msg);
        setDebugInfo(`List Error: ${msg} (Using default)`);
      }
    };

    findBestModel();
  }, [apiKey]);


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
      if (provider === 'openai') {
        // OpenAI Vision Payload
        const messagesPayload: any[] = [
          { role: "system", content: `${systemInstruction}\nContexto: ${fullContext}` }
        ];

        if (selectedImage) {
          messagesPayload.push({
            role: "user",
            content: [
              { type: "text", text: userMessage || "Analise esta imagem." },
              { type: "image_url", image_url: { url: selectedImage } }
            ]
          });
        } else {
          messagesPayload.push({ role: "user", content: userMessage });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel === 'gpt-3.5-turbo' ? 'gpt-4o' : activeModel, // Force GPT-4o for vision if needed, or assume user selected a vision model
            messages: messagesPayload
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
        // Groq (Llama 3 Vision support varies, keeping text-only for now unless selectedImage is present then warn or try)
        // Llama 3.2 11B/90B supports vision. 'llama-3.3-70b-versatile' is text only? 
        // For safety, warn if image sent to non-vision model, or try standard format.

        if (selectedImage) {
          throw new Error("Envio de imagens ainda não suportado para Groq/Llama neste ambiente.");
        }

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
        // Action parsing...
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
        if (selectedImage) {
          // Zhipu Vision (GLM-4V) payload is slightly different or requires specific model
          // implementation skipped for brevity/safety unless requested
          throw new Error("Envio de imagens não configurado para Zhipu.");
        }
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
        // Google Gemini via REST API (Supports Inline Data)

        const parts: any[] = [{ text: `Contexto: ${fullContext}\n\nDúvida: ${userMessage || "Analise a imagem."}` }];

        if (selectedImage) {
          // selectedImage is "data:image/png;base64,..."
          // Extract mimetype and base64 data
          const match = selectedImage.match(/^data:(.+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const data = match[2];
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: data
              }
            });
          }
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }],
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || `Erro Google: ${response.status}`);
        }

        let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";

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
        else if (errorMessage.includes('not found')) errorMessage = `Modelo indisponível ou não suporta imagens.`;
        else if (errorMessage.includes('余额不足') || errorMessage.includes('insufficient balance')) errorMessage = "Saldo insuficiente (IA).";
      }
      setMessages(prev => [...prev, { role: 'ai', text: `Erro: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null); // Clear image after sending
    }
  };

  if (isDelayed) return null;

  // Render Floating Widget
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} text-white text-2xl`}></i>
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-20 md:bottom-24 right-4 md:right-6 z-40 w-full max-w-[calc(100vw-2rem)] md:w-[380px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 translate-y-0 h-[450px] md:h-[500px]' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'
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
              placeholder={apiKey ? "Digite sua dúvida..." : "Bloqueado"}
              disabled={!apiKey || isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!apiKey || isLoading || (!prompt.trim() && !selectedImage)}
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
