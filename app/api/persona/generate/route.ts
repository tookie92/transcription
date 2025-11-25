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
}

interface UserPersonaResponse {
  name: string;
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

// 🎯 CREATIVE NAMES IN ENGLISH
const CREATIVE_NAMES = {
  tech: [
    "Sarah Coder", "Alex Techlover", "Clara Digital", "Max Connected", 
    "Lea Innovator", "Tom Geek", "Julie 2.0", "Mark Algorithmic"
  ],
  creative: [
    "Sophie Social", "Lucas Creative", "Emma Inspiring", "Hugo Artistic",
    "Chloe Visionary", "Nathan Imaginative", "Zoe Creative", "Theo Conceptual"
  ],
  business: [
    "Marie Manager", "Paul Strategist", "Anna Entrepreneur", "Pierre Proactive",
    "Camille Leader", "Anthony Visionary", "Laura Organized", "David Ambitious"
  ],
  general: [
    "Julie Curious", "Thomas Observer", "Alice Pragmatic", "Simon Methodical",
    "Lea Persistent", "Kevin Optimistic", "Manon Reflective", "Nicholas Analytical"
  ]
};

export async function POST(request: NextRequest) {
  try {
    const body: PersonaRequest = await request.json();
    const { groups, insights, projectContext } = body;

    if (!groups || groups.length === 0) {
      return NextResponse.json(
        { error: 'No groups provided for persona generation' },
        { status: 400 }
      );
    }

    // 🎯 ANALYZE CONTEXT FOR CREATIVE NAME
    const nameCategory = determineNameCategory(groups, projectContext);
    const creativeName = getCreativeName(nameCategory);

    const insightsText = insights.map(insight => 
      `- ${insight.type.toUpperCase()}: ${insight.text}`
    ).join('\n');

    const groupsText = groups.map(group => 
      `- ${group.title}: ${group.insightIds.length} insights`
    ).join('\n');

    const prompt = `You are a UX Research expert creating detailed user personas based on affinity mapping data.

PROJECT CONTEXT: ${projectContext || 'General user research project'}

AFFINITY GROUPS (patterns discovered):
${groupsText}

KEY INSIGHTS FROM USER RESEARCH:
${insightsText}

Based on these research insights, create a comprehensive user persona that represents the main user archetype.

IMPORTANT: Use the name "${creativeName}" for this persona.

Return a JSON object with this exact structure:
{
  "name": "${creativeName}",
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

Make the persona realistic, specific, and directly based on the research insights provided.`;

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
      model: 'llama-3.3-70b-versatile',
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

// 🎯 DETERMINE NAME CATEGORY
function determineNameCategory(groups: Array<{title: string}>, projectContext?: string): keyof typeof CREATIVE_NAMES {
  const allText = [...groups.map(g => g.title), projectContext || ''].join(' ').toLowerCase();
  
  if (allText.includes('tech') || allText.includes('digital') || allText.includes('app') || allText.includes('software')) {
    return 'tech';
  } else if (allText.includes('design') || allText.includes('creative') || allText.includes('art') || allText.includes('social')) {
    return 'creative';
  } else if (allText.includes('business') || allText.includes('manager') || allText.includes('enterprise') || allText.includes('strategy')) {
    return 'business';
  }
  
  return 'general';
}

// 🎯 GET CREATIVE NAME
function getCreativeName(category: keyof typeof CREATIVE_NAMES): string {
  const names = CREATIVE_NAMES[category];
  return names[Math.floor(Math.random() * names.length)];
}

// 🎯 SIMPLE PROFILE IMAGE GENERATION WITHOUT EXTERNAL APIS
function generateSimpleProfileImage(persona: UserPersonaResponse): string {
  const portraitAPIs = [
    // 1. Random User API (very reliable)
    () => {
      const gender = Math.random() > 0.5 ? 'women' : 'men';
      const id = Math.floor(Math.random() * 50);
      return `https://randomuser.me/api/portraits/med/${gender}/${id}.jpg`;
    },
    // 2. Pravatar (styled avatars but human-like)
    () => {
      const seed = persona.name.replace(/\s+/g, '');
      return `https://i.pravatar.cc/400?u=${seed}`;
    },
    // 3. UI Faces (professional service)
    () => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(persona.name)}&background=0D8ABC&color=fff&size=400&bold=true&font-size=0.5`;
    },
    // 4. DiceBear with human style
    () => {
      const seed = persona.name.replace(/\s+/g, '');
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=65c9ff,b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    },
    // 5. RoboHash alternative
    () => {
      const seed = persona.name.replace(/\s+/g, '');
      return `https://robohash.org/${seed}?set=set4&size=400x400`;
    }
  ];

  // 🎯 CHOOSE AN API RANDOMLY
  const selectedAPI = portraitAPIs[Math.floor(Math.random() * portraitAPIs.length)];
  return selectedAPI();
}