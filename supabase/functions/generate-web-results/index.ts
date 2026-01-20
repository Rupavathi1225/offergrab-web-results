import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { relatedSearchTitle, count = 6 } = await req.json();
    const resultCount = Math.min(Math.max(count, 6), 20); // Clamp between 6-20

    if (!relatedSearchTitle) {
      return new Response(
        JSON.stringify({ error: 'Related search title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating', resultCount, 'web results for related search:', relatedSearchTitle);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a web results generator. Based on a search query, generate exactly ${resultCount} realistic web results that would appear in search engines.

STRICT RULES:
1. Generate EXACTLY ${resultCount} web results
2. Each result must have: name (company/website name), title (search result title), description (2-3 sentences), link (realistic URL)
3. Make results diverse - include different types of websites (official sites, review sites, comparison sites, educational content, etc.)
4. Results should be relevant to the search query

Respond in this exact JSON format:
{
  "webResults": [
    {
      "name": "Company Name",
      "title": "Result Title - Catchy and SEO friendly",
      "description": "Brief description of what this page offers. Make it compelling and informative.",
      "link": "https://example.com/page"
    }
  ]
}

Only respond with valid JSON, nothing else.`,
          },
          {
            role: 'user',
            content: `Generate ${resultCount} web results for the search query: "${relatedSearchTitle}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate web results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error('No content in response:', data);
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw AI response:', rawContent);

    // Parse the JSON response
    let parsedContent;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      parsedContent = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse generated content',
          webResults: []
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Web results generated successfully');

    return new Response(
      JSON.stringify({ 
        webResults: parsedContent.webResults || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-web-results:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
