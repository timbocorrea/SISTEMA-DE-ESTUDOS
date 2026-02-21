
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { messages, apiKey: bodyApiKey, model } = body;

        if (!messages || !Array.isArray(messages)) {
            throw new Error('Formato de requisição inválido: "messages" deve ser um array.');
        }

        // 1. Initialize Supabase Client with User Auth
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const supabaseClient = createClient(
            // @ts-ignore
            Deno.env.get('SUPABASE_URL') ?? '',
            // @ts-ignore
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // 2. Get User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error('Falha na autenticação do usuário. Por favor, faça login novamente.');

        // 3. Fetch API Key from DB (Backend-Side Lookup)
        let resolvedApiKey = bodyApiKey; // Fallback legacy logic if passed, but typically undefined now

        if (!resolvedApiKey) {
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('gemini_api_key')
                .eq('id', user.id)
                .single();

            if (profileError) throw new Error('Failed to fetch user profile');
            resolvedApiKey = profile?.gemini_api_key;
        }

        if (!resolvedApiKey) {
            // Fallback to System Key if Env is set (Optional, based on requirement)
            // For now, let's assume system requires user key or falls back to system wide key if available
            // @ts-ignore
            resolvedApiKey = Deno.env.get('GEMINI_API_KEY');
        }

        if (!resolvedApiKey) {
            return new Response(
                JSON.stringify({ error: 'Nenhuma chave de API Gemini encontrada. Adicione sua chave no seu Perfil para usar o Buddy AI.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // 4. Determine Provider based on Key Prefix (Server-Side Logic)
        let aiProvider = 'google';
        let aiModel = model || 'gemini-1.5-flash-latest';

        if (resolvedApiKey.startsWith('sk-')) {
            aiProvider = 'openai';
            aiModel = 'gpt-3.5-turbo';
        } else if (resolvedApiKey.startsWith('gsk_')) {
            aiProvider = 'groq';
            aiModel = 'llama-3.3-70b-versatile';
        } else if (resolvedApiKey.includes('.') && resolvedApiKey.length > 20 && !resolvedApiKey.startsWith('AIza')) {
            aiProvider = 'anthropic';
            aiModel = 'claude-3-5-sonnet-20241022';
        }

        let responseText = '';

        // HELPER FUNCTIONS
        const callGemini = async (apiKey: string, model: string, messages: any[], systemText: string) => {
            const rawUserContent = messages.filter((m: any) => m.role !== 'system').map((m: any) => {
                const parts: any[] = [];
                if (m.text || m.content) parts.push({ text: m.text || m.content });
                if (m.image) {
                    const match = m.image.match(/^data:(.+);base64,(.+)$/);
                    if (match) {
                        parts.push({
                            inline_data: {
                                mime_type: match[1],
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
            const mergedContent: any[] = [];
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
            if (finalContent.length === 0) throw new Error('Nenhuma mensagem válida encontrada para enviar à IA.');

            if (systemText && finalContent.length > 0) {
                finalContent[0].parts.unshift({ text: `[INSTRUCÃO DE SISTEMA]:\n${systemText}\n\n---\n` });
            }

            const body: any = {
                contents: finalContent,
                generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok) {
                // Return structured error to be caught
                const errorMsg = data.error?.message || JSON.stringify(data.error);
                throw { status: response.status, message: errorMsg, provider: 'google' };
            }

            const candidate = data.candidates?.[0];
            if (!candidate) return "IA_SEM_CANDIDATOS";
            return candidate.content?.parts?.[0]?.text || "IA_SEM_TEXTO";
        };

        const callOpenAICompatible = async (apiKey: string, model: string, messages: any[], systemText: string, baseUrl: string) => {
            const finalMessages = [
                ...(systemText ? [{ role: 'system', content: systemText }] : []),
                ...messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
                    role: m.role === 'ai' || m.role === 'model' ? 'assistant' : 'user',
                    content: m.text || m.content // TODO: Handle images for OpenAI/Groq if needed
                }))
            ];

            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: finalMessages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw { status: response.status, message: data.error?.message || 'API Error', provider: 'openai/groq' };
            }
            return data.choices?.[0]?.message?.content || "No response.";
        };

        // MAIN EXECUTION WITH FAILOVER
        try {
            const systemMsg = messages.find((m: any) => m.role === 'system');
            const systemText = systemMsg ? (systemMsg.text || systemMsg.content) : '';

            if (aiProvider === 'google') {
                responseText = await callGemini(resolvedApiKey, aiModel, messages, systemText);
            } else if (aiProvider === 'openai') {
                responseText = await callOpenAICompatible(resolvedApiKey, aiModel, messages, systemText, 'https://api.openai.com/v1');
            } else if (aiProvider === 'groq') {
                responseText = await callOpenAICompatible(resolvedApiKey, aiModel, messages, systemText, 'https://api.groq.com/openai/v1');
            } else if (aiProvider === 'anthropic') {
                throw new Error("Anthropic not yet implemented in this refactor.");
            }

        } catch (primaryError: any) {
            console.error(`Primary Provider (${aiProvider}) failed:`, primaryError);

            // Failover Logic: If primary was Google and we have a Groq key, try Llama 3
            // @ts-ignore
            const groqKey = Deno.env.get('GROQ_API_KEY');

            // Allow failover on ANY error from Gemini, not just 429/503
            const shouldFailover = aiProvider === 'google' && groqKey;

            if (shouldFailover) {
                console.log('🔄 Initiating Failover to Llama 3 via Groq...');
                try {
                    const systemMsg = messages.find((m: any) => m.role === 'system');
                    const systemText = systemMsg ? (systemMsg.text || systemMsg.content) : '';

                    // Fallback to Groq
                    responseText = await callOpenAICompatible(
                        groqKey,
                        'llama-3.3-70b-versatile',
                        messages,
                        `${systemText}\n[AVISO: Esta resposta foi gerada pelo modelo Llama 3 (Backup) pois o serviço principal está instável.]`,
                        'https://api.groq.com/openai/v1'
                    );

                    // Append notice to response if needed, or rely on system prompt injection
                } catch (fallbackError: any) {
                    console.error('Fallback Provider (Groq) also failed:', fallbackError);
                    throw new Error(`Ambos os serviços falharam.\nErro original: ${primaryError.message}\nErro backup: ${fallbackError.message || JSON.stringify(fallbackError)}`);
                }
            } else {
                console.log(`Failover skipped. Should we failover? ${shouldFailover}. Provider is ${aiProvider}. GROQ Key exists? ${!!groqKey}`);
                // Re-throw if not retryable or no fallback key
                throw new Error(primaryError.message || JSON.stringify(primaryError));
            }
        }

        return new Response(JSON.stringify({ response: responseText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
