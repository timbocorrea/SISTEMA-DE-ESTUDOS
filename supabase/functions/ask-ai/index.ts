
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
        let aiModel = model || 'gemini-1.5-flash';

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

        if (aiProvider === 'google') {
            const systemMsg = messages.find((m: any) => m.role === 'system');
            const systemText = systemMsg ? (systemMsg.text || systemMsg.content) : '';

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

            // Merge consecutive same roles for Gemini stability
            const mergedContent: any[] = [];
            for (const msg of rawUserContent) {
                if (msg.parts.length === 0) continue;
                if (mergedContent.length > 0 && mergedContent[mergedContent.length - 1].role === msg.role) {
                    mergedContent[mergedContent.length - 1].parts.push(...msg.parts);
                } else {
                    mergedContent.push(msg);
                }
            }

            // Gemini must start with 'user'
            let finalContent = mergedContent;
            while (finalContent.length > 0 && finalContent[0].role !== 'user') {
                finalContent.shift();
            }

            if (finalContent.length === 0) throw new Error('Nenhuma mensagem válida encontrada para enviar à IA.');

            // Prepend system instructions to the first message for maximum compatibility with v1
            if (systemText && finalContent.length > 0 && finalContent[0].role === 'user') {
                finalContent[0].parts.unshift({ text: `[INSTRUCÃO DE SISTEMA]:\n${systemText}\n\n---\n` });
            }

            const body: any = {
                contents: finalContent,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${aiModel}:generateContent?key=${resolvedApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            console.log('Gemini Full Response:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error('Google API Error:', data);
                throw new Error(data.error?.message || JSON.stringify(data.error) || 'Google API Error');
            }

            const candidate = data.candidates?.[0];
            if (!candidate) {
                responseText = `IA_SEM_CANDIDATOS. Debug: ${JSON.stringify(data)}`;
            } else if (candidate.content?.parts?.[0]?.text) {
                responseText = candidate.content.parts[0].text;
            } else {
                responseText = `IA_SEM_TEXTO. Debug: ${JSON.stringify(data)}`;
            }

        } else if (aiProvider === 'openai') {
            const apiKey = resolvedApiKey;
            if (!apiKey) throw new Error('OPENAI_API_KEY not set');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: aiModel,
                    messages: messages.map((m: any) => ({
                        role: m.role === 'ai' ? 'assistant' : m.role,
                        content: m.text || m.content
                    }))
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'OpenAI API Error');
            responseText = data.choices[0]?.message?.content || "No response.";
        }
        // Add other providers (Groq, Zhipu) as needed...

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
