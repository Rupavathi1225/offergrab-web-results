import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webResultName, webResultTitle, webResultLink } = await req.json();

    if (!webResultName || !webResultTitle) {
      return new Response(
        JSON.stringify({ error: 'Web result name and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a marketing expert that creates compelling pre-landing page content. 
Generate content that will capture emails before users access the main offer.
The content should be persuasive, create urgency, and highlight benefits.
Always respond with valid JSON only, no markdown or code blocks.`;

    const userPrompt = `Create a pre-landing page for this offer:
- Name: ${webResultName}
- Title: ${webResultTitle}
- Link: ${webResultLink || 'N/A'}

Generate the following fields in JSON format:
{
  "headline": "A compelling headline (max 60 chars) that creates urgency",
  "description": "A persuasive description (2-3 sentences) explaining the value",
  "email_placeholder": "A friendly email placeholder text",
  "cta_button_text": "An action-oriented button text (max 20 chars)",
  "background_color": "A hex color that matches the brand feel (dark preferred like #1a1a2e, #0f172a, #1e3a5f)"
}

Return only valid JSON, no additional text.`;

    console.log('Generating prelanding content for:', webResultName);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
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
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    console.log('Raw AI response:', content);

    // Clean and parse the JSON response
    let cleanedContent = content.trim();
    // Remove markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    cleanedContent = cleanedContent.trim();

    const prelandingData = JSON.parse(cleanedContent);

    // Add default main image URL
    const defaultMainImage = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80';

    const result = {
      headline: prelandingData.headline || `Unlock ${webResultName}`,
      description: prelandingData.description || `Get exclusive access to ${webResultTitle}. Enter your email to continue.`,
      email_placeholder: prelandingData.email_placeholder || 'Enter your email to continue',
      cta_button_text: prelandingData.cta_button_text || 'Get Access Now',
      background_color: prelandingData.background_color || '#1a1a2e',
      main_image_url: defaultMainImage,
    };

    console.log('Generated prelanding data:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating prelanding:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate prelanding' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});