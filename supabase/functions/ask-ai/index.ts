
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { messages, provider, model, apiKey: bodyApiKey } = await req.json();

        // Default to Google/Gemini if not specified
        const aiProvider = provider || 'google';
        const aiModel = model || 'gemini-1.5-flash';

        // Resolve API Key (Body > Env)
        // @ts-ignore
        const resolvedApiKey = bodyApiKey || (aiProvider === 'google' ? Deno.env.get('GEMINI_API_KEY') : Deno.env.get('OPENAI_API_KEY'));

        let responseText = '';

        if (aiProvider === 'google') {
            if (!resolvedApiKey) throw new Error('GEMINI_API_KEY not set');

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
