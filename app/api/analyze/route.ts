import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { AnalysisRequest, InsightResponse } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { 
      transcription,
       topic, 
      // segments 
    } = body;

    if (!transcription) {
      return NextResponse.json(
        { error: 'No transcription provided' },
        { status: 400 }
      );
    }

    const prompt = `You are a UX research expert analyzing user interviews. 
${topic ? `The interview is about: ${topic}` : ''}

Analyze the following interview transcription and extract key insights:

${transcription}

Extract and categorize insights into these types:
1. "pain-point" - User frustrations or problems they experience
2. "quote" - Notable or impactful direct quotes from the user
3. "insight" - Important discoveries or patterns about user behavior
4. "follow-up" - Questions or topics that need further exploration

For each insight, provide:
- type: one of the above categories
- text: the insight description (concise, 1-2 sentences)
- timestamp: approximate time in seconds where this was mentioned (estimate based on context)

Return ONLY a valid JSON array of insights. Each insight should have this structure:
{
  "type": "pain-point" | "quote" | "insight" | "follow-up",
  "text": "description",
  "timestamp": number
}

Example output:
[
  {
    "type": "pain-point",
    "text": "User struggles with finding the export button in the current interface",
    "timestamp": 45
  },
  {
    "type": "quote",
    "text": "I wish there was a faster way to do this. It takes me 10 clicks just to complete one task",
    "timestamp": 120
  }
]`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a UX research expert. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    let insights: InsightResponse[];
    try {
      const parsed = JSON.parse(responseText);
      // Handle both direct array and object with insights property
      insights = Array.isArray(parsed) ? parsed : (parsed.insights || []);
    } catch (parseError) {
      console.error('Failed to parse insights:', parseError);
      insights = [];
    }

    // Add unique IDs to insights
    const formattedInsights = insights.map((insight) => ({
      id: crypto.randomUUID(),
      type: insight.type || 'insight',
      text: insight.text || '',
      timestamp: insight.timestamp || 0,
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      insights: formattedInsights,
      count: formattedInsights.length,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}