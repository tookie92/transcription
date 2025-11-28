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

// 🎯 FONCTIONS HELPER POUR LE FALLBACK
function generateFallbackTitle(projectContext: string): string {
  if (!projectContext) return "Key User Feedback Themes";
  
  if (projectContext.includes('Mobile')) return "Mobile Experience Feedback";
  if (projectContext.includes('E-commerce') || projectContext.includes('Ecommerce')) return "Shopping Journey Insights";
  if (projectContext.includes('Healthcare') || projectContext.includes('Medical')) return "Patient Experience Topics";
  if (projectContext.includes('Finance') || projectContext.includes('Banking')) return "Financial Service Pain Points";
  if (projectContext.includes('Education') || projectContext.includes('Learning')) return "Learning Experience Themes";
  
  // Extraire le nom du projet du contexte
  const projectNameMatch = projectContext.match(/PROJECT NAME: (.+)/);
  if (projectNameMatch && projectNameMatch[1]) {
    return `${projectNameMatch[1].trim()} User Insights`;
  }
  
  return "Key User Feedback Themes";
}

function generateFallbackReason(projectContext: string, insights: InsightRequest[]): string {
  const painPointCount = insights.filter(i => i.type === 'pain-point').length;
  const quoteCount = insights.filter(i => i.type === 'quote').length;
  const insightCount = insights.filter(i => i.type === 'insight').length;
  
  let reason = `These ${insights.length} insights include `;
  const parts: string[] = [];
  
  if (painPointCount > 0) parts.push(`${painPointCount} pain points`);
  if (quoteCount > 0) parts.push(`${quoteCount} user quotes`);
  if (insightCount > 0) parts.push(`${insightCount} research insights`);
  
  reason += parts.join(', ') + ' that reveal important patterns';
  
  if (projectContext && projectContext.includes('PROJECT NAME:')) {
    reason += ' for this project';
  }
  
  return reason + '.';
}

export async function POST(request: NextRequest) {
  // 🎯 DÉCLARER LES VARIABLES EN DEHORS DU TRY
  let insights: InsightRequest[] = [];
  let projectContext: string = '';

  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY is missing');
      return NextResponse.json(
        { error: 'AI service not configured' }, 
        { status: 500 }
      );
    }

    const body: GroupSuggestionRequest = await request.json();
    insights = body.insights;
    projectContext = body.projectContext || ''; // 🎯 MAINTENANT projectContext EST ACCESSIBLE DANS LE CATCH

    const { existingGroups } = body;

    if (!insights || insights.length === 0) {
      return NextResponse.json({ error: 'No insights provided' }, { status: 400 });
    }

    console.log('🎯 Project context received:', projectContext);
    console.log('📊 Insights count:', insights.length);
    console.log('🏷️ Existing groups count:', existingGroups.length);

// app/api/suggest-groups/route.ts - CORRIGER LE PROMPT
const prompt = `
You are a UX research assistant analyzing insights for an affinity diagram.

PROJECT CONTEXT:
${projectContext || 'General user research project'}

EXISTING GROUPS (for reference):
${existingGroups.map(group => `- "${group.title}" (${group.insightIds.length} insights)`).join('\n')}

UNGROUPED INSIGHTS TO ORGANIZE:
${insights.map((insight, index) => `${index + 1}. ID:${insight.id} [${insight.type}] ${insight.text}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. Use the EXACT insight IDs provided above (like "kh70x315yeh67j4ctd52tbfrbx7t3czn")
2. NEVER invent new IDs like "id1", "id2" - use the real IDs from the list
3. Create group titles that are SPECIFIC to the project context
4. Avoid generic titles like "UI Improvements"

For each suggestion, provide:
- Use ONLY the real insight IDs from the list above
- Specific, project-relevant group title
- Clear reasoning that connects the insights to the project goals
- Confidence level (0.1 to 0.9)

IMPORTANT: You MUST use the exact insight IDs provided in the "ID:" field.

Respond with valid JSON only:
{
  "suggestions": [
    {
      "action": "create_new",
      "confidence": 0.85,
      "reason": "Specific explanation tied to project context",
      "insightIds": ["kh70x315yeh67j4ctd52tbfrbx7t3czn", "kh76p0tgk0jb534rx07yeqpbsd7t3z7p"],
      "newGroupTitle": "Project-Specific Theme",
      "newGroupDescription": "How this relates to project goals"
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
      model: "openai/gpt-oss-20b",
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
      return NextResponse.json({ 
        suggestions: [] 
      });
      
    }

    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      console.error('❌ Invalid suggestions structure:', parsedResponse);
      throw new Error('Invalid suggestions format');
    }

    console.log('🤖 AI response received:', {
      suggestionCount: parsedResponse.suggestions.length,
      firstSuggestion: parsedResponse.suggestions[0]
    });
    
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('💥 Groq API error:', error);
    
    // 🎯 MAINTENANT projectContext EST ACCESSIBLE
// Dans le catch de l'API - UTILISER LES VRAIS IDs
const fallbackResponse = {
  suggestions: [
    {
      action: "create_new" as const,
      confidence: 0.8,
      reason: generateFallbackReason(projectContext, insights),
      insightIds: insights.slice(0, Math.min(3, insights.length)).map(i => i.id), // 🎯 VRAIS IDs
      newGroupTitle: generateFallbackTitle(projectContext),
      newGroupDescription: "User insights relevant to project goals"
    }
  ]
};

    console.log('🔄 Using fallback suggestions:', fallbackResponse);
    
    return NextResponse.json(fallbackResponse);
  }
}