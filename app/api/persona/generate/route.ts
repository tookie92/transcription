// app/api/persona/generate/route.ts
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

interface UserPersona {
  id: string;
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

    // 🎯 CRÉER UN CONTEXTE RICHE POUR LA GÉNÉRATION
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

Return a JSON object with this exact structure:
{
  "name": "Realistic full name",
  "age": number between 25-65,
  "occupation": "Realistic job title",
  "background": "2-3 sentence background story",
  "goals": ["3-4 specific goals"],
  "frustrations": ["3-4 specific pain points"],
  "behaviors": ["3-4 key behavioral patterns"],
  "quote": "Memorable quote that captures their perspective",
  "demographics": {
    "education": "e.g., Bachelor's Degree, Master's, etc.",
    "income": "e.g., $50k-75k, $75k-100k, etc.",
    "location": "e.g., Urban, Suburban, Rural",
    "techProficiency": "beginner/intermediate/expert"
  },
  "psychographics": {
    "motivations": ["2-3 core motivations"],
    "values": ["2-3 key values"],
    "personality": ["2-3 personality traits"]
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
    
    let personaData: Omit<UserPersona, 'id'>;
    try {
      personaData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse persona:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate persona data' },
        { status: 500 }
      );
    }

    // 🎯 GÉNÉRER UNE IMAGE DE PROFIL GRATUITE
    const profileImage = await generateProfileImage(personaData);

    const completePersona: UserPersona = {
      id: crypto.randomUUID(),
      ...personaData,
    };

    return NextResponse.json({
      persona: completePersona,
      profileImage,
      groupsUsed: groups.length,
      insightsUsed: insights.length,
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

// 🎯 GÉNÉRATION D'IMAGE DE PROFIL GRATUITE
async function generateProfileImage(persona: Omit<UserPersona, 'id'>): Promise<string> {
  try {
    // Solution 1: Utiliser Picsum.photos avec des paramètres basés sur le persona
    const ageGroup = persona.age < 30 ? 'young' : persona.age < 50 ? 'adult' : 'senior';
    const gender = Math.random() > 0.5 ? 'men' : 'women';
    
    // Picsum offre des photos réelles d'humains
    const picsumId = Math.floor(Math.random() * 100) + 1;
    return `https://picsum.photos/400/400?random=${picsumId}`;
    
  } catch (error) {
    // Solution de fallback: Utiliser Unsplash avec des mots-clés
    const keywords = encodeURIComponent(`${persona.occupation} ${persona.demographics.location} person`);
    return `https://source.unsplash.com/400x400/?portrait,${keywords}`;
  }
}