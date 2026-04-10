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

// Analyze content to generate specific group names
function analyzeContentForGroupName(insights: InsightRequest[]): string {
  const allText = insights.map(i => i.text.toLowerCase()).join(' ');
  
  // Detect common themes and generate specific names
  const themes: { keywords: string[], name: string }[] = [
    { keywords: ['ui', 'interface', 'design', 'button', 'color', 'layout', 'visual'], name: 'UI/UX Issues' },
    { keywords: ['performance', 'slow', 'loading', 'speed', 'crash', 'bug', 'error'], name: 'Performance Problems' },
    { keywords: ['feature', 'functionality', 'missing', 'add', 'would like', 'need'], name: 'Feature Requests' },
    { keywords: ['navigation', 'menu', 'find', 'search', 'confusing'], name: 'Navigation Challenges' },
    { keywords: ['onboarding', 'learn', 'understand', 'documentation', 'help'], name: 'Onboarding friction' },
    { keywords: ['mobile', 'responsive', 'screen', 'mobile'], name: 'Mobile Experience' },
    { keywords: ['price', 'cost', 'expensive', 'cheap', 'value', 'payment'], name: 'Pricing Concerns' },
    { keywords: ['support', 'customer service', 'response', 'help'], name: 'Support Experience' },
    { keywords: ['login', 'password', 'sign in', 'account', 'register'], name: 'Authentication Issues' },
    { keywords: ['integration', 'api', 'connect', 'third-party', 'tool'], name: 'Integration Needs' },
  ];

  // Find matching theme
  for (const theme of themes) {
    const matches = theme.keywords.filter(kw => allText.includes(kw)).length;
    if (matches >= 2) {
      return theme.name;
    }
  }

  // If no specific theme, analyze types for a better name
  const types = insights.map(i => i.type);
  if (types.includes('pain-point') && types.includes('quote')) {
    return 'Pain Points & Quotes';
  }
  if (types.every(t => t === 'quote')) {
    return 'Key User Quotes';
  }
  if (types.every(t => t === 'insight')) {
    return 'Key Insights';
  }
  
  return 'User Feedback';
}

// Generate coherent groups from insights
function generateCoherentGroups(insights: InsightRequest[]): GroupSuggestionResponse[] {
  if (insights.length === 0) return [];
  
  // Group by content similarity (simple clustering)
  const groups: Map<string, InsightRequest[]> = new Map();
  
  insights.forEach(insight => {
    // Extract key words from insight text
    const words = insight.text.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    // Find a representative word to group by
    const keyWord = words.find(w => 
      !['that', 'this', 'with', 'from', 'have', 'been', 'would', 'could', 'should', 'were', 'their'].includes(w)
    ) || 'general';
    
    const groupKey = keyWord.substring(0, 10);
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(insight);
  });
  
  // Convert to suggestions (only groups with 2+ insights)
  const suggestions: GroupSuggestionResponse[] = [];
  
  groups.forEach((groupInsights, key) => {
    if (groupInsights.length >= 2) {
      suggestions.push({
        action: 'create_new',
        confidence: 0.6 + (groupInsights.length * 0.1), // Higher confidence for larger groups
        reason: `${groupInsights.length} related insights about "${key}"`,
        insightIds: groupInsights.map(i => i.id),
        newGroupTitle: analyzeContentForGroupName(groupInsights),
        newGroupDescription: `Group of ${groupInsights.length} related insights`
      });
    }
  });
  
  // Add remaining single insights as one group if significant
  const groupedIds = new Set(suggestions.flatMap(s => s.insightIds));
  const remaining = insights.filter(i => !groupedIds.has(i.id));
  
  if (remaining.length >= 2) {
    suggestions.push({
      action: 'create_new',
      confidence: 0.5,
      reason: `${remaining.length} additional insights`,
      insightIds: remaining.map(i => i.id),
      newGroupTitle: 'Additional Feedback',
      newGroupDescription: 'Other relevant insights'
    });
  }
  
  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

export async function POST(request: NextRequest) {
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
    projectContext = body.projectContext || '';
    const { existingGroups } = body;

    if (!insights || insights.length === 0) {
      return NextResponse.json({ error: 'No insights provided' }, { status: 400 });
    }

    console.log('🎯 Project context received:', projectContext);
    console.log('📊 Insights count:', insights.length);
    console.log('🏷️ Existing groups count:', existingGroups.length);

    // Improved prompt for better grouping
    const prompt = `
You are a UX research expert analyzing interview insights to create meaningful groups.

PROJECT CONTEXT:
${projectContext || 'General user research project'}

EXISTING GROUPS (for reference):
${existingGroups.map(group => `- "${group.title}" (${group.insightIds.length} insights)`).join('\n') || 'None'}

UNGROUPED INSIGHTS (analyze content to find patterns):
${insights.map((insight, index) => `${index + 1}. [${insight.type.toUpperCase()}] ID:${insight.id} - "${insight.text}"`).join('\n')}

YOUR TASK:
1. ANALYZE the content of each insight to find SEMANTIC SIMILARITY
2. Group insights that discuss the SAME TOPIC or THEME together
3. Give each group a SPECIFIC name based on the actual content (NOT generic names like "User Insights")

Examples of GOOD group names:
- "Navigation Problems" (if insights are about finding things)
- "Mobile UX Issues" (if insights mention mobile)
- "Pricing Concerns" (if insights mention cost)
- "Feature Gaps" (if insights mention missing features)

Examples of BAD group names:
- "Project User Insights" (too generic)
- "Group 1" (not descriptive)
- "Theme" (not informative)

For each group, provide:
- insightIds: EXACT IDs from the list above (2-5 insights per group ideally)
- newGroupTitle: Specific name based on what the insights actually discuss
- confidence: How coherent the group is (0.6-0.9)
- reason: What pattern connects these insights

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "action": "create_new",
      "confidence": 0.8,
      "reason": "These insights all discuss navigation issues",
      "insightIds": ["id1", "id2", "id3"],
      "newGroupTitle": "Navigation Problems"
    }
  ]
}

IMPORTANT: 
- Include 2-5 insights per group
- Create 3-5 different groups covering different topics
- Use the REAL insight IDs from above
- Make titles specific to the content, not generic
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a UX research expert. Analyze insights semantically and create coherent groups with specific names. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 2500
    });

    const content = completion.choices[0]?.message?.content;
    
    console.log('📨 AI raw response:', content?.substring(0, 500));
    
    if (!content) {
      throw new Error('No response from AI service');
    }

    // Parse response
    let parsedResponse: { suggestions?: GroupSuggestionResponse[] };
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Invalid JSON');
        }
      } else {
        throw new Error('No JSON found');
      }
    }

    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      throw new Error('Invalid suggestions format');
    }

    // Validate: ensure insight IDs exist in our insights
    const validIds = new Set(insights.map(i => i.id));
    const validSuggestions = parsedResponse.suggestions.filter(s => 
      s.insightIds.every(id => validIds.has(id)) && s.insightIds.length >= 2
    );

    console.log('🤖 AI response valid suggestions:', validSuggestions.length);
    
    if (validSuggestions.length === 0) {
      // Use fallback
      const fallback = generateCoherentGroups(insights);
      return NextResponse.json({ suggestions: fallback });
    }
    
    return NextResponse.json({ suggestions: validSuggestions });

  } catch (error) {
    console.error('💥 Error:', error);
    
    // Use improved fallback with coherent grouping
    const fallbackResponse = {
      suggestions: generateCoherentGroups(insights)
    };
    
    console.log('🔄 Using coherent fallback:', fallbackResponse.suggestions.length, 'groups');
    
    return NextResponse.json(fallbackResponse);
  }
}