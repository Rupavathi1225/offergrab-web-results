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

    console.log('AI Matching Request - Original names:', original_web_results?.length, 'Uploaded names:', uploaded_new_names?.length);
    console.log('Original names:', JSON.stringify(original_web_results));
    console.log('Uploaded names:', JSON.stringify(uploaded_new_names));

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

    const systemPrompt = `You are a flexible name-matching engine. Your job is to match names between two lists.

TASK:
Match each name from the ORIGINAL list with the BEST matching name from the UPLOADED list.

MATCHING RULES:
1. Be LENIENT - partial matches, abbreviations, and similar-sounding names should match.
2. Match based on: company names, brand recognition, partial word overlap, similar keywords.
3. Examples of valid matches:
   - "Hotstar Official" matches "Hotstar" or "Disney+ Hotstar"
   - "TechRadar India" matches "TechRadar" 
   - "Mistplay" matches "Mistplay" or "Mistplay Official"
   - "Swagbucks" matches "Swagbucks" or "Swagbucks offers"
4. Each original name should match with EXACTLY ONE uploaded name.
5. Each uploaded name can only be used ONCE.
6. ALWAYS try to find a match - only return "NO MATCH" if there's absolutely no similarity.

CONFIDENCE SCORING:
• Exact match = 100
• Very similar (same brand/company) = 80-99  
• Partial match (some words overlap) = 50-79
• Weak match (related category) = 30-49
• Only return "NO MATCH" if confidence would be below 20

OUTPUT FORMAT (JSON ONLY):
Return a JSON array where each object contains:
• original_web_result (exactly as provided)
• matched_new_name (from uploaded list, or "NO MATCH")
• confidence_score (0-100)

Return ONLY valid JSON, no explanations.`;

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
      console.log('AI Matching Results:', JSON.stringify(matches));
      const matchedCount = matches.filter((m: any) => m.matched_new_name !== "NO MATCH").length;
      console.log('Matched count:', matchedCount, 'out of', matches.length);
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
