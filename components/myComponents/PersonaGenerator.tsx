// components/PersonaGenerator.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, User, Download, RefreshCw } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { toast } from "sonner";
import Image from "next/image";
import { ScrollArea } from "../ui/scroll-area";

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

interface PersonaGeneratorProps {
  groups: AffinityGroup[];
  insights: Insight[];
  projectContext?: string;
}

export function PersonaGenerator({ groups, insights, projectContext }: PersonaGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [profileImage, setProfileImage] = useState<string>('');

  const generatePersona = async () => {
    if (groups.length === 0) {
      toast.error("Need at least one group to generate persona");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/persona/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groups: groups.map(group => ({
            title: group.title,
            insightIds: group.insightIds,
          })),
          insights: insights.map(insight => ({
            id: insight.id,
            text: insight.text,
            type: insight.type,
          })),
          projectContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate persona');
      }

      const data = await response.json();
      setPersona(data.persona);
      setProfileImage(data.profileImage);
      
      toast.success(`Persona "${data.persona.name}" generated successfully!`);
    } catch (error) {
      console.error('Persona generation error:', error);
      toast.error('Failed to generate persona');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPersona = () => {
    if (!persona) return;

    const personaData = {
      generatedAt: new Date().toISOString(),
      basedOn: {
        groups: groups.length,
        insights: insights.length,
        projectContext,
      },
      persona,
    };

    const blob = new Blob([JSON.stringify(personaData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `persona-${persona.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          User Persona Generator
        </CardTitle>
        <CardDescription>
          Generate realistic user personas from your affinity map insights
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* BOUTON DE GÉNÉRATION */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Based on your research</p>
            <p className="text-sm text-muted-foreground">
              {groups.length} groups • {insights.length} insights
            </p>
          </div>
          
          <Button
            onClick={generatePersona}
            disabled={isGenerating || groups.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Persona'}
          </Button>
        </div>

        {/* AFFICHAGE DU PERSONA */}
        {persona && (
          <div className="border rounded-lg p-6 space-y-6 h-[500px]">
            <ScrollArea className="h-full">
            {/* EN-TÊTE AVEC PHOTO */}
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <Image
                width={400}
                height={400}
                  src={profileImage}
                  alt={persona.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{persona.name}</h3>
                    <p className="text-lg text-muted-foreground">
                      {persona.age} years • {persona.occupation}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadPersona}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
                
                {/* CITATION */}
                <blockquote className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-blue-800 italic">{`"${persona.quote}"`}</p>
                </blockquote>
              </div>
            </div>

            {/* BACKGROUND */}
            <div>
              <h4 className="font-semibold mb-2">Background</h4>
              <p className="text-sm">{persona.background}</p>
            </div>

            {/* GRID DES CARACTÉRISTIQUES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COLONNE GAUCHE */}
              <div className="space-y-4">
                {/* OBJECTIFS */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Goals
                    </Badge>
                  </h4>
                  <ul className="text-sm space-y-1">
                    {persona.goals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* FRUSTRATIONS */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Frustrations
                    </Badge>
                  </h4>
                  <ul className="text-sm space-y-1">
                    {persona.frustrations.map((frustration, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        {frustration}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* COMPORTEMENTS */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Behaviors
                    </Badge>
                  </h4>
                  <ul className="text-sm space-y-1">
                    {persona.behaviors.map((behavior, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        {behavior}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* COLONNE DROITE */}
              <div className="space-y-4">
                {/* DÉMOGRAPHIQUES */}
                <div>
                  <h4 className="font-semibold mb-2">Demographics</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Education:</span>
                      <span>{persona.demographics.education}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Income:</span>
                      <span>{persona.demographics.income}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{persona.demographics.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tech Level:</span>
                      <Badge variant="outline">
                        {persona.demographics.techProficiency}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* PSYCHOGRAPHIQUES */}
                <div>
                  <h4 className="font-semibold mb-2">Psychographics</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Motivations</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {persona.psychographics.motivations.map((motivation, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {motivation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Values</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {persona.psychographics.values.map((value, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Personality</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {persona.psychographics.personality.map((trait, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollArea>
          </div>
        )}

        {/* ÉTAT VIDE */}
        {!persona && !isGenerating && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No persona generated yet</p>
            <p className="text-sm mt-2">
              Click {`"Generate Persona"`} to create a user archetype from your research
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}