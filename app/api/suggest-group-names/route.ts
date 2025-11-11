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
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('AI service not configured');
    }

    const body: NameSuggestionRequest = await request.json();
    const { insights, currentTitle, projectContext } = body;

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
          content: "You are a UX research expert. Create compelling, actionable group names in valid JSON format. Use ONLY the specified category values."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai/gpt-oss-20b", // 🎯 NOUVEAU MODÈLE
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    const parsedResponse = JSON.parse(content);
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Name suggestion error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}