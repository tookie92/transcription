"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, 
  ClipboardList, 
  Sparkles, 
  Layers,
  ArrowRight
} from "lucide-react";
import type { StickyColor } from "@/types/figjam";

export interface WorkshopTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stickyTypes: {
    type: string;
    label: string;
    description: string;
    color: StickyColor;
  }[];
  suggestedLabels: string[];
}

const WORKSHOP_TEMPLATES: WorkshopTemplate[] = [
  {
    id: "user-interviews",
    name: "Entretiens Utilisateurs",
    description: "Synthétiser les insights de vos entretiens utilisateurs",
    icon: <MessageSquare className="w-5 h-5" />,
    color: "bg-blue-500",
    stickyTypes: [
      { type: "insight", label: "Insight", description: "Une découverte clé", color: "insight" },
      { type: "quote", label: "Citation", description: "Citation verbatim", color: "quote" },
      { type: "question", label: "Question", description: "Question ouverte", color: "yellow" },
      { type: "observation", label: "Observation", description: "Comportement observé", color: "green" },
    ],
    suggestedLabels: ["Utilité", "Facilité", "Confiance", "Frustration", "Suggestion"],
  },
  {
    id: "survey-feedback",
    name: "Retours d'enquête",
    description: "Analyser les réponses de vos sondages et formulaires",
    icon: <ClipboardList className="w-5 h-5" />,
    color: "bg-emerald-500",
    stickyTypes: [
      { type: "positive", label: "Positif", description: "Commentaire positif", color: "green" },
      { type: "negative", label: "Négatif", description: "Insatisfaction", color: "pain-point" },
      { type: "suggestion", label: "Suggestion", description: "Proposition", color: "yellow" },
      { type: "question", label: "Question", description: "Question posée", color: "blue" },
    ],
    suggestedLabels: ["Produit", "Service", "Prix", "Support", "Fonctionnalité"],
  },
  {
    id: "general",
    name: "Affinity Mapping",
    description: "Méthode classique NNGroup pour organiser vos idées",
    icon: <Sparkles className="w-5 h-5" />,
    color: "bg-violet-500",
    stickyTypes: [
      { type: "insight", label: "Insight", description: "Découverte", color: "insight" },
      { type: "quote", label: "Citation", description: "Citation", color: "quote" },
      { type: "idea", label: "Idée", description: "Idée ou suggestion", color: "yellow" },
      { type: "question", label: "Question", description: "Question ouverte", color: "blue" },
    ],
    suggestedLabels: ["Thème 1", "Thème 2", "Thème 3", "Question", "À explorer"],
  },
  {
    id: "blank",
    name: "Vierge",
    description: "Commencer avec les paramètres par défaut",
    icon: <Layers className="w-5 h-5" />,
    color: "bg-gray-500",
    stickyTypes: [
      { type: "insight", label: "Note", description: "Une note", color: "yellow" },
    ],
    suggestedLabels: [],
  },
];

interface WorkshopTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: WorkshopTemplate) => void;
  onStartBlank?: () => void;
}

export function WorkshopTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
  onStartBlank,
}: WorkshopTemplateSelectorProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const handleSelect = (template: WorkshopTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  const handleStartBlank = () => {
    onStartBlank?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-center pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Choisir un template
          </DialogTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Sélectionnez un template pour configurer les types de notes et labels suggérés
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto py-4 px-1">
          {WORKSHOP_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              className={cn(
                "group relative text-left p-4 rounded-xl border-2 transition-all duration-200",
                "hover:shadow-md hover:-translate-y-0.5",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                hoveredTemplate === template.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white",
                  template.color
                )}>
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              {template.suggestedLabels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.suggestedLabels.slice(0, 4).map((label) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                  {template.suggestedLabels.length > 4 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      +{template.suggestedLabels.length - 4}
                    </span>
                  )}
                </div>
              )}

              <div className={cn(
                "absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity",
                "text-primary"
              )}>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-center pt-2 border-t">
          <Button
            variant="ghost"
            onClick={handleStartBlank}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            <Layers className="w-4 h-4 mr-2" />
            Commencer sans template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { WORKSHOP_TEMPLATES };
