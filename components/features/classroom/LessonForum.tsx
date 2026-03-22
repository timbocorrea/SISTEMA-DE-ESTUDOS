import React, { useState, useRef, useEffect } from 'react';
import { useForumMessages } from '@/hooks/useForumMessages';
import { User } from '@/domain/entities';
import { Button } from '@/components/ui/Button';
import { Send, User as UserIcon, MessageSquare, ShieldCheck, Stars } from 'lucide-react';

interface LessonForumProps {
    lessonId: string;
    user: User;
}

const LessonForum: React.FC<LessonForumProps> = ({ lessonId, user }) => {
    const { messages, isLoading, sendMessage } = useForumMessages(lessonId);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const formatRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            
            if (isNaN(date.getTime())) return 'Há algum tempo';
            if (diffInSeconds < 10) return 'Agora';
            if (diffInSeconds < 60) return `${diffInSeconds}s atrás`;
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
            return `${Math.floor(diffInSeconds / 86400)}d atrás`;
        } catch (e) {
            return 'Há algum tempo';
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        const msgContent = newMessage.trim();
        setNewMessage('');

        try {
            await sendMessage(msgContent, user.id);
        } catch (err) {
            // Error handled in hook or we could add a toast here
            console.error('Failed to send:', err);
        } finally {
            setIsSending(false);
        }
    };

    const getRoleBadge = (role: string | null | undefined) => {
        if (role === 'INSTRUCTOR') return <ShieldCheck size={12} className="text-amber-500" />;
        if (role === 'MASTER') return <Stars size={12} className="text-indigo-500" />;
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner font-sans">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <MessageSquare size={16} className="text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Fórum da Aula</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Tempo Real</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Online</span>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
            >
                {isLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conectando ao Fórum...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 opacity-50 grayscale">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <MessageSquare size={32} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">
                            Ninguém comentou ainda.<br/>Sua dúvida pode ser a de outros!
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex flex-col ${msg.user_id === user.id ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className="flex items-center gap-1.5 mb-1.5 px-1">
                                {msg.user_id !== user.id && getRoleBadge(msg.profiles?.role)}
                                <span className={`text-[9px] font-black uppercase tracking-widest ${msg.user_id === user.id ? 'text-indigo-500' : 'text-slate-400'}`}>
                                    {msg.user_id === user.id ? 'Você' : (msg.profiles?.name || 'Aluno')}
                                </span>
                            </div>
                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm relative group ${
                                msg.user_id === user.id 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                            }`}>
                                <p className="leading-relaxed font-medium">{msg.content}</p>
                                <div className={`text-[8px] mt-2 font-black uppercase opacity-60 flex items-center gap-1 ${msg.user_id === user.id ? 'text-indigo-100 justify-end' : 'text-slate-400 justify-start'}`}>
                                    <span>{formatRelativeTime(msg.created_at)}</span>
                                    {msg.is_edited && <span>• Editado</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form 
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
                <div className="flex-1 relative">
                    <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="w-full h-11 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-4 pr-10 text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 placeholder:font-bold placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20">
                        <Stars size={14} className="text-indigo-500" />
                    </div>
                </div>
                <Button 
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    size="icon"
                    className="h-11 w-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 shrink-0 transition-transform active:scale-95 disabled:grayscale"
                >
                    {isSending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Send size={18} />
                    )}
                </Button>
            </form>
        </div>
    );
};

export default LessonForum;
