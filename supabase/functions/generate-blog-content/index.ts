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
    const { 
      title, 
      slug, 
      paragraphs = 6, 
      wordsPerParagraph = 150, 
      totalWordTarget = 800,
      h2Count = 4,
      generateType = 'full' // 'h1', 'h2', 'h3', 'full'
    } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
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

    // Handle different generation types
    if (generateType === 'h1') {
      // Generate H1 title suggestions
      console.log('Generating H1 title suggestions for topic:', title);
      
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
              content: `You are an SEO expert. Generate 5 compelling H1 title options for a blog article.

REQUIREMENTS:
- Each title should be SEO-optimized and engaging
- Titles should be 6-12 words long
- Make them click-worthy but not clickbait
- Include the main keyword naturally

RESPOND ONLY WITH THIS JSON FORMAT:
{
  "titles": ["Title option 1", "Title option 2", "Title option 3", "Title option 4", "Title option 5"]
}`,
            },
            {
              role: 'user',
              content: `Generate 5 H1 title options for a blog about: "${title}"`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to generate titles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      
      try {
        const cleanedContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedContent);
        return new Response(
          JSON.stringify({ titles: parsed.titles || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ titles: [title] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (generateType === 'h2') {
      // Generate H2 section headings based on H1
      console.log('Generating H2 headings for H1:', title, 'count:', h2Count);
      
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
              content: `You are an SEO content strategist. Generate ${h2Count} H2 section headings for a blog article.

REQUIREMENTS:
- Each H2 should cover a distinct subtopic
- H2s should flow logically as a content outline
- Make them specific and informative
- Each should be 4-8 words

RESPOND ONLY WITH THIS JSON FORMAT:
{
  "h2Sections": ["H2 heading 1", "H2 heading 2", "H2 heading 3", ...]
}`,
            },
            {
              role: 'user',
              content: `Generate ${h2Count} H2 section headings for an article titled: "${title}"`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to generate H2 sections' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      
      try {
        const cleanedContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedContent);
        return new Response(
          JSON.stringify({ h2Sections: parsed.h2Sections || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ h2Sections: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (generateType === 'h3') {
      // Generate H3 subheadings + paragraphs for a specific H2
      const { h2Heading } = await req.json().catch(() => ({ h2Heading: '' }));
      console.log('Generating H3 content for H2:', h2Heading || title);
      
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
              content: `You are a content writer. Generate 1-2 H3 subsections with paragraphs for a blog section.

REQUIREMENTS:
- Each H3 should be a specific aspect of the H2 topic
- Include 1-2 paragraphs (80-120 words each) per H3
- Content should be informative and valuable

RESPOND ONLY WITH THIS JSON FORMAT:
{
  "h3Content": [
    { "h3": "H3 heading", "paragraphs": ["Paragraph 1...", "Paragraph 2..."] }
  ]
}`,
            },
            {
              role: 'user',
              content: `Generate H3 subsections and paragraphs for this H2 section: "${h2Heading || title}"`,
            },
          ],
        }),
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate H3 content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      
      try {
        const cleanedContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedContent);
        return new Response(
          JSON.stringify({ h3Content: parsed.h3Content || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ h3Content: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Full generation (original behavior with improvements)
    const targetWords = totalWordTarget || (paragraphs * wordsPerParagraph);
    const numH2Sections = h2Count || Math.max(3, Math.ceil(targetWords / 200));

    console.log('Generating full content for blog:', title, 'slug:', slug, 'targetWords:', targetWords, 'h2Count:', numH2Sections);

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
            content: `You are a professional blog content writer. Your task is to generate comprehensive, well-structured blog content.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. WORD COUNT: Write exactly ${targetWords} words or more. This is mandatory.

2. HTML STRUCTURE - USE THESE TAGS:
   - Start with an introduction paragraph: <p>Introduction text here...</p>
   - Add exactly ${numH2Sections} main sections with <h2> headings: <h2>Section Title</h2>
   - For EACH H2, add 1-2 <h3> subheadings with paragraphs
   - Every paragraph MUST be wrapped in <p> tags
   - DO NOT use <h1> tags

3. CONTENT STRUCTURE EXAMPLE:
<p>This is the introduction paragraph explaining the topic...</p>

<h2>First Major Section Heading</h2>
<p>Opening paragraph for this section...</p>

<h3>A Subsection Under First H2</h3>
<p>Detailed content for this subsection...</p>
<p>Another paragraph with more details...</p>

<h2>Second Major Section Heading</h2>
<p>Opening paragraph...</p>

<h3>Subsection Under Second H2</h3>
<p>Content here...</p>

<h2>Third Major Section Heading</h2>
<p>Content...</p>

<h3>Subsection</h3>
<p>Content...</p>

<h2>Conclusion</h2>
<p>Final summary paragraph...</p>

4. CONTENT QUALITY:
   - Make it informative, engaging, and educational
   - Use natural language and transitions
   - Each paragraph should be 80-150 words

5. RELATED SEARCHES: Generate 4-6 related search phrases. Each phrase must be EXACTLY 5 words.

RESPOND ONLY WITH THIS JSON FORMAT:
{
  "content": "<p>Introduction...</p><h2>First Section</h2><p>Content...</p><h3>Subsection</h3><p>More content...</p>",
  "relatedSearches": ["five word search phrase one", "five word search phrase two"],
  "outline": {
    "h2Sections": ["H2 Title 1", "H2 Title 2", "H2 Title 3"],
    "h3PerH2": [["H3 under H2-1"], ["H3 under H2-2"], ["H3 under H2-3"]]
  }
}`,
          },
          {
            role: 'user',
            content: `Write a comprehensive ${targetWords}+ word blog article about: "${title}". Include exactly ${numH2Sections} H2 sections, with H3 subsections under each H2.`,
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
        JSON.stringify({ error: 'Failed to generate content' }),
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
      // Fallback: return raw content without related searches
      return new Response(
        JSON.stringify({ 
          content: rawContent,
          relatedSearches: [],
          outline: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Content generated successfully');

    return new Response(
      JSON.stringify({ 
        content: parsedContent.content || rawContent,
        relatedSearches: parsedContent.relatedSearches || [],
        outline: parsedContent.outline || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-blog-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
