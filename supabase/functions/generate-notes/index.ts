import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const modePrompts: Record<string, string> = {
  concise: `Generate concise revision notes. Include:
- Key definitions (bold term followed by clear definition)
- Important facts and figures
- Exam tips and common mistakes
- Examiner insight
Keep it brief and exam-focused. Use markdown formatting with headers (##), bold, and bullet points.`,

  deep: `Generate deep conceptual notes. Include:
- Thorough explanations of underlying concepts
- How concepts connect to each other (cross-topic links)
- Real-world examples and applications
- Why things work the way they do, not just what they are
- Examiner insight on what distinguishes top-grade answers
Use markdown formatting with headers (##), bold, and bullet points.`,

  bullet: `Generate a bullet-point summary. Include:
- One bullet per key fact or concept
- Use ✅ emoji before each bullet
- Cover all essential points for the topic
- Include key formulas where relevant
- Keep each bullet to one line
Use markdown formatting.`,

  formula: `Generate a formula sheet. Include:
- All relevant formulas and equations for this topic
- Present each formula clearly with the quantity it calculates
- Include units for each quantity
- List key constants with their values
- Add any important derivations or relationships between formulas
Use markdown formatting with a table or structured list format.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, topic, mode } = await req.json();

    if (!subject || !topic || !mode) {
      return new Response(
        JSON.stringify({ error: "Missing subject, topic, or mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const modeInstruction = modePrompts[mode] || modePrompts.concise;

    const systemPrompt = `You are an expert IGCSE tutor and examiner. You create high-quality revision materials that follow the Cambridge IGCSE syllabus precisely. Your notes should reflect real exam patterns, mark scheme phrasing, and frequently tested concepts. Always be accurate, structured, and exam-relevant.`;

    const userPrompt = `Generate ${mode} notes for the IGCSE subject "${subject}" on the topic "${topic}".

${modeInstruction}

Make sure the content is specific to the IGCSE ${subject} syllabus and covers what students need to know for their exams.`;

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
          stream: true,
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
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-notes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
