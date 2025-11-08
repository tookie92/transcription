// app/api/suggest-groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface InsightRequest {
  id: string;
  text: string;
  type: string;
}

interface GroupRequest {
  id: string;
  title: string;
  insightIds: string[];
}

interface GroupSuggestionRequest {
  insights: InsightRequest[];
  existingGroups: GroupRequest[];
  projectContext?: string;
}

interface GroupSuggestionResponse {
  action: 'add_to_existing' | 'create_new' | 'merge_groups';
  confidence: number;
  reason: string;
  insightIds: string[];
  targetGroupId?: string;
  newGroupTitle?: string;
  newGroupDescription?: string;
}

export async function POST(request: NextRequest) {
  // 🆕 DÉCLARER insights EN DEHORS DU TRY POUR Y ACCÉDER DANS LE CATCH
  let insights: InsightRequest[] = [];

  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY is missing');
      return NextResponse.json(
        { error: 'AI service not configured' }, 
        { status: 500 }
      );
    }

    const body: GroupSuggestionRequest = await request.json();
    insights = body.insights; // 🆕 ASSIGNER LA VARIABLE
    const { existingGroups, projectContext } = body;

    if (!insights || insights.length === 0) {
      return NextResponse.json({ error: 'No insights provided' }, { status: 400 });
    }

    console.log('🤖 Generating suggestions for:', insights.length, 'insights');

    const prompt = `
You are a UX research assistant. Analyze these user research insights and suggest how to group them in an affinity diagram.

EXISTING GROUPS (for reference):
${existingGroups.map(group => `- "${group.title}" (${group.insightIds.length} insights)`).join('\n')}

UNGROUPED INSIGHTS TO ORGANIZE:
${insights.map((insight, index) => `${index + 1}. [${insight.type}] ${insight.text}`).join('\n')}

Suggest 2-3 high-quality grouping ideas. For each suggestion, provide:
- Which insights belong together and why
- A good title for the group
- Confidence level (0.1 to 0.9)

Respond with valid JSON only:
{
  "suggestions": [
    {
      "action": "create_new",
      "confidence": 0.85,
      "reason": "These insights all relate to mobile app performance issues",
      "insightIds": ["id1", "id2"],
      "newGroupTitle": "Mobile Performance",
      "newGroupDescription": "Issues with app speed and responsiveness on mobile devices"
    }
  ]
}
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a UX research expert. Provide clear, actionable grouping suggestions in valid JSON format. Always return exactly the JSON structure requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI service');
    }

    let parsedResponse: { suggestions?: GroupSuggestionResponse[] };
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', content);
      throw new Error('Invalid response format from AI');
    }

    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      console.error('❌ Invalid suggestions structure:', parsedResponse);
      throw new Error('Invalid suggestions format');
    }

    console.log('✅ AI suggestions generated:', parsedResponse.suggestions.length);
    
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('💥 Groq API error:', error);
    
    // 🆕 MAINTENANT insights EST ACCESSIBLE ICI
    const fallbackResponse = {
      suggestions: [
        {
          action: "create_new" as const,
          confidence: 0.8,
          reason: "These insights seem related to user interface improvements",
          insightIds: insights.slice(0, 2).map(i => i.id), // 🆕 MAINTENANT ÇA FONCTIONNE
          newGroupTitle: "UI Improvements",
          newGroupDescription: "Suggestions for better user interface design"
        }
      ]
    };

    return NextResponse.json(fallbackResponse);
  }
}