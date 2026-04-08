// app/api/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { InterviewSummary, SummaryRequest, SummaryResponse } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: SummaryRequest = await request.json();
    const { transcription, topic, language, insights, projectContext } = body;

    if (!transcription) {
      return NextResponse.json(
        { error: 'No transcription provided' },
        { status: 400 }
      );
    }

    let textToSummarize = transcription;

    // Translate non-English transcripts to English
    if (language && language !== 'en' && language !== 'auto') {
      const translatePrompt = `Translate the following interview transcription to English. Preserve the speaker labels and line breaks. Provide only the translation, no explanations:

${transcription}`;

      const translationResponse = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: translatePrompt }],
        temperature: 0.3,
      });

      textToSummarize = translationResponse.choices[0]?.message?.content || transcription;
    }

    const prompt = `You are a senior UX research expert analyzing user interviews to provide actionable insights for product development.

PROJECT CONTEXT: ${projectContext || 'General user research project'}
${topic ? `INTERVIEW TOPIC: ${topic}` : ''}

INTERVIEW TRANSCRIPTION:
${textToSummarize}

${insights.length > 0 ? `KEY INSIGHTS IDENTIFIED:
${insights.map(insight => `- [${insight.type}] ${insight.text}`).join('\n')}` : ''}

Based on the interview, provide a comprehensive summary in the following JSON structure:

{
  "executiveSummary": "2-3 paragraph overview of the interview highlighting the most important findings and their business impact",
  "keyPoints": [
    {
      "point": "Key finding description",
      "quantitativeObservation": "Optional quantitative data or specific user quote"
    }
  ],
  "recommendations": [
    {
      "recommendation": "Actionable recommendation text",
      "priority": "High/Medium/Low"
    }
  ],
  "mainThemes": [
    {
      "theme": "Theme name",
      "description": "Brief description of this theme"
    }
  ],
  "criticalIssues": [
    {
      "issue": "Brief description of the urgent problem",
      "impact": "Impact on user experience or business",
      "urgency": "High/Medium/Low"
    }
  ]
}

Requirements:
- Be concise but comprehensive
- Focus on actionable insights for product teams
- Highlight business implications
- Use professional UX research terminology
- Prioritize findings by importance and impact

Return ONLY valid JSON, no additional text.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a senior UX research expert. Always respond with valid JSON only. Focus on actionable insights for product development.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    let summaryData: InterviewSummary;
    try {
      const parsed = JSON.parse(responseText);
      summaryData = {
        executiveSummary: parsed.executiveSummary || '',
        keyPoints: parsed.keyPoints || [],
        recommendations: parsed.recommendations || [],
        mainThemes: parsed.mainThemes || [],
        criticalIssues: parsed.criticalIssues || [],
        generatedAt: Date.now(),
      };
    } catch (parseError) {
      console.error('Failed to parse summary:', parseError);
      throw new Error('Failed to generate summary');
    }

    return NextResponse.json({
      summary: summaryData,
    } as SummaryResponse);
  } catch (error) {
    console.error('Summary generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Summary generation failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}