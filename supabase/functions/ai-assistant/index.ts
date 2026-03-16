import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  temperature?: number;
  topP?: number;
  jsonMode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: AIRequest = await req.json();
    const { prompt, systemInstruction, history = [], temperature = 0.7, topP = 0.8, jsonMode = false } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    let text: string;

    if (ANTHROPIC_API_KEY) {
      text = await callClaude(ANTHROPIC_API_KEY, { prompt, systemInstruction, history, temperature, topP, jsonMode });
    } else if (GEMINI_API_KEY) {
      text = await callGemini(GEMINI_API_KEY, { prompt, systemInstruction, history, temperature, topP, jsonMode });
    } else {
      return new Response(
        JSON.stringify({ error: 'No AI provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY in Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return new Response(JSON.stringify({ error: error.message || 'AI request failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function callClaude(
  apiKey: string,
  opts: {
    prompt: string;
    systemInstruction?: string;
    history?: Array<{ role: string; text: string }>;
    temperature?: number;
    topP?: number;
    jsonMode?: boolean;
  },
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [
    ...(opts.history || []).map((m) => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: opts.prompt },
  ];

  const body: Record<string, unknown> = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages,
    temperature: opts.temperature ?? 0.7,
  };

  if (opts.systemInstruction) {
    body.system = opts.systemInstruction;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGemini(
  apiKey: string,
  opts: {
    prompt: string;
    systemInstruction?: string;
    history?: Array<{ role: string; text: string }>;
    temperature?: number;
    topP?: number;
    jsonMode?: boolean;
  },
): Promise<string> {
  const contents = [
    ...(opts.history || []).map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: opts.prompt }] },
  ];

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    topP: opts.topP ?? 0.8,
  };

  if (opts.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const reqBody: Record<string, unknown> = { contents, generationConfig };

  if (opts.systemInstruction) {
    reqBody.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
