import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBuddyStore } from '../stores/useBuddyStore';
import { useBuddyClient } from '../hooks/useBuddyClient';
import { useAuth } from '../contexts/AuthContext';
import { useCourse } from '../contexts/CourseContext';
import { getRandomSuggestions, BuddySuggestion } from '../utils/buddySuggestions';
import MarkdownRenderer from './MarkdownRenderer';

interface GeminiBuddyProps {
  currentContext?: string; // Conteúdo da aula (opcional)
  systemContext?: string; // Contexto de navegação do sistema
  userName?: string;
  initialMessage?: string; // Mensagem inicial para "Welcome Back"
  onNavigate?: (courseId: string, lessonId: string) => void;
}

const GeminiBuddy: React.FC<GeminiBuddyProps> = ({
  currentContext = '',
  systemContext = 'Navegando no sistema',
  userName,
  initialMessage,
  onNavigate
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCourse, activeLesson } = useCourse();
  const userId = user?.id || 'guest';

  const { threadsByUser, activeThreadIdByUser, welcomeShownByUser, isLoading, isOpen, setIsOpen, addMessage, setWelcomeShown } = useBuddyStore();
  const { sendMessage, history: messages } = useBuddyClient({
    userId,
    currentContext,
    systemContext,
    userName: user?.name, // Changed from prop `userName` to `user?.name`
    threadTitle: activeLesson ? `Aula: ${activeLesson.title}` : undefined
  });

  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<BuddySuggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate suggestions once per session/thread change or when empty
  useEffect(() => {
    if (messages.length === 0) {
      setSuggestions(getRandomSuggestions(activeCourse?.title, activeLesson?.title, 3)); // Use 3 for widget space
    }
  }, [messages.length, activeCourse?.title, activeLesson?.title, isOpen]);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Handle Initial Message
  useEffect(() => {
    const hasShownWelcome = welcomeShownByUser[userId];
    // Only if not shown, valid initial message, and empty history
    if (!hasShownWelcome && initialMessage && messages.length === 0) {
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

      addMessage(userId, { role: 'ai', text, action });
      setIsOpen(true);
      setWelcomeShown(userId, true);

      // Auto-close logic could go here if desired, but user interaction clears it usually
      // Keeping it simple for now
      setTimeout(() => setIsOpen(false), 5000);
    }
  }, [initialMessage, messages.length, addMessage, setIsOpen, userId, welcomeShownByUser, setWelcomeShown]);

  // Image handling (Duplicate logic for now due to ref-based UI)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const file = items[i].getAsFile();
      if (file && items[i].type.indexOf('image') !== -1) {
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImage(reader.result as string);
        reader.readAsDataURL(file);
        e.preventDefault();
      }
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && !selectedImage) || isLoading) return;

    const text = prompt;
    const image = selectedImage;
    setPrompt('');
    setSelectedImage(null);

    await sendMessage(text, image);
  };

  // Determine relative position based on route
  const location = useLocation();
  const isLessonPage = location.pathname.includes('/lesson/');
  const isBuddyPage = location.pathname === '/buddy';

  // Hide widget completely on /buddy page
  if (isBuddyPage) return null;

  const mobileBottomClass = isLessonPage ? 'bottom-24' : 'bottom-6';

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
      <div className={`fixed ${isLessonPage ? 'bottom-40' : 'bottom-24'} md:bottom-24 right-4 md:right-6 z-40 w-full max-w-[calc(100vw-2rem)] md:w-[480px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 translate-y-0 h-[550px] md:h-[680px]' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'
        }`}>
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white shadow-inner">
              <i className="fas fa-robot text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Study Buddy AI</h3>
              <p className="text-[10px] text-slate-400">Assistente Virtual Inteligente</p>
            </div>
          </div>
          {/* Maximize Button */}
          <button
            onClick={() => { setIsOpen(false); navigate('/buddy'); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            title="Expandir para tela cheia"
          >
            <i className="fas fa-expand text-xs"></i>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/95 backdrop-blur-sm">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                <i className="fas fa-comment-dots text-2xl"></i>
              </div>
              <p className="text-sm text-slate-300 font-medium px-6 text-center">Como posso ajudar em seus estudos hoje?</p>

              <div className="mt-6 w-full space-y-2 px-2">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(suggestion.text)}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 hover:border-indigo-500/30 transition-all text-left flex items-center gap-3 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                      <i className={`fas ${suggestion.icon} text-[10px]`}></i>
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors truncate">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}>
                  <MarkdownRenderer content={m.text} className="text-sm leading-relaxed" />
                  {m.action && (
                    <button
                      onClick={() => onNavigate ? onNavigate(m.action!.courseId, m.action!.lessonId) : navigate(`/course/${m.action!.courseId}/lesson/${m.action!.lessonId}`)}
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
              placeholder="Digite sua dúvida..."
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
