"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, User, Download, RefreshCw, Save, Eye, Edit2, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { ScrollArea } from "../ui/scroll-area";

interface PersonaGeneratorProps {
  projectId: string;
  mapId: string;
  groups: any[];
  insights: any[];
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
    techProficiency: "beginner" | "intermediate" | "expert";
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
  const [profileImage, setProfileImage] = useState<string>("");
  const [basedOn, setBasedOn] = useState<{ groups: number; insights: number; groupTitles: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<"saved" | "new">("saved");
  const [editingPersona, setEditingPersona] = useState<GeneratedPersona | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSavedPersona, setSelectedSavedPersona] = useState<any>(null);
  const [imageError, setImageError] = useState(false);

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

  const generatePersona = async () => {
    if (groups.length === 0) {
      toast.error("Need at least one group to generate persona");
      return;
    }

    setIsGenerating(true);
    setImageError(false);
    try {
      const response = await fetch("/api/persona/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: groups.map((group) => ({
            title: group.title,
            insightIds: group.insightIds,
          })),
          insights: insights.map((insight) => ({
            id: insight.id,
            text: insight.text,
            type: insight.type,
          })),
          projectContext,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const data = await response.json();
      setGeneratedPersona(data.persona);
      setProfileImage(data.profileImage);
      setBasedOn(data.basedOn);
      setViewMode("new");
      setIsEditMode(false);
      setSelectedSavedPersona(null);
      toast.success(`Persona "${data.persona.name}" generated!`);
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
    if (!selectedSavedPersona || !editingPersona) return;

    try {
      await updatePersona({
        personaId: selectedSavedPersona._id,
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

  const startEditing = (persona: any, isNew: boolean = false) => {
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

  const updateField = (field: string, value: any) => {
    setEditingPersona((prev) => {
      if (!prev) return null;
      const updated = { ...prev };
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        (updated as any)[parent] = { ...(updated as any)[parent], [child]: value };
      } else {
        (updated as any)[field] = value;
      }
      return updated;
    });
  };

  const updateArrayField = (field: string, value: string) => {
    setEditingPersona((prev) => {
      if (!prev) return null;
      const current = (prev as any)[field] as string[];
      return { ...prev, [field]: [...current, value] };
    });
  };

  const removeArrayItem = (field: string, index: number) => {
    setEditingPersona((prev) => {
      if (!prev) return null;
      const current = (prev as any)[field] as string[];
      return { ...prev, [field]: current.filter((_: any, i: number) => i !== index) };
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
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

        <ScrollArea className="flex-1">
          <div className="space-y-4">
            {/* Saved Personas List */}
            {!isEditMode && savedPersonas && savedPersonas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">SAVED PERSONAS</h4>
                {savedPersonas.map((persona) => (
                  <div
                    key={persona._id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSavedPersonas?._id === persona._id ? "bg-primary/10 border-primary" : "hover:bg-accent"
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
                ))}
              </div>
            )}

            {/* Persona Display / Edit */}
            {currentPersona && (
              <div className="border rounded-lg p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <Image
                      src={currentImageUrl}
                      alt={currentPersona.name}
                      fill
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
                  <label className="text-sm font-medium text-muted-foreground">Quote</label>
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
                  {(["goals", "frustrations", "behaviors"] as const).map((field) => (
                    <div key={field}>
                      <label className="text-sm font-medium text-muted-foreground capitalize">{field}</label>
                      {isEditMode ? (
                        <div className="space-y-1 mt-1">
                          {(editingPersona?.[field] || []).map((item: string, i: number) => (
                            <div key={i} className="flex gap-1">
                              <span className="flex-1 text-sm bg-muted px-2 py-1 rounded">{item}</span>
                              <button
                                onClick={() => removeArrayItem(field, i)}
                                className="text-destructive hover:bg-destructive/10 px-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-1">
                            <Input
                              className="flex-1 h-8 text-sm"
                              placeholder="Add..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.currentTarget.value) {
                                  updateArrayField(field, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <ul className="text-sm mt-1 space-y-1">
                          {currentPersona[field].map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Demographics */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Demographics</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {["education", "income", "location", "techProficiency"].map((field) => (
                      <div key={field} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize w-20">{field}:</span>
                        {isEditMode ? (
                          field === "techProficiency" ? (
                            <select
                              value={editingPersona?.demographics?.[field as keyof typeof editingPersona.demographics] || "intermediate"}
                              onChange={(e) => updateField(`demographics.${field}`, e.target.value)}
                              className="flex-1 h-8 text-sm border rounded px-2"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="expert">Expert</option>
                            </select>
                          ) : (
                            <Input
                              value={(editingPersona?.demographics as any)?.[field] || ""}
                              onChange={(e) => updateField(`demographics.${field}`, e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                          )
                        ) : (
                          <span className="text-sm">{(currentPersona.demographics as any)[field]}</span>
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
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
