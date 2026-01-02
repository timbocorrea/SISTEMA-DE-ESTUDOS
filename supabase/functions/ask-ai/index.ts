
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { messages, apiKey: bodyApiKey } = await req.json();

        // 1. Initialize Supabase Client with User Auth
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // 2. Get User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error('Unauthorized user');

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
            resolvedApiKey = Deno.env.get('GEMINI_API_KEY');
        }

        if (!resolvedApiKey) {
            throw new Error('No API Key found. Please configure your integration key in Settings.');
        }

        // 4. Determine Provider based on Key Prefix (Server-Side Logic)
        let aiProvider = 'google';
        let aiModel = 'gemini-1.5-flash';

        if (resolvedApiKey.startsWith('sk-')) {
            aiProvider = 'openai';
            aiModel = 'gpt-3.5-turbo';
        } else if (resolvedApiKey.startsWith('gsk_')) {
            aiProvider = 'groq';
            aiModel = 'llama-3.3-70b-versatile';
        } else if (resolvedApiKey.includes('.') && resolvedApiKey.length > 20 && !resolvedApiKey.startsWith('AIza')) {
            aiProvider = 'zhipu';
            aiModel = 'glm-4-flash';
        }

        let responseText = '';

        if (aiProvider === 'google') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${resolvedApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: messages.map((m: any) => ({
                        role: m.role === 'ai' ? 'model' : 'user',
                        parts: [{ text: m.text || m.content }]
                    })).map((m: any) => {
                        // Gemini expects 'user' or 'model'. Openai sends 'system', 'user', 'assistant'.
                        // We map 'system' to 'user' with instruction, or use systemInstruction field.
                        // For simplicity, we just map basic roles.
                        if (m.role === 'system') return { role: 'user', parts: [{ text: m.parts[0].text }] };
                        return m;
                    }).filter((m: any) => m.role === 'user' || m.role === 'model') // Gemini only supports user/model in history
                    // Note: Real implementation might need better system instruction handling
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Google API Error');
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

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
