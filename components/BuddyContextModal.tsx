import React, { useState, useEffect, useRef } from 'react';

interface BuddyContextModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialContext: string;
    apiKey?: string | null;
    userName?: string;
    onAddToNote?: (text: string) => void;
    existingNoteContent?: string;
}

const BuddyContextModal: React.FC<BuddyContextModalProps> = ({ isOpen, onClose, initialContext, apiKey, userName, onAddToNote, existingNoteContent }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [activeModel, setActiveModel] = useState<string>('gemini-1.5-flash');
    const [provider, setProvider] = useState<'google' | 'openai' | 'zhipu' | 'groq'>('google');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-fill prompt or just set context? 
    // User wants to ask questions ABOUT the text. so prompt is empty, context is set hiddenly.
    // We can show the context in the modal context area.

    useEffect(() => {
        if (isOpen) {
            setMessages([]);
            setPrompt('');

            const buddyRegex = /🤖 \**Buddy:?\**/i;
            if (existingNoteContent && buddyRegex.test(existingNoteContent)) {
                const parts = existingNoteContent.split(/🤖 Buddy:|🤖 \*\*Buddy:\*\*/); // Handle both old and new formats
                const history: { role: 'user' | 'ai', text: string }[] = [];

                if (parts[0].trim()) {
                    history.push({ role: 'user', text: parts[0].trim() });
                }

                for (let i = 1; i < parts.length; i++) {
                    const segment = parts[i].trim();
                    if (segment) {
                        history.push({ role: 'ai', text: segment });
                    }
                }

                if (history.length > 0) {
                    setMessages(history);
                }
            }
        }
    }, [isOpen, existingNoteContent]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Detect Provider and Model (Copied from GeminiBuddy for consistency)
    useEffect(() => {
        if (!apiKey) return;

        if (apiKey.startsWith('sk-')) {
            setProvider('openai');
            setActiveModel('gpt-3.5-turbo');
            return;
        }

        if (apiKey.startsWith('gsk_')) {
            setProvider('groq');
            setActiveModel('llama-3.3-70b-versatile');
            return;
        }

        // Zhipu keys format: id.secret
        if (apiKey.includes('.') && apiKey.length > 20 && !apiKey.startsWith('AIza')) {
            setProvider('zhipu');
            setActiveModel('glm-4-flash');
            return;
        }

        setProvider('google');
        // Google Auto-detect logic via REST
        const findBestModel = async () => {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (!response.ok) return;

                const data = await response.json();
                const models = data.models || [];

                const availableNames = Array.isArray(models)
                    ? models.map((m: any) => (m.name || '').replace('models/', ''))
                    : [];

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
                    setActiveModel(best);
                } else {
                    const fallback = availableNames.find((n: string) => n.includes('gemini'));
                    if (fallback) setActiveModel(fallback);
                }
            } catch (e) {
                console.error('Gemini Model List Error:', e);
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

        const systemInstruction = `
      Você é o 'Study Buddy', um assistente inteligente.
      O usuário selecionou um trecho de texto da aula para tirar dúvidas.
      
      Texto Selecionado (Contexto):
      """
      ${initialContext}
      """
      
      Responda à dúvida do usuário com base APENAS ou PRINCIPALMENTE nesse texto selecionado.
      Seja didático e direto.

      IMPORTANTE: Forneça a resposta em TEXTO PURO (Plain Text).
      - NÃO use formatação Markdown como **negrito**, # cabeçalhos ou blocos de código.
      - Para listas, use apenas hifens (-) ou números simples.
      - O texto será lido em um editor simples, então evite caracteres de formatação.
    `;

        try {
            if (provider === 'openai') {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey} `
                    },
                    body: JSON.stringify({
                        model: activeModel,
                        messages: [
                            { role: "system", content: systemInstruction },
                            { role: "user", content: userMessage }
                        ]
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || 'Erro OpenAI');

                let aiResponse = data.choices[0]?.message?.content || "Sem resposta.";
                setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);

            } else if (provider === 'groq') {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey} `
                    },
                    body: JSON.stringify({
                        model: activeModel,
                        messages: [
                            { role: "system", content: systemInstruction },
                            { role: "user", content: userMessage }
                        ]
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || 'Erro Groq');

                let aiResponse = data.choices[0]?.message?.content || "Sem resposta.";
                setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);

            } else if (provider === 'zhipu') {
                const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey} `
                    },
                    body: JSON.stringify({
                        model: activeModel,
                        messages: [
                            { role: "system", content: systemInstruction },
                            { role: "user", content: userMessage }
                        ],
                        stream: false
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || `Erro Zhipu: ${response.status} `);

                let aiResponse = data.choices[0]?.message?.content || "Sem resposta.";
                setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);

            } else {
                // Google Gemini
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: userMessage }]
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
                setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
            }

        } catch (error) {
            console.error(error);
            let errorMessage = "Desculpe, não consegui processar sua dúvida no momento.";
            if (error instanceof Error) {
                // Show more specific info if possible, but keep it user friendly
                // e.g. "Quota exceeded" -> "Cota excedida"
                if (error.message.includes('429')) errorMessage = "Muitas requisições. Tente em instantes.";
                else if (error.message.includes('quota')) errorMessage = "Limite de uso da IA excedido.";
            }
            setMessages(prev => [...prev, { role: 'ai', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                            <i className="fas fa-robot"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Perguntar ao Buddy</h3>
                            <p className="text-xs text-slate-400">
                                {provider === 'google' ? 'Gemini' : provider === 'openai' ? 'GPT' : provider === 'groq' ? 'Llama' : 'GLM'}
                                &bull; {activeModel.replace('models/', '')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Selected Context Preview */}
                <div className="p-3 bg-slate-800/50 border-b border-slate-700">
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Texto Selecionado</p>
                    <p className="text-xs text-slate-300 italic border-l-2 border-indigo-500 pl-2 line-clamp-3">
                        "{initialContext}"
                    </p>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
                    {messages.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            <i className="fas fa-question-circle text-3xl mb-2 opacity-50"></i>
                            <p className="text-sm">O que você gostaria de saber sobre esse trecho?</p>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${m.role === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-200 border border-slate-700'
                                }`}>
                                <p className="whitespace-pre-wrap">{m.text}</p>

                                {m.role === 'ai' && onAddToNote && (
                                    <div className="mt-2 pt-2 border-t border-slate-700 flex justify-end">
                                        <button
                                            onClick={() => onAddToNote(m.text)}
                                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold transition-colors"
                                        >
                                            <i className="fas fa-plus-circle"></i>
                                            Adicionar à Nota
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 flex gap-1">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleAsk} className="p-4 border-t border-slate-700 bg-slate-800 rounded-b-2xl">
                    <div className="relative">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={apiKey ? "Digite sua pergunta..." : "Configuração de API necessária"}
                            disabled={!apiKey || isLoading}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!prompt.trim() || isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-indigo-500 hover:text-white hover:bg-indigo-600 rounded-lg transition-all disabled:opacity-30"
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default BuddyContextModal;
