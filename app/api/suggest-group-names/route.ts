// app/api/suggest-group-names/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface NameSuggestionRequest {
  insights: Array<{
    text: string;
    type: string;
  }>;
  currentTitle: string;
  projectContext?: string;
}

export async function POST(request: NextRequest) {
  let insights: NameSuggestionRequest['insights'] = [];
  let currentTitle = '';

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('AI service not configured');
    }

    const body: NameSuggestionRequest = await request.json();
    insights = body.insights;
    currentTitle = body.currentTitle;
    const { projectContext } = body;

    if (!insights || insights.length === 0) {
      return NextResponse.json({ error: 'No insights provided' }, { status: 400 });
    }

    const prompt = `
You are a UX research expert helping name affinity diagram groups. Create compelling, actionable group names.

PROJECT CONTEXT:
${projectContext || 'General user research project'}

CURRENT GROUP TITLE: "${currentTitle}"

INSIGHTS IN THIS GROUP:
${insights.map((insight, index) => `${index + 1}. [${insight.type}] ${insight.text}`).join('\n')}

GENERATE 4-6 group name suggestions with these categories:

1. "descriptive": Clearly describes the core theme
2. "actionable": Suggests what to do about the insights  
3. "thematic": Captures the overarching pattern
4. "problem-focused": Highlights the key challenge

For each suggestion, provide:
- A compelling title (max 4 words)
- Brief reasoning based on insight content
- Confidence level (0.1-0.9)
- Category (MUST be one of: "descriptive", "actionable", "thematic", "problem-focused")

Respond with valid JSON:
{
  "suggestions": [
    {
      "title": "Clear, concise title",
      "reason": "Why this name fits the insights",
      "confidence": 0.85,
      "category": "descriptive"
    }
  ]
}
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a UX research expert. Create compelling, actionable group names in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 1500
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    // Try to extract JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Name suggestion error:', error);
    
    // Generate fallback suggestions based on insight types
    const insightTypes = insights.map(i => i.type);
    const hasPainPoints = insightTypes.includes('pain-point');
    const hasQuotes = insightTypes.includes('quote');
    
    const fallbackSuggestions = [
      {
        title: currentTitle || "User Insights",
        reason: "Based on the insights in this group",
        confidence: 0.7,
        category: "descriptive"
      }
    ];
    
    if (hasPainPoints) {
      fallbackSuggestions.push({
        title: "Key Pain Points",
        reason: "Several pain points detected in insights",
        confidence: 0.6,
        category: "problem-focused"
      });
    }
    
    if (hasQuotes) {
      fallbackSuggestions.push({
        title: "User Quotes",
        reason: "Direct quotes from users captured",
        confidence: 0.6,
        category: "descriptive"
      });
    }
    
    return NextResponse.json({ suggestions: fallbackSuggestions });
  }
}
