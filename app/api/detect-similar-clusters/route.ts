// app/api/detect-similar-clusters/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface ClusterInsight {
  id: string;
  content: string;
  type: string;
}

interface Cluster {
  id: string;
  title: string;
  insights: ClusterInsight[];
}

interface SimilarityResult {
  clusterAId: string;
  clusterATitle: string;
  clusterBId: string;
  clusterBTitle: string;
  similarityScore: number;
  reason: string;
  mergedTitle?: string;
}

interface DetectionRequest {
  clusters: Cluster[];
  projectContext?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: DetectionRequest = await req.json();
    const { clusters, projectContext } = body;

    if (!clusters || clusters.length < 2) {
      return NextResponse.json({
        suggestions: [],
        message: "Need at least 2 clusters to compare"
      });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({
        suggestions: [],
        error: "OpenAI API key not configured"
      }, { status: 500 });
    }

    // Build prompt for OpenAI
    const clustersDescription = clusters.map((c, i) => 
      `Cluster ${i + 1}: "${c.title}"\nInsights:\n${c.insights.map((ins, j) => `  ${j + 1}. [${ins.type}] ${ins.content}`).join('\n')}`
    ).join('\n\n');

    const prompt = `You are a UX research analyst. Analyze these affinity map clusters and find groups that talk about similar themes.

Project Context: ${projectContext || 'General research project'}

Clusters:
${clustersDescription}

Your task:
1. Compare each pair of clusters
2. Identify clusters that share similar themes, topics, or concepts
3. Score similarity from 0-100%
4. Suggest a merged title if clusters are similar

Return a JSON array of similar cluster pairs:
[{
  "clusterAId": "id1",
  "clusterATitle": "Title A",
  "clusterBId": "id2", 
  "clusterBTitle": "Title B",
  "similarityScore": 75,
  "reason": "Both clusters discuss pricing concerns and budget issues",
  "mergedTitle": "Cost & Budget Concerns"
}]

Only include pairs with similarityScore >= 50%.
Return empty array if no similar clusters found.
Return ONLY the JSON array, no markdown or explanation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'You are a JSON-only response AI. Always return valid JSON.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ suggestions: [] });
    }

    // Parse JSON response
    let suggestions: SimilarityResult[];
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?|```\n?/g, '').trim();
      suggestions = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json({
      suggestions,
      clustersAnalyzed: clusters.length,
      pairsCompared: (clusters.length * (clusters.length - 1)) / 2
    });

  } catch (error) {
    console.error('Error in detect-similar-clusters:', error);
    return NextResponse.json({
      suggestions: [],
      error: error instanceof Error ? error.message : 'Internal error'
    }, { status: 500 });
  }
}
