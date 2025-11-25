// components/PersonaGenerator.tsx - VERSION SIMPLIFIÉE
"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, User, Download, RefreshCw, Save, History, Eye } from "lucide-react";
import { AffinityGroup, Insight, UserPersona, ConvexUserPersona } from "@/types";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { ScrollArea } from "../ui/scroll-area";

interface PersonaGeneratorProps {
  projectId: string;
  mapId: string;
  groups: AffinityGroup[];
  insights: Insight[];
  projectContext?: string;
}

interface GeneratedPersona {
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

export function PersonaGenerator({ projectId, mapId, groups, insights, projectContext }: PersonaGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPersona, setGeneratedPersona] = useState<GeneratedPersona | null>(null);
  const [profileImage, setProfileImage] = useState<string>('');
  const [basedOn, setBasedOn] = useState<{groups: number; insights: number; groupTitles: string[]} | null>(null);
  const [viewMode, setViewMode] = useState<'saved' | 'new'>('saved');
  const [imageError, setImageError] = useState(false);

  const createPersona = useMutation(api.personas.createPersona);
  const savedPersonas = useQuery(api.personas.getPersonasByMap, { 
    mapId: mapId as Id<"affinityMaps"> 
  });

  useEffect(() => {
    if (savedPersonas && savedPersonas.length > 0 && !generatedPersona) {
      setViewMode('saved');
    }
  }, [savedPersonas, generatedPersona]);

  // 🎯 SIMPLE FALLBACK IMAGE URL GENERATION
  const getFallbackImageUrl = (personaName: string): string => {
    const seed = personaName.replace(/\s+/g, '');
    const fallbacks = [
      `https://i.pravatar.cc/400?u=${seed}`,
      `https://randomuser.me/api/portraits/med/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 50)}.jpg`,
      `https://ui-avatars.com/api/?name=${encodeURIComponent(personaName)}&background=0D8ABC&color=fff&size=400`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  // 🎯 GET CURRENT IMAGE URL (ALWAYS DEFINED)
  const getCurrentImageUrl = (): string => {
    if (!displayPersona) {
      return getFallbackImageUrl("Default Persona");
    }

    if (imageError) {
      return getFallbackImageUrl(displayPersona.name);
    }

    const currentProfileImage = viewMode === 'new' ? profileImage : (savedPersonas && savedPersonas[0]?.profileImage);
    
    // 🎯 GUARANTEE URL IS NEVER UNDEFINED
    return currentProfileImage || getFallbackImageUrl(displayPersona.name);
  };

  const generatePersona = async () => {
    if (groups.length === 0) {
      toast.error("Need at least one group to generate persona");
      return;
    }

    setIsGenerating(true);
    setImageError(false);
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
      setGeneratedPersona(data.persona);
      setProfileImage(data.profileImage);
      setBasedOn(data.basedOn);
      setViewMode('new');
      
      toast.success(`Persona "${data.persona.name}" generated!`);
    } catch (error) {
      console.error('Persona generation error:', error);
      toast.error('Failed to generate persona');
    } finally {
      setIsGenerating(false);
    }
  };

  const savePersona = async () => {
    if (!generatedPersona || !basedOn) {
      toast.error("No persona to save");
      return;
    }

    try {
      await createPersona({
        projectId: projectId as Id<"projects">,
        mapId: mapId as Id<"affinityMaps">,
        ...generatedPersona,
        profileImage: getCurrentImageUrl(),
        basedOn,
      });

      toast.success(`Persona "${generatedPersona.name}" saved!`);
      setViewMode('saved');
    } catch (error) {
      console.error('Failed to save persona:', error);
      toast.error('Failed to save persona');
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const displayPersona = viewMode === 'new' ? generatedPersona : (savedPersonas && savedPersonas[0]);
  const displayBasedOn = viewMode === 'new' ? basedOn : (savedPersonas && savedPersonas[0]?.basedOn);
  const currentImageUrl = getCurrentImageUrl();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Persona Generator
            </CardTitle>
            <CardDescription>
              Generate and save realistic user personas from your research
            </CardDescription>
          </div>
          
          {savedPersonas && savedPersonas.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <History className="w-3 h-3" />
              {savedPersonas.length} saved
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* GENERATION BUTTONS */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Based on your research</p>
            <p className="text-sm text-muted-foreground">
              {groups.length} groups • {insights.length} insights
            </p>
          </div>
          
          <div className="flex gap-2">
            {savedPersonas && savedPersonas.length > 0 && (
              <Button
                variant={viewMode === 'saved' ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode('saved');
                  setImageError(false);
                }}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Saved Personas
              </Button>
            )}
            
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
              {isGenerating ? 'Generating...' : 'New Persona'}
            </Button>
          </div>
        </div>

        {/* SAVED PERSONAS LIST */}
        {viewMode === 'saved' && savedPersonas && savedPersonas.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Saved Personas</h4>
            {savedPersonas.map((persona) => (
              <div
                key={persona._id}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => {
                  setGeneratedPersona({
                    name: persona.name,
                    age: persona.age,
                    occupation: persona.occupation,
                    background: persona.background,
                    goals: persona.goals,
                    frustrations: persona.frustrations,
                    behaviors: persona.behaviors,
                    quote: persona.quote,
                    demographics: persona.demographics,
                    psychographics: persona.psychographics,
                  });
                  setProfileImage(persona.profileImage);
                  setBasedOn(persona.basedOn);
                  setViewMode('saved');
                  setImageError(false);
                }}
              >
                <div className="relative w-12 h-12">
                  <Image
                    src={persona.profileImage || getFallbackImageUrl(persona.name)}
                    alt={persona.name}
                    fill
                    className="rounded-full object-cover border-2 border-white shadow"
                    onError={handleImageError}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{persona.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {persona.occupation} • {persona.basedOn.groups} groups
                  </p>
                </div>
                <Badge variant="outline">
                  {new Date(persona.createdAt).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* PERSONA DISPLAY */}
        {displayPersona && (
          <div className="border rounded-lg p-6 space-y-6 h-1/3  overflow-y-auto pb-52 ">
            
            
            {/* HEADER WITH ACTIONS */}
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="relative w-24 h-24">
                  <Image
                    src={currentImageUrl}
                    alt={displayPersona.name}
                    fill
                    className="rounded-full object-cover border-4 border-white shadow-lg"
                    onError={handleImageError}
                  />
                </div>
                <div className="flex gap-1 mt-2">
                  {viewMode === 'new' && (
                    <Button
                      size="sm"
                      onClick={savePersona}
                      className="gap-1 text-xs h-7"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePersona}
                    className="gap-1 text-xs h-7"
                    disabled={isGenerating}
                  >
                    <RefreshCw className="w-3 h-3" />
                    New
                  </Button>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{displayPersona.name}</h3>
                    <p className="text-lg text-muted-foreground">
                      {displayPersona.age} years • {displayPersona.occupation}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const personaToDownload = viewMode === 'new' ? generatedPersona : (savedPersonas && savedPersonas[0]);
                      if (!personaToDownload) return;

                      const personaData = {
                        generatedAt: new Date().toISOString(),
                        basedOn: viewMode === 'new' ? basedOn : (savedPersonas && savedPersonas[0]?.basedOn),
                        persona: personaToDownload,
                      };

                      const blob = new Blob([JSON.stringify(personaData, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `persona-${personaToDownload.name.replace(/\s+/g, '-').toLowerCase()}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
                
                {/* QUOTE */}
                <blockquote className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-blue-800 italic">{`"${displayPersona.quote}"`}</p>
                </blockquote>
              </div>
            </div>

            {/* BACKGROUND */}
            <div>
              <h4 className="font-semibold mb-2">Background</h4>
              <p className="text-sm">{displayPersona.background}</p>
            </div>

            {/* CHARACTERISTICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-4">
                <PersonaSection
                  title="Goals"
                  items={displayPersona.goals}
                  badgeColor="bg-green-100 text-green-800"
                />
                <PersonaSection
                  title="Frustrations"
                  items={displayPersona.frustrations}
                  badgeColor="bg-red-100 text-red-800"
                />
                <PersonaSection
                  title="Behaviors"
                  items={displayPersona.behaviors}
                  badgeColor="bg-blue-100 text-blue-800"
                />
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                <DemographicsSection demographics={displayPersona.demographics} />
                <PsychographicsSection psychographics={displayPersona.psychographics} />
              </div>
            </div>

            {/* BASED ON INFO */}
            {displayBasedOn && (
              <div className="pt-4 border-t text-xs text-muted-foreground">
                Generated from {displayBasedOn.groups} groups and {displayBasedOn.insights} insights
                {viewMode === 'saved' && (
                  <span> • Saved on {new Date(savedPersonas?.[0]?.createdAt || Date.now()).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* EMPTY STATE */}
        {!displayPersona && !isGenerating && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No persona generated yet</p>
            <p className="text-sm mt-2">
              Click {`"Generate Persona" `}to create a user archetype from your research
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 🎯 INTERNAL COMPONENTS (unchanged)
// ... (keep the same PersonaSection, DemographicsSection, PsychographicsSection, BadgeList components)

// 🎯 COMPOSANTS INTERNES (inchangés)
interface PersonaSectionProps {
  title: string;
  items: string[];
  badgeColor: string;
}

function PersonaSection({ title, items, badgeColor }: PersonaSectionProps) {
  return (
    <div>
      <h4 className="font-semibold mb-2 flex items-center gap-2">
        <Badge variant="secondary" className={badgeColor}>
          {title}
        </Badge>
      </h4>
      <ul className="text-sm space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DemographicsSectionProps {
  demographics: GeneratedPersona['demographics'];
}

function DemographicsSection({ demographics }: DemographicsSectionProps) {
  return (
    <div>
      <h4 className="font-semibold mb-2">Demographics</h4>
      <div className="text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Education:</span>
          <span>{demographics.education}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Income:</span>
          <span>{demographics.income}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Location:</span>
          <span>{demographics.location}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tech Level:</span>
          <Badge variant="outline">
            {demographics.techProficiency}
          </Badge>
        </div>
      </div>
    </div>
  );
}

interface PsychographicsSectionProps {
  psychographics: GeneratedPersona['psychographics'];
}

function PsychographicsSection({ psychographics }: PsychographicsSectionProps) {
  return (
    <div>
      <h4 className="font-semibold mb-2">Psychographics</h4>
      <div className="space-y-3">
        <BadgeList title="Motivations" items={psychographics.motivations} />
        <BadgeList title="Values" items={psychographics.values} />
        <BadgeList title="Personality" items={psychographics.personality} />
      </div>
    </div>
  );
}

interface BadgeListProps {
  title: string;
  items: string[];
}

function BadgeList({ title, items }: BadgeListProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}