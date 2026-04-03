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
    const { prompt, systemInstruction, history = [], temperature = 0.7, jsonMode = false } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured. Set it in Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const text = await callClaude(ANTHROPIC_API_KEY, { prompt, systemInstruction, history, temperature, jsonMode });

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
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages,
    temperature: opts.temperature ?? 0.7,
  };

  if (opts.systemInstruction) {
    body.system = opts.systemInstruction;
  }

  // For JSON mode, append instruction to system prompt
  if (opts.jsonMode) {
    body.system = (body.system ? body.system + '\n\n' : '') + 'You must respond with valid JSON only. No markdown, no explanation.';
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
  let text: string = data.content?.[0]?.text ?? '';

  // Strip markdown code-block fences the model sometimes adds despite the instruction
  if (opts.jsonMode && text.includes('```')) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/s);
    if (fenced) text = fenced[1].trim();
  }

  return text;
}
