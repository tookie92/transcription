"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, User, Download, RefreshCw, Save, Eye, Edit2, Trash2, X, Check, Star, Target, Frown, Activity, GraduationCap, Banknote, MapPin, Laptop, Quote } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

interface PersonaGeneratorProps {
  projectId: string;
  mapId: string;
  groups: Array<{ id: string; title: string; insightIds: string[] }>;
  insights: Array<{ id: string; text: string; type: string }>;
  projectContext?: string;
  dotVotingResults?: Array<{
    sectionId: string;
    title: string;
    voteCount: number;
    colors: string[];
  }>;
  onClose?: () => void;
}

interface GeneratedPersona {
  _id?: string;
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
    techProficiency: "beginner" | "intermediate" | "expert";
  };
  psychographics: {
    motivations: string[];
    values: string[];
    personality: string[];
  };
}

export function PersonaGenerator({ projectId, mapId, groups, insights, projectContext, dotVotingResults, onClose }: PersonaGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPersona, setGeneratedPersona] = useState<GeneratedPersona | null>(null);
  const [profileImage, setProfileImage] = useState<string>("");
  const [basedOn, setBasedOn] = useState<{ groups: number; insights: number; groupTitles: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<"saved" | "new">("saved");
  const [editingPersona, setEditingPersona] = useState<GeneratedPersona | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSavedPersona, setSelectedSavedPersona] = useState<GeneratedPersona | null>(null);
  const [imageError, setImageError] = useState(false);
  const [selectedClusterIds, setSelectedClusterIds] = useState<Set<string>>(new Set());

  // Handle ESC key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const winningClusterIds = useMemo(() => {
    if (!dotVotingResults || dotVotingResults.length === 0) return new Set<string>();
    return new Set(dotVotingResults.map(r => r.sectionId));
  }, [dotVotingResults]);

  const createPersona = useMutation(api.personas.createPersona);
  const updatePersona = useMutation(api.personas.updatePersona);
  const deletePersona = useMutation(api.personas.deletePersona);
  const savedPersonas = useQuery(api.personas.getPersonasByMap, {
    mapId: mapId as Id<"affinityMaps">,
  });

  const getFallbackImageUrl = (personaName: string): string => {
    const seed = personaName.replace(/\s+/g, "");
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(personaName)}&background=0D8ABC&color=fff&size=400`;
  };

  const getRandomAvatar = (seed: string): string => {
    // Try randomuser.me first, fallback to dicebear on error
    const lowerSeed = seed.toLowerCase();
    const malePatterns = ['son', 'ton', 'man', 'ley', 'ard', 'er', 'well', 'ford', 'ie'];
    const femalePatterns = ['a', 'ie', 'ey', 'ine', 'elle', 'y', 'na', 'ra', 'ia', 'lyn', 'ley'];
    
    let gender: 'men' | 'women' = 'men';
    if (femalePatterns.some(p => lowerSeed.endsWith(p)) && !malePatterns.some(p => lowerSeed.endsWith(p))) {
      gender = 'women';
    } else if (lowerSeed.endsWith('a') || lowerSeed.includes(' ')) {
      gender = 'women';
    }
    
    const seedNum = Math.abs(hashCode(seed + Date.now().toString()));
    const id = (seedNum % 99) + 1;
    return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
  };

  const getFallbackAvatar = (seed: string): string => {
    // DiceBear as fallback
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  };

  const generateRandomAvatar = (personaName?: string): string => {
    return getRandomAvatar(personaName || Math.random().toString(36).substring(7));
  };

  const generatePersona = async () => {
    if (groups.length === 0) {
      toast.error("Need at least one group to generate persona");
      return;
    }

    const selectedGroups = selectedClusterIds.size > 0
      ? groups.filter(g => selectedClusterIds.has(g.id))
      : (winningClusterIds.size > 0 
          ? groups.filter(g => winningClusterIds.has(g.id))
          : groups);

    if (selectedGroups.length === 0) {
      toast.error("No groups selected for persona generation");
      return;
    }

    const selectedGroupIds = new Set(selectedGroups.map(g => g.id));
    const filteredInsights = insights.filter(i => {
      const parentGroup = groups.find(g => g.insightIds.includes(i.id));
      return parentGroup && selectedGroupIds.has(parentGroup.id);
    });

    setIsGenerating(true);
    setImageError(false);
    try {
      const response = await fetch("/api/persona/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: selectedGroups.map((group) => ({
            title: group.title,
            insightIds: group.insightIds,
          })),
          insights: filteredInsights.map((insight) => ({
            id: insight.id,
            text: insight.text,
            type: insight.type,
          })),
          projectContext,
          dotVotingResults: dotVotingResults?.filter(r => selectedGroupIds.has(r.sectionId)),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const data = await response.json();
      setGeneratedPersona(data.persona);
      setProfileImage(generateRandomAvatar(data.persona.name));
      setBasedOn(data.basedOn);
      setViewMode("new");
      setIsEditMode(false);
      setSelectedSavedPersona(null);
      
      // Auto-save to database
      try {
        await createPersona({
          projectId: projectId as Id<"projects">,
          mapId: mapId as Id<"affinityMaps">,
          ...data.persona,
          profileImage: generateRandomAvatar(data.persona.name),
          basedOn: data.basedOn,
        });
        toast.success(`Persona "${data.persona.name}" generated and saved!`);
      } catch (saveError) {
        console.error("Auto-save failed:", saveError);
        toast.success(`Persona "${data.persona.name}" generated!`);
      }
    } catch (error) {
      console.error("Persona generation error:", error);
      toast.error("Failed to generate persona");
    } finally {
      setIsGenerating(false);
    }
  };

  const savePersona = async () => {
    if (!generatedPersona) {
      toast.error("No persona to save");
      return;
    }

    try {
      const personaToSave = isEditMode ? editingPersona! : generatedPersona;
      await createPersona({
        projectId: projectId as Id<"projects">,
        mapId: mapId as Id<"affinityMaps">,
        ...personaToSave,
        profileImage: profileImage || getFallbackImageUrl(personaToSave.name),
        basedOn: basedOn || { groups: 0, insights: 0, groupTitles: [] },
      });

      toast.success("Persona saved!");
      setViewMode("saved");
      setIsEditMode(false);
      setGeneratedPersona(null);
    } catch (error) {
      console.error("Failed to save persona:", error);
      toast.error("Failed to save persona");
    }
  };

  const updateExistingPersona = async () => {
    if (!selectedSavedPersona?._id || !editingPersona) return;

    try {
      await updatePersona({
        personaId: selectedSavedPersona._id as Id<"personas">,
        ...editingPersona,
      });

      toast.success("Persona updated!");
      setIsEditMode(false);
      setEditingPersona(null);
    } catch (error) {
      console.error("Failed to update persona:", error);
      toast.error("Failed to update persona");
    }
  };

  const deleteExistingPersona = async (personaId: Id<"personas">) => {
    if (!confirm("Delete this persona?")) return;

    try {
      await deletePersona({ personaId });
      toast.success("Persona deleted");
      setSelectedSavedPersona(null);
      setEditingPersona(null);
      setIsEditMode(false);
    } catch (error) {
      toast.error("Failed to delete persona");
    }
  };

  const startEditing = (persona: GeneratedPersona, isNew: boolean = false) => {
    setEditingPersona({
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
    setSelectedSavedPersona(isNew ? null : persona);
    setIsEditMode(true);
    if (isNew) {
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
    }
  };

  const cancelEditing = () => {
    setIsEditMode(false);
    setEditingPersona(null);
    if (viewMode === "new") {
      setGeneratedPersona(null);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setEditingPersona((prev) => {
      if (!prev) return null;
      const updated = { ...prev } as GeneratedPersona;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        const parentObj = prev[parent as keyof GeneratedPersona] as Record<string, unknown>;
        (updated as unknown as Record<string, unknown>)[parent] = { ...parentObj, [child]: value };
      } else {
        (updated as unknown as Record<string, unknown>)[field] = value;
      }
      return updated;
    });
  };

  const updateArrayField = (field: string, value: string) => {
    setEditingPersona((prev) => {
      if (!prev) return null;
      const current = prev[field as keyof GeneratedPersona] as string[];
      const updated = { ...prev } as GeneratedPersona;
      (updated as unknown as Record<string, unknown>)[field] = [...current, value];
      return updated;
    });
  };

  const removeArrayItem = (field: string, index: number) => {
    setEditingPersona((prev) => {
      if (!prev) return null;
      const current = prev[field as keyof GeneratedPersona] as string[];
      const updated = { ...prev } as GeneratedPersona;
      (updated as unknown as Record<string, unknown>)[field] = current.filter((_, i) => i !== index);
      return updated;
    });
  };

  const selectedSavedPersonas = viewMode === "saved" && savedPersonas?.[0] ? savedPersonas[0] : null;
  
  const currentPersona = isEditMode && editingPersona
    ? editingPersona
    : viewMode === "new" && generatedPersona
    ? generatedPersona
    : selectedSavedPersonas;

  const currentImageUrl = profileImage || (currentPersona ? getFallbackImageUrl(currentPersona.name) : "");

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Personas
            </CardTitle>
            <CardDescription>
              Generate and edit personas from your research
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {savedPersonas && savedPersonas.length > 0 && (
              <Badge variant="secondary">{savedPersonas.length} saved</Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Dot Voting Info */}
        {dotVotingResults && dotVotingResults.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {dotVotingResults.length} clusters prioritized by dot voting
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {dotVotingResults.slice(0, 5).map((result) => (
                <Badge key={result.sectionId} variant="outline" className="text-xs bg-amber-100/50 dark:bg-amber-900/30">
                  {result.title} ({result.voteCount} votes)
                </Badge>
              ))}
              {dotVotingResults.length > 5 && (
                <Badge variant="outline" className="text-xs">+{dotVotingResults.length - 5} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Cluster Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Clusters to include:</span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedClusterIds(new Set(groups.map(g => g.id)))}
                className="text-xs h-6 px-2"
              >
                Select all
              </Button>
              {winningClusterIds.size > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedClusterIds(winningClusterIds)}
                  className="text-xs h-6 px-2 text-amber-600"
                >
                  Use winners
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-muted/50 rounded-lg">
            {groups.map((group) => {
              const isWinner = winningClusterIds.has(group.id);
              const isSelected = selectedClusterIds.size === 0 || selectedClusterIds.has(group.id);
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    if (selectedClusterIds.size === 0) {
                      const newSet = new Set(groups.map(g => g.id));
                      newSet.delete(group.id);
                      setSelectedClusterIds(newSet);
                    } else {
                      const newSet = new Set(selectedClusterIds);
                      if (newSet.has(group.id)) {
                        newSet.delete(group.id);
                      } else {
                        newSet.add(group.id);
                      }
                      setSelectedClusterIds(newSet);
                    }
                  }}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md border transition-all",
                    isWinner && "ring-2 ring-amber-400",
                    isSelected 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-muted border-border text-muted-foreground opacity-50"
                  )}
                >
                  {isWinner && <Star className="w-3 h-3 inline mr-1 text-amber-500" />}
                  {group.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg mb-4">
          <div className="text-sm">
            <span className="font-medium">{groups.length}</span> clusters
            <span className="mx-2">•</span>
            <span className="font-medium">{insights.length}</span> insights
          </div>

          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={selectedSavedPersona ? updateExistingPersona : savePersona}
                  className="gap-1"
                >
                  <Save className="w-4 h-4" />
                  {selectedSavedPersona ? "Update" : "Save"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={generatePersona}
                  disabled={isGenerating || groups.length === 0}
                  size="sm"
                  className="gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? "Generating..." : "New Persona"}
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pb-8">
            {/* Saved Personas List */}
            {!isEditMode && savedPersonas && savedPersonas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">SAVED PERSONAS</h4>
                {savedPersonas.map((persona) => (
                  <div
                    key={persona._id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSavedPersona?._id === persona._id ? "bg-primary/10 border-primary" : "hover:bg-accent"
                    }`}
                    onClick={() => {
                      setSelectedSavedPersona(persona);
                      setViewMode("saved");
                      setGeneratedPersona(null);
                    }}
                  >
                    <div className="relative w-10 h-10">
                      <Image
                        src={persona.profileImage || getFallbackImageUrl(persona.name)}
                        alt={persona.name}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{persona.name}</p>
                      <p className="text-xs text-muted-foreground">{persona.occupation}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-rose-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this persona?")) {
                            deleteExistingPersona(persona._id as Id<"personas">);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(persona, false);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Persona Display / Edit */}
            {currentPersona && (
              <div className="border rounded-lg p-4 space-y-4 flex-1 overflow-y-auto pb-16">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <Image
                      src={currentImageUrl}
                      alt={currentPersona.name}
                      fill
                      unoptimized
                      className="rounded-full object-cover border-2 border-white shadow"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    {isEditMode ? (
                      <>
                        <Input
                          value={editingPersona?.name || ""}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="text-xl font-bold"
                          placeholder="Name"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editingPersona?.age || 0}
                            onChange={(e) => updateField("age", parseInt(e.target.value))}
                            className="w-20"
                            placeholder="Age"
                          />
                          <Input
                            value={editingPersona?.occupation || ""}
                            onChange={(e) => updateField("occupation", e.target.value)}
                            className="flex-1"
                            placeholder="Occupation"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold">{currentPersona.name}</h3>
                        <p className="text-muted-foreground">
                          {currentPersona.age} years • {currentPersona.occupation}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Quote */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Quote className="w-4 h-4" />
                    Quote
                  </label>
                  {isEditMode ? (
                    <Textarea
                      value={editingPersona?.quote || ""}
                      onChange={(e) => updateField("quote", e.target.value)}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <blockquote className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500 mt-1">
                      <p className="text-sm italic text-blue-800">&ldquo;{currentPersona.quote}&rdquo;</p>
                    </blockquote>
                  )}
                </div>

                {/* Background */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Background</label>
                  {isEditMode ? (
                    <Textarea
                      value={editingPersona?.background || ""}
                      onChange={(e) => updateField("background", e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1">{currentPersona.background}</p>
                  )}
                </div>

                {/* Goals, Frustrations, Behaviors */}
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { key: "goals" as const, label: "Goals", icon: Target },
                    { key: "frustrations" as const, label: "Frustrations", icon: Frown },
                    { key: "behaviors" as const, label: "Behaviors", icon: Activity }
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <div key={key} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <label className="text-sm font-medium text-muted-foreground">{label}</label>
                      </div>
                      {isEditMode ? (
                        <div className="space-y-1">
                          {(editingPersona?.[key] || []).map((item: string, i: number) => (
                            <div key={i} className="flex gap-1">
                              <span className="flex-1 text-sm bg-muted px-2 py-1 rounded">{item}</span>
                              <button
                                onClick={() => removeArrayItem(key, i)}
                                className="text-destructive hover:bg-destructive/10 px-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <Input
                            className="flex-1 h-8 text-sm"
                            placeholder="Add..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value) {
                                updateArrayField(key, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {(currentPersona[key] as string[]).map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-primary">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Demographics */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Demographics
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { field: "education", icon: GraduationCap },
                      { field: "income", icon: Banknote },
                      { field: "location", icon: MapPin },
                      { field: "techProficiency", icon: Laptop }
                    ].map(({ field, icon: Icon }) => (
                      <div key={field} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {isEditMode ? (
                          field === "techProficiency" ? (
                            <select
                              value={editingPersona?.demographics?.[field as keyof typeof editingPersona.demographics] || "intermediate"}
                              onChange={(e) => updateField(`demographics.${field}`, e.target.value)}
                              className="flex-1 h-6 text-sm bg-transparent border-0 focus:outline-none"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="expert">Expert</option>
                            </select>
                          ) : (
                            <Input
                              value={(editingPersona?.demographics as Record<string, string>)?.[field] || ""}
                              onChange={(e) => updateField(`demographics.${field}`, e.target.value)}
                              className="flex-1 h-6 text-sm bg-transparent border-0 p-0"
                              placeholder={field}
                            />
                          )
                        ) : (
                          <span className="text-sm">{(currentPersona.demographics as Record<string, string>)[field]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!currentPersona && !isGenerating && (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No persona selected</p>
                <p className="text-sm mt-1">Generate a new persona or select a saved one</p>
              </div>
            )}
             <div className="h-9"/>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
