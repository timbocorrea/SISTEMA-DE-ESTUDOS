
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.34.0';

// @ts-ignore
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://localhost:5173';

const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
};

const ALLOWED_MODELS: readonly string[] = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-2.5-pro',
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4o',
    'gpt-4o-mini',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
] as const;

interface AskAiRequestBody {
    messages: Array<{
        role: string;
        text?: string;
        content?: string;
        image?: string;
    }>;
    apiKey?: string;
    model?: string;
}

interface AiProviderError {
    status?: number;
    message: string;
    provider: string;
}

function isAllowedModel(model: string): boolean {
    return ALLOWED_MODELS.includes(model);
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: AskAiRequestBody = await req.json();
        const { messages, apiKey: bodyApiKey, model } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Formato de requisição inválido: "messages" deve ser um array.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // 1. Initialize Supabase Client with User Auth
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Cabeçalho de autorização ausente.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const supabaseClient = createClient(
            // @ts-ignore
            Deno.env.get('SUPABASE_URL') ?? '',
            // @ts-ignore
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // 2. Get User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Falha na autenticação do usuário. Por favor, faça login novamente.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        // 3. Fetch API Key from DB
        let resolvedApiKey = bodyApiKey;

        if (!resolvedApiKey) {
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('gemini_api_key')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                return new Response(
                    JSON.stringify({ error: 'Ocorreu um erro interno ao processar a resposta da IA.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
                );
            }
            resolvedApiKey = profile?.gemini_api_key;
        }

        if (!resolvedApiKey) {
            // @ts-ignore
            resolvedApiKey = Deno.env.get('GEMINI_API_KEY');
        }

        if (!resolvedApiKey) {
            return new Response(
                JSON.stringify({ error: 'Nenhuma chave de API Gemini encontrada. Adicione sua chave no seu Perfil para usar o Buddy AI.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // 4. Determine Provider & validate model
        let aiProvider = 'google';
        let aiModel = 'gemini-2.5-flash';

        if (model && isAllowedModel(model)) {
            aiModel = model;
        }

        if (resolvedApiKey.startsWith('sk-')) {
            aiProvider = 'openai';
            aiModel = isAllowedModel(model || '') ? model! : 'gpt-3.5-turbo';
        } else if (resolvedApiKey.startsWith('gsk_')) {
            aiProvider = 'groq';
            aiModel = isAllowedModel(model || '') ? model! : 'llama-3.3-70b-versatile';
        } else if (resolvedApiKey.includes('.') && resolvedApiKey.length > 20 && !resolvedApiKey.startsWith('AIza')) {
            aiProvider = 'anthropic';
            aiModel = isAllowedModel(model || '') ? model! : 'claude-3-5-sonnet-20241022';
        }

        let responseText = '';

        // HELPER FUNCTIONS
        const callGemini = async (apiKey: string, geminiModel: string, msgs: AskAiRequestBody['messages'], systemText: string) => {
            const rawUserContent = msgs.filter((m) => m.role !== 'system').map((m) => {
                const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
                if (m.text || m.content) parts.push({ text: m.text || m.content });
                if (m.image) {
                    const match = m.image.match(/^data:(.+);base64,(.+)$/);
                    if (match) {
                        parts.push({
                            inlineData: {
                                mimeType: match[1],
                                data: match[2]
                            }
                        });
                    }
                }
                return {
                    role: m.role === 'ai' || m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
                    parts
                };
            });

            // Merge consecutive same roles
            const mergedContent: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];
            for (const msg of rawUserContent) {
                if (msg.parts.length === 0) continue;
                if (mergedContent.length > 0 && mergedContent[mergedContent.length - 1].role === msg.role) {
                    mergedContent[mergedContent.length - 1].parts.push(...msg.parts);
                } else {
                    mergedContent.push(msg);
                }
            }

            let finalContent = mergedContent;
            while (finalContent.length > 0 && finalContent[0].role !== 'user') finalContent.shift();
            if (finalContent.length === 0) {
                throw { status: 400, message: 'Nenhuma mensagem válida encontrada.', provider: 'google' } as AiProviderError;
            }

            const ai = new GoogleGenAI({ apiKey });
            const requestOptions: Record<string, unknown> = {
                model: geminiModel === 'gemini-1.5-flash-latest' ? 'gemini-2.5-flash' : geminiModel,
                contents: finalContent,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    ...(systemText ? { systemInstruction: systemText } : {})
                }
            };

            const response = await ai.models.generateContent(requestOptions);

            if (!response.candidates || response.candidates.length === 0) return "IA_SEM_CANDIDATOS";
            return response.text || response.candidates[0].content?.parts?.[0]?.text || "IA_SEM_TEXTO";
        };

        const callOpenAICompatible = async (apiKey: string, oaiModel: string, msgs: AskAiRequestBody['messages'], systemText: string, baseUrl: string) => {
            const finalMessages = [
                ...(systemText ? [{ role: 'system', content: systemText }] : []),
                ...msgs.filter((m) => m.role !== 'system').map((m) => ({
                    role: m.role === 'ai' || m.role === 'model' ? 'assistant' : 'user',
                    content: m.text || m.content
                }))
            ];

            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: oaiModel,
                    messages: finalMessages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw { status: response.status, message: data.error?.message || 'API Error', provider: 'openai/groq' } as AiProviderError;
            }
            return data.choices?.[0]?.message?.content || "No response.";
        };

        // MAIN EXECUTION WITH FAILOVER
        try {
            const systemMsg = messages.find((m) => m.role === 'system');
            const systemText = systemMsg ? (systemMsg.text || systemMsg.content || '') : '';

            if (aiProvider === 'google') {
                responseText = await callGemini(resolvedApiKey, aiModel, messages, systemText);
            } else if (aiProvider === 'openai') {
                responseText = await callOpenAICompatible(resolvedApiKey, aiModel, messages, systemText, 'https://api.openai.com/v1');
            } else if (aiProvider === 'groq') {
                responseText = await callOpenAICompatible(resolvedApiKey, aiModel, messages, systemText, 'https://api.groq.com/openai/v1');
            } else if (aiProvider === 'anthropic') {
                throw { status: 501, message: 'Anthropic not yet implemented.', provider: 'anthropic' } as AiProviderError;
            }

        } catch (primaryError: unknown) {
            const err = primaryError as AiProviderError;
            console.error(`Primary Provider (${aiProvider}) failed:`, primaryError);

            // @ts-ignore
            const groqKey = Deno.env.get('GROQ_API_KEY');
            const shouldFailover = aiProvider === 'google' && groqKey;

            if (shouldFailover) {
                console.log('Initiating Failover to Llama 3 via Groq...');
                try {
                    const systemMsg = messages.find((m) => m.role === 'system');
                    const systemText = systemMsg ? (systemMsg.text || systemMsg.content || '') : '';

                    responseText = await callOpenAICompatible(
                        groqKey,
                        'llama-3.3-70b-versatile',
                        messages,
                        `${systemText}\n[AVISO: Esta resposta foi gerada pelo modelo Llama 3 (Backup) pois o serviço principal está instável.]`,
                        'https://api.groq.com/openai/v1'
                    );
                } catch (fallbackError: unknown) {
                    console.error('Fallback Provider (Groq) also failed:', fallbackError);
                    return new Response(
                        JSON.stringify({ error: 'Ocorreu um erro interno ao processar a resposta da IA.' }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            } else {
                return new Response(
                    JSON.stringify({ error: 'Ocorreu um erro interno ao processar a resposta da IA.' }),
                    { status: err.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        return new Response(JSON.stringify({ response: responseText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: unknown) {
        console.error('Unhandled edge function error:', error);
        return new Response(
            JSON.stringify({ error: 'Ocorreu um erro interno ao processar a resposta da IA.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
