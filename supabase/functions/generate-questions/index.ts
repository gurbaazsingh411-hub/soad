import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const difficultyPrompts: Record<string, string> = {
    foundation: "Generate questions at the Foundation tier level — core syllabus basics, straightforward application. Marks per question: 2-3.",
    standard: "Generate questions at real IGCSE exam level — requires understanding and application. Marks per question: 3-5.",
    challenging: "Generate challenging questions for top-grade students — requires analysis and evaluation. Marks per question: 5-8.",
    stress: "Generate the hardest possible IGCSE-style questions — complex multi-step problems combining multiple topics. Marks per question: 6-10.",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { subject, topic, difficulty, questionTypes, numQuestions } = await req.json();

        if (!subject || !difficulty || !numQuestions) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
            throw new Error("LOVABLE_API_KEY is not configured");
        }

        const diffInstruction = difficultyPrompts[difficulty] || difficultyPrompts.standard;
        const typesStr = questionTypes?.length ? questionTypes.join(", ") : "Structured";

        const systemPrompt = `You are an expert IGCSE examiner. Generate exam-style questions that precisely match Cambridge IGCSE past paper patterns. Always include detailed mark schemes with marking points.

IMPORTANT: Respond ONLY with valid JSON — no markdown, no code fences, no extra text. The response must be a JSON array.`;

        const userPrompt = `Generate exactly ${numQuestions} IGCSE ${subject}${topic ? ` (topic: ${topic})` : ""} questions.

${diffInstruction}

Question types to include: ${typesStr}

Return a JSON array where each element has:
- "question": the full question text
- "answer": the model answer / mark scheme
- "marks": number of marks (integer)
- "type": "${typesStr}" (pick the most appropriate)
- "topic": the specific topic area

Example format:
[{"question":"...","answer":"...","marks":4,"type":"Structured","topic":"Algebra"}]`;

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
                    JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
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

        // Parse the JSON from the AI response — strip markdown fences if present
        let questions;
        try {
            const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            questions = JSON.parse(cleaned);
        } catch {
            questions = [];
        }

        return new Response(
            JSON.stringify({ questions }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (e) {
        console.error("generate-questions error:", e);
        return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
