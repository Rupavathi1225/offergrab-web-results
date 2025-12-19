import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { original_web_results, uploaded_new_names } = await req.json();

    if (!original_web_results || !uploaded_new_names) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: original_web_results and uploaded_new_names" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an automated name-matching engine inside a web system.

SYSTEM CONTEXT:
• The system already contains a list of ORIGINAL WEB RESULT NAMES.
• A new sheet is uploaded containing NEW NAMES.
• Your task is to match each original web result name with the best possible new name from the uploaded sheet.

TASK:
For EACH original web result name:
• Find the SINGLE BEST matching name from the uploaded sheet.
• Matching must be based ONLY on semantic meaning and intent of the names.

STRICT RULES (MANDATORY):
1. Do NOT rewrite, generate, modify, or improve any name.
2. Do NOT use or consider URLs.
3. Do NOT require or allow manual input.
4. Do NOT guess or force matches.
5. Focus strongly on intent keywords such as: fast, instant, loan, money, no document, apps, online
6. Treat intent words (fast / instant / no document) as HIGH PRIORITY signals.
7. Word order does NOT matter; meaning and intent matter most.
8. Each original web result name can match with ONLY ONE new name.
9. Each uploaded new name can be used ONLY ONCE.
10. If no suitable match exists, return "NO MATCH".

CONFIDENCE SCORING:
• Provide a confidence_score between 0 and 100.
• High intent overlap = high score.
• Low intent overlap = low score.

OUTPUT FORMAT (STRICT – JSON ONLY):
Return a JSON array where each object contains:
• original_web_result
• matched_new_name (or "NO MATCH")
• confidence_score

DO NOT include explanations, markdown, comments, or extra text.
ONLY return valid JSON.`;

    const userPrompt = `INPUT:

original_web_results:
${JSON.stringify(original_web_results, null, 2)}

uploaded_new_names:
${JSON.stringify(uploaded_new_names, null, 2)}

OUTPUT:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content returned from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      const matches = JSON.parse(content);
      return new Response(
        JSON.stringify({ matches }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response as JSON", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in match-web-results function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
