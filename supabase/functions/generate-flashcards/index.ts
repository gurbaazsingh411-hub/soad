import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    try {
        const { subject, topic, count } = await req.json();

        if (!subject || !topic) {
            return new Response(
                JSON.stringify({ error: "Missing subject or topic" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
            throw new Error("LOVABLE_API_KEY is not configured");
        }

        const numCards = count || 10;

        const systemPrompt = `You are an expert IGCSE tutor. Generate flashcards for effective spaced-repetition study. Each flashcard should test one specific concept, definition, or fact.

IMPORTANT: Respond ONLY with valid JSON — no markdown, no code fences, no extra text. The response must be a JSON array.`;

        const userPrompt = `Generate exactly ${numCards} flashcards for IGCSE ${subject}, topic: ${topic}.

Each flashcard should have a clear, concise question on the front and a detailed but focused answer on the back.

Return a JSON array where each element has:
- "front": the question or prompt
- "back": the answer or explanation

Example format:
[{"front":"What is velocity?","back":"Velocity is the rate of change of displacement. v = s/t. SI unit: m/s. It is a vector quantity."}]`;

        const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "google/gemini-3-flash-preview",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                    stream: false,
                }),
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                return new Response(
                    JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
                    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            if (response.status === 402) {
                return new Response(
                    JSON.stringify({ error: "AI credits exhausted." }),
                    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            const t = await response.text();
            console.error("AI gateway error:", response.status, t);
            return new Response(
                JSON.stringify({ error: "AI gateway error" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "[]";

        let flashcards;
        try {
            const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            flashcards = JSON.parse(cleaned);
        } catch {
            flashcards = [];
        }

        return new Response(
            JSON.stringify({ flashcards }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (e) {
        console.error("generate-flashcards error:", e);
        return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
