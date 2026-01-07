import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropboxService } from '../services/dropbox/DropboxService';

const DropboxCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const processCallback = () => {
            try {
                const token = DropboxService.handleAuthCallback();
                if (token) {
                    setStatus('success');
                    // Flag to tell the editor (or other components) we just logged in
                    localStorage.setItem('dropbox_just_logged_in', 'true');

                    // Retrieve original URL or default to home
                    const returnUrl = localStorage.getItem('dropbox_return_url') || '/';
                    localStorage.removeItem('dropbox_return_url'); // Cleanup

                    // Small delay to show success state (optional)
                    setTimeout(() => {
                        window.location.href = returnUrl;
                        // Using window.location.href to ensure full state reload if needed, 
                        // or navigate(returnUrl) if within react-router context and path is relative.
                        // Since returnUrl might be full absolute URL, window.location is safer if it differs slightly.
                        // However, assuming same app, navigate is better for SPA.
                        // Let's normalize. 
                        if (returnUrl.startsWith(window.location.origin)) {
                            const relativePath = returnUrl.replace(window.location.origin, '');
                            navigate(relativePath);
                        } else if (returnUrl.startsWith('/')) {
                            navigate(returnUrl);
                        } else {
                            window.location.href = returnUrl;
                        }
                    }, 500);
                } else {
                    setStatus('error');
                    setErrorMessage('Não foi possível obter o token de acesso. Verifique se você autorizou o aplicativo.');
                }
            } catch (error) {
                console.error('Dropbox Callback Error:', error);
                setStatus('error');
                setErrorMessage('Ocorreu um erro ao processar o login do Dropbox.');
            }
        };

        processCallback();
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">

                {status === 'processing' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <h2 className="text-xl font-bold">Conectando ao Dropbox...</h2>
                        <p className="text-sm text-slate-500">Por favor, aguarde enquanto finalizamos a autenticação.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center space-y-4 text-green-600">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl">
                            <i className="fas fa-check"></i>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conectado com Sucesso!</h2>
                        <p className="text-sm text-slate-500">Redirecionando você de volta...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center space-y-4 text-red-600">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-2xl">
                            <i className="fas fa-times"></i>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Falha na Conexão</h2>
                        <p className="text-sm text-slate-500">{errorMessage}</p>
                        <button
                            onClick={() => {
                                const returnUrl = localStorage.getItem('dropbox_return_url') || '/';
                                navigate(returnUrl.replace(window.location.origin, ''));
                            }}
                            className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-slate-800 dark:text-slate-200 font-medium"
                        >
                            Voltar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropboxCallbackPage;
