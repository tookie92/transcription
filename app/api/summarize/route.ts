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
    const { transcription, topic, insights, projectContext } = body;

    if (!transcription) {
      return NextResponse.json(
        { error: 'No transcription provided' },
        { status: 400 }
      );
    }

    const prompt = `You are a senior UX research expert analyzing user interviews to provide actionable insights for product development.

PROJECT CONTEXT: ${projectContext || 'General user research project'}
${topic ? `INTERVIEW TOPIC: ${topic}` : ''}

INTERVIEW TRANSCRIPTION:
${transcription}

${insights.length > 0 ? `KEY INSIGHTS IDENTIFIED:
${insights.map(insight => `- [${insight.type}] ${insight.text}`).join('\n')}` : ''}

Based on the interview, provide a comprehensive summary in the following JSON structure:

{
  "executiveSummary": "2-3 paragraph overview of the interview highlighting the most important findings and their business impact",
  "keyPoints": [
    "3-5 bullet points of the most critical findings",
    "Focus on user behaviors, needs, and pain points",
    "Include quantitative observations when possible"
  ],
  "recommendations": [
    "3-5 actionable recommendations for product improvements",
    "Prioritize based on impact and feasibility",
    "Be specific and practical"
  ],
  "mainThemes": [
    "2-4 overarching themes that emerged",
    "Group related insights together",
    "Focus on patterns and trends"
  ],
  "criticalIssues": [
    "Urgent problems that need immediate attention",
    "Potential blockers for user success",
    "High-impact pain points"
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
      model: 'llama-3.3-70b-versatile',
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