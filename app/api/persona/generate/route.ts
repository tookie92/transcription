// app/api/persona/generate/route.ts - VERSION SIMPLIFIÉE
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface PersonaRequest {
  groups: Array<{
    title: string;
    insightIds: string[];
  }>;
  insights: Array<{
    id: string;
    text: string;
    type: string;
  }>;
  projectContext?: string;
  dotVotingResults?: Array<{
    sectionId: string;
    title: string;
    voteCount: number;
  }>;
}

interface UserPersonaResponse {
  name: string;
  gender: 'male' | 'female';
  age: number;
  occupation: string;
  background: string;
  goals: string[];
  frustrations: string[];
  behaviors: string[];
  quote: string;
  demographics: {
    education: string;
    income: string;
    location: string;
    techProficiency: 'beginner' | 'intermediate' | 'expert';
  };
  psychographics: {
    motivations: string[];
    values: string[];
    personality: string[];
  };
}

// 🎯 CREATIVE NAMES BY GENDER
const CREATIVE_NAMES = {
  male: {
    tech: ["Alex Techlover", "Max Connected", "Tom Geek", "Mark Algorithmic", "Chris Builder", "David Digital", "James App", "Ryan Software"],
    creative: ["Lucas Creative", "Hugo Artistic", "Nathan Imaginative", "Theo Conceptual", "Jack Design", "Oliver Art", "Ethan Creative", "Mason Vision"],
    business: ["Paul Strategist", "Pierre Proactive", "Anthony Visionary", "David Ambitious", "Michael Leader", "Charles Manager", "Thomas Strategy", "Daniel Enterprise"],
    general: ["Thomas Observer", "Simon Methodical", "Kevin Optimistic", "Nicholas Analytical", "Peter Curious", "George Practical", "Andrew Reflective", "Brian Logical"]
  },
  female: {
    tech: ["Sarah Coder", "Clara Digital", "Lea Innovator", "Julie 2.0", "Emma Tech", "Sophie Code", "Mia Digital", "Grace Builder"],
    creative: ["Sophie Social", "Emma Inspiring", "Chloe Visionary", "Zoe Creative", "Lily Design", "Ava Artistic", "Isabella Art", "Mila Vision"],
    business: ["Marie Manager", "Anna Entrepreneur", "Camille Leader", "Laura Organized", "Jessica Business", "Rachel Strategy", "Nicole Enterprise", "Victoria Pro"],
    general: ["Julie Curious", "Alice Pragmatic", "Lea Persistent", "Manon Reflective", "Emma Observer", "Sophie Practical", "Chloe Logical", "Nina Analytical"]
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: PersonaRequest = await request.json();
    const { groups, insights, projectContext, dotVotingResults } = body;

    if (!groups || groups.length === 0) {
      return NextResponse.json(
        { error: 'No groups provided for persona generation' },
        { status: 400 }
      );
    }

    // 🎯 ANALYZE CONTEXT FOR CREATIVE NAME
    const { gender, category } = determineGenderAndCategory(groups, projectContext);
    const creativeName = getCreativeName(gender, category);

    const insightsText = insights.map(insight => 
      `- ${insight.type.toUpperCase()}: ${insight.text}`
    ).join('\n');

    const groupsText = groups.map(group => {
      const votingInfo = dotVotingResults?.find(r => r.title === group.title);
      const voteCount = votingInfo?.voteCount || 0;
      const priority = voteCount > 0 ? ` (${voteCount} votes - HIGH PRIORITY)` : '';
      return `- ${group.title}: ${group.insightIds.length} insights${priority}`;
    }).join('\n');

    // Build priority context
    const priorityGroups = dotVotingResults
      ?.filter(r => r.voteCount > 0)
      .sort((a, b) => b.voteCount - a.voteCount)
      .map(r => r.title) || [];

    const priorityContext = priorityGroups.length > 0 
      ? `\n\nPRIORITY CONTEXT: The following clusters received the most votes during dot voting and should be given extra emphasis:\n${priorityGroups.map((title, i) => `${i + 1}. ${title}`).join('\n')}`
      : '';

    const prompt = `You are a UX Research expert creating detailed user personas based on affinity mapping data.

PROJECT CONTEXT: ${projectContext || 'General user research project'}

AFFINITY GROUPS (patterns discovered):
${groupsText}

KEY INSIGHTS FROM USER RESEARCH:
${insightsText}
${priorityContext}

Based on these research insights, create a comprehensive user persona that represents the main user archetype.

IMPORTANT: Use the name "${creativeName}" for this persona.

Return a JSON object with this exact structure:
{
  "name": "${creativeName}",
  "gender": "${gender}",
  "age": number between 25-65,
  "occupation": "Realistic job title that matches the research insights",
  "background": "2-3 sentence background story based on the research",
  "goals": ["3-4 specific goals derived from the insights"],
  "frustrations": ["3-4 specific pain points from the research"],
  "behaviors": ["3-4 key behavioral patterns observed"],
  "quote": "Memorable quote that captures their perspective based on the insights",
  "demographics": {
    "education": "e.g., Bachelor's Degree, Master's, etc.",
    "income": "e.g., $50k-75k, $75k-100k, etc.",
    "location": "e.g., Urban, Suburban, Rural",
    "techProficiency": "beginner/intermediate/expert"
  },
  "psychographics": {
    "motivations": ["2-3 core motivations from the research"],
    "values": ["2-3 key values observed"],
    "personality": ["2-3 personality traits derived from behaviors"]
  }
}

Make the persona realistic, specific, and directly based on the research insights provided. Give special attention to the priority clusters if any are listed above.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a senior UX researcher. Always respond with valid JSON only, no markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    let personaData: UserPersonaResponse;
    try {
      personaData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse persona:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate persona data' },
        { status: 500 }
      );
    }

    // 🎯 SIMPLE PROFILE IMAGE GENERATION
    const profileImage = generateSimpleProfileImage(personaData);

    return NextResponse.json({
      persona: personaData,
      profileImage,
      basedOn: {
        groups: groups.length,
        insights: insights.length,
        groupTitles: groups.map(g => g.title),
      },
    });

  } catch (error) {
    console.error('Persona generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Persona generation failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// 🎯 DETERMINE GENDER AND CATEGORY
function determineGenderAndCategory(groups: Array<{title: string}>, projectContext?: string): { gender: 'male' | 'female'; category: keyof typeof CREATIVE_NAMES.male } {
  const allText = [...groups.map(g => g.title), projectContext || ''].join(' ').toLowerCase();
  
  // Randomly pick gender for variety
  const gender: 'male' | 'female' = Math.random() > 0.5 ? 'male' : 'female';
  
  let category: keyof typeof CREATIVE_NAMES.male = 'general';
  if (allText.includes('tech') || allText.includes('digital') || allText.includes('app') || allText.includes('software')) {
    category = 'tech';
  } else if (allText.includes('design') || allText.includes('creative') || allText.includes('art') || allText.includes('social')) {
    category = 'creative';
  } else if (allText.includes('business') || allText.includes('manager') || allText.includes('enterprise') || allText.includes('strategy')) {
    category = 'business';
  }
  
  return { gender, category };
}

// 🎯 GET CREATIVE NAME
function getCreativeName(gender: 'male' | 'female', category: keyof typeof CREATIVE_NAMES.male): string {
  const names = CREATIVE_NAMES[gender][category];
  return names[Math.floor(Math.random() * names.length)];
}

// 🎯 SIMPLE PROFILE IMAGE GENERATION WITHOUT EXTERNAL APIS
function generateSimpleProfileImage(persona: UserPersonaResponse): string {
  const gender = persona.gender === 'female' ? 'women' : 'men';
  const id = Math.floor(Math.random() * 50);
  return `https://randomuser.me/api/portraits/med/${gender}/${id}.jpg`;
}