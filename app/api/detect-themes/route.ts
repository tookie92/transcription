// app/api/detect-themes/route.ts - VERSION REFONDUE
import { NextRequest, NextResponse } from 'next/server';
import { ThemeAnalysis, DetectedTheme, ThemeRecommendation } from '@/types';

// Types pour la requête
interface AnalysisGroup {
  id: string;
  title: string;
  insights: string[];
  insightCount: number;
}

interface ThemeDetectionRequest {
  groups: AnalysisGroup[];
  projectContext?: string;
  totalGroups: number;
  totalInsights: number;
}

// Types pour la réponse brute de l'IA
interface RawTheme {
  id?: string;
  name?: string;
  type?: string;
  confidence?: number;
  groupIds?: string[];
  description?: string;
  insightsCount?: number;
}

interface RawSummary {
  totalThemes?: number;
  coverage?: number;
  avgConfidence?: number;
  mainTheme?: RawTheme;
}

interface RawRecommendation {
  type?: string;
  groups?: string[];
  reason?: string;
  confidence?: number;
  expectedImpact?: string;
}

interface RawAnalysis {
  themes?: RawTheme[];
  summary?: RawSummary;
  recommendations?: RawRecommendation[];
}

// 🆕 FONCTION PRINCIPALE DE VALIDATION
function validateThemeAnalysis(data: unknown, originalGroups: AnalysisGroup[], totalGroups: number): ThemeAnalysis {
  // Vérifier que data est un objet
  if (typeof data !== 'object' || data === null) {
    console.log('❌ Données invalides pour la validation');
    return getFallbackAnalysis();
  }

  const rawData = data as RawAnalysis;
  
  console.log('🔍 Validation - données reçues:', {
    themesCount: rawData.themes?.length || 0,
    hasSummary: !!rawData.summary,
    hasRecommendations: !!rawData.recommendations
  });

  // 1. VALIDER LES THÈMES
  const validatedThemes: DetectedTheme[] = [];
  
  if (Array.isArray(rawData.themes)) {
    rawData.themes.forEach((theme: RawTheme, index: number) => {
      // Vérifier que le thème a des groupes valides
      const validGroupIds = Array.isArray(theme.groupIds) 
        ? theme.groupIds.filter(groupId => 
            originalGroups.some(g => g.id === groupId)
          )
        : [];
      
      // Un thème doit avoir au moins 1 groupe valide
      if (validGroupIds.length >= 1) {
        const validatedTheme: DetectedTheme = {
          id: theme.id || `theme-${Date.now()}-${index}`,
          name: theme.name || `Theme ${index + 1}`,
          type: (['hierarchical', 'related', 'contradictory', 'complementary'].includes(theme.type || '') 
            ? theme.type as 'hierarchical' | 'related' | 'contradictory' | 'complementary'
            : 'related'),
          confidence: typeof theme.confidence === 'number' 
            ? Math.max(0.1, Math.min(1, theme.confidence)) 
            : 0.7,
          groupIds: validGroupIds,
          description: theme.description || `Pattern connecting ${validGroupIds.length} groups`,
          insightsCount: typeof theme.insightsCount === 'number' 
            ? Math.max(0, theme.insightsCount) 
            : validGroupIds.length,
          parentThemeId: undefined
        };
        
        validatedThemes.push(validatedTheme);
        console.log(`✅ Thème validé: "${validatedTheme.name}" avec ${validGroupIds.length} groupes`);
      } else {
        console.warn(`❌ Thème ignoré: aucun groupe valide pour "${theme.name}"`);
      }
    });
  }

  console.log(`🎯 Thèmes validés: ${validatedThemes.length}`);

  // 2. VALIDER LE SUMMARY
  const validatedSummary = {
    totalThemes: typeof rawData.summary?.totalThemes === 'number' 
      ? Math.max(0, rawData.summary.totalThemes) 
      : validatedThemes.length,
    coverage: typeof rawData.summary?.coverage === 'number' 
      ? Math.max(0, Math.min(100, rawData.summary.coverage)) 
      : validatedThemes.length > 0 ? 50 : 0,
    avgConfidence: typeof rawData.summary?.avgConfidence === 'number' 
      ? Math.max(0, Math.min(1, rawData.summary.avgConfidence)) 
      : validatedThemes.length > 0 
        ? validatedThemes.reduce((sum, t) => sum + t.confidence, 0) / validatedThemes.length 
        : 0,
    mainTheme: validatedThemes[0] || undefined
  };

  // 3. VALIDER LES RECOMMENDATIONS
  const validatedRecommendations = validateRecommendations(
    rawData.recommendations,
    validatedThemes,
    originalGroups,
    totalGroups
  );

  console.log('📊 Analyse validée:', {
    themes: validatedThemes.length,
    recommendations: validatedRecommendations.length,
    coverage: validatedSummary.coverage
  });

  return {
    themes: validatedThemes,
    summary: validatedSummary,
    recommendations: validatedRecommendations
  };
}

// 🆕 FONCTION DE VALIDATION DES RECOMMENDATIONS
function validateRecommendations(
  rawRecommendations: RawRecommendation[] | undefined,
  themes: DetectedTheme[],
  analysisGroups: AnalysisGroup[],
  totalGroups: number
): ThemeRecommendation[] {
  const recommendations: ThemeRecommendation[] = [];

  // Option 1: Utiliser les recommendations de l'IA si disponibles
  if (Array.isArray(rawRecommendations) && rawRecommendations.length > 0) {
    console.log('📋 Utilisation des recommendations IA:', rawRecommendations.length);
    
    rawRecommendations.forEach((rec: RawRecommendation, index: number) => {
      if (rec.type && rec.reason) {
        const validGroups = Array.isArray(rec.groups) 
          ? rec.groups.filter(groupId => analysisGroups.some(g => g.id === groupId))
          : [];

        recommendations.push({
          type: (['merge', 'split', 'reorganize', 'create_parent'].includes(rec.type) 
            ? rec.type as 'merge' | 'split' | 'reorganize' | 'create_parent'
            : 'reorganize'),
          groups: validGroups,
          reason: rec.reason || `Recommendation ${index + 1}`,
          confidence: typeof rec.confidence === 'number' 
            ? Math.max(0.3, Math.min(1, rec.confidence)) 
            : 0.7,
          expectedImpact: (['high', 'medium', 'low'].includes(rec.expectedImpact || '') 
            ? rec.expectedImpact as 'high' | 'medium' | 'low'
            : 'medium')
        });
      }
    });
  }

  // Option 2: Générer automatiquement si nécessaire
  if (recommendations.length === 0 && themes.length > 0) {
    console.log('🎯 Génération automatique de recommendations');
    const autoRecommendations = generateAutomaticRecommendations(themes, analysisGroups, totalGroups);
    recommendations.push(...autoRecommendations);
  }

  // Trier et limiter
  return recommendations
    .sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return (impactOrder[b.expectedImpact] - impactOrder[a.expectedImpact]) || 
             (b.confidence - a.confidence);
    })
    .slice(0, 6);
}

// 🆕 FONCTION DE GÉNÉRATION AUTOMATIQUE
function generateAutomaticRecommendations(
  themes: DetectedTheme[], 
  analysisGroups: AnalysisGroup[], 
  totalGroups: number
): ThemeRecommendation[] {
  const recommendations: ThemeRecommendation[] = [];

  // 1. Recommendations MERGE pour thèmes similaires
  themes.forEach(theme => {
    if (theme.groupIds.length >= 2 && theme.confidence > 0.6) {
      const themeGroups = analysisGroups.filter(g => theme.groupIds.includes(g.id));
      if (themeGroups.length >= 2) {
        recommendations.push({
          type: 'merge',
          groups: theme.groupIds.slice(0, 3),
          reason: `High similarity (${Math.round(theme.confidence * 100)}%): ${themeGroups.length} groups share "${theme.description?.substring(0, 40)}..."`,
          confidence: theme.confidence,
          expectedImpact: 'high'
        });
      }
    }
  });

  // 2. Recommendations HIÉRARCHIQUES
  themes.forEach(theme => {
    if (theme.type === 'hierarchical' && theme.groupIds.length >= 2) {
      recommendations.push({
        type: 'create_parent',
        groups: theme.groupIds,
        reason: `Hierarchical structure detected. Create parent theme: "${theme.name}"`,
        confidence: theme.confidence,
        expectedImpact: 'medium'
      });
    }
  });

  // 3. Recommendations SPLIT pour grands groupes
  const largeGroups = analysisGroups.filter(group => group.insightCount > 5);
  largeGroups.forEach(group => {
    recommendations.push({
      type: 'split',
      groups: [group.id],
      reason: `Large group "${group.title}" (${group.insightCount} insights) may contain multiple concepts`,
      confidence: 0.6,
      expectedImpact: 'medium'
    });
  });

  // 4. Recommendations REORGANIZE
  const coveredGroupIds = new Set(themes.flatMap(theme => theme.groupIds));
  const uncoveredGroups = analysisGroups.filter(group => !coveredGroupIds.has(group.id));
  
  if (uncoveredGroups.length > 2) {
    recommendations.push({
      type: 'reorganize',
      groups: uncoveredGroups.map(g => g.id),
      reason: `${uncoveredGroups.length} isolated groups need review`,
      confidence: 0.7,
      expectedImpact: 'medium'
    });
  }

  console.log(`🤖 Recommendations auto-générées: ${recommendations.length}`);
  return recommendations;
}

// 🆕 FONCTION DE FALLBACK
function getFallbackAnalysis(): ThemeAnalysis {
  console.log('🔄 Utilisation du fallback analysis');
  return {
    themes: [],
    summary: {
      totalThemes: 0,
      coverage: 0,
      avgConfidence: 0,
      mainTheme: undefined
    },
    recommendations: []
  };
}

// 🎯 HANDLER PRINCIPAL
export async function POST(request: NextRequest) {
  try {
    const body: ThemeDetectionRequest = await request.json();
    
    console.log('🚀 Détection de thèmes demandée:', {
      groups: body.groups.length,
      totalInsights: body.totalInsights,
      hasContext: !!body.projectContext
    });

    // Appel à l'IA Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: `You are an expert UX researcher and thematic analysis specialist. 
            Analyze affinity groups to discover higher-level themes and patterns.
            
            Return a VALID JSON object with this EXACT structure:
            {
              "themes": [
                {
                  "id": "unique-id",
                  "name": "Theme Name", 
                  "type": "hierarchical|related|contradictory|complementary",
                  "confidence": 0.0-1.0,
                  "groupIds": ["group-id-1", "group-id-2"],
                  "description": "Clear description explaining the theme and relationships",
                  "insightsCount": number
                }
              ],
              "summary": {
                "totalThemes": number,
                "coverage": 0-100,
                "avgConfidence": 0.0-1.0,
                "mainTheme": { theme object or null }
              },
              "recommendations": [
                {
                  "type": "merge|split|reorganize|create_parent",
                  "groups": ["group-id-1", "group-id-2"],
                  "reason": "Clear explanation",
                  "confidence": 0.0-1.0,
                  "expectedImpact": "high|medium|low"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analyze these ${body.totalGroups} affinity groups from a ${body.projectContext || 'user research'} project:
            
            ${body.groups.map(group => `
            Group ID: ${group.id}
            Title: "${group.title}"
            Insights (${group.insightCount}): ${group.insights.slice(0, 3).join('; ')}${group.insights.length > 3 ? '...' : ''}
            `).join('\n')}
            
            Identify emergent themes, relationships, and patterns. Focus on semantic relationships and hierarchical structures.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API request failed: ${groqResponse.statusText}`);
    }

    const data = await groqResponse.json();
    console.log('📨 Réponse Groq reçue');
    
    const rawAnalysis = JSON.parse(data.choices[0].message.content);
    console.log('📊 Analyse brute:', {
      themes: rawAnalysis.themes?.length,
      recommendations: rawAnalysis.recommendations?.length
    });

    // Validation complète
    const validatedAnalysis = validateThemeAnalysis(rawAnalysis, body.groups, body.totalGroups);

    return NextResponse.json(validatedAnalysis);

  } catch (error) {
    console.error('💥 Theme detection API error:', error);
    return NextResponse.json(getFallbackAnalysis());
  }
}