"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  User, 
  DollarSign, 
  Monitor, 
  Target, 
  AlertCircle,
  MapPin,
  TrendingUp,
  MessageSquareQuote,
  BookOpen,
} from "lucide-react";

interface PersonaCardProps {
  name: string;
  age?: number;
  occupation?: string;
  quote?: string;
  profileImage?: string;
  background?: string;
  goals?: string[];
  frustrations?: string[];
  behaviors?: string[];
  demographics?: {
    education?: string;
    income?: string;
    location?: string;
    techProficiency?: string;
  };
  psychographics?: {
    motivations?: string[];
    values?: string[];
    personality?: string[];
  };
}

interface PersonaCardComponentProps {
  persona: PersonaCardProps;
  isCompact?: boolean;
}

export function PersonaCard({ persona, isCompact = false }: PersonaCardComponentProps) {
  const initials = persona.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const techLevel = persona.demographics?.techProficiency;
  const techLabel = techLevel ? techLevel.charAt(0).toUpperCase() + techLevel.slice(1) : null;

  if (isCompact) {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3 p-3">
          {/* Avatar */}
          {persona.profileImage ? (
            <img
              src={persona.profileImage}
              alt={persona.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">{initials} </span>
            </div>
          )}
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{persona.name}</h3>
            {persona.occupation && (
              <p className="text-xs text-muted-foreground truncate">{persona.occupation}</p>
            )}
            {persona.quote && (
              <p className="text-xs italic text-muted-foreground/70 line-clamp-1 mt-1">&ldquo;{persona.quote}&rdquo;</p>
            )}
            
            {/* Quick stats */}
            <div className="flex items-center gap-2 mt-2">
              {persona.goals && persona.goals.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                  <Target className="w-3 h-3" />
                  {persona.goals.length} goals
                </Badge>
              )}
              {persona.frustrations && persona.frustrations.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {persona.frustrations.length} pain points
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-5xl mx-auto overflow-hidden p-0 shadow-lg rounded-2xl">
      {/* Header - Identity */}
      <div className="flex flex-col md:flex-row">
        {/* Left Panel - Identity */}
        <div className="md:w-1/3 bg-primary py-8 px-6 flex flex-col items-center justify-center text-primary-foreground">
          {persona.profileImage ? (
            <img
              src={persona.profileImage}
              alt={persona.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary-foreground/20 mb-4"
            />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary-foreground/15 flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-primary-foreground">{initials}</span>
            </div>
          )}
          
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-1">{persona.name}</h2>
          {persona.occupation && (
            <p className="text-primary-foreground/90 text-center text-sm mb-3">{persona.occupation}</p>
          )}
          {persona.quote && (
            <div className="flex items-start gap-2 px-2">
              <MessageSquareQuote className="w-4 h-4 text-primary-foreground/60 shrink-0 mt-0.5" />
              <p className="text-primary-foreground/95 text-sm font-medium text-center leading-relaxed">&ldquo;{persona.quote}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Right Panel - Content */}
        <div className="md:w-2/3 flex flex-col gap-0 bg-card px-8 py-10">
          {/* Demographics - First */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-foreground">Demographics</h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {persona.age && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </span>
                  <span className="text-muted-foreground truncate">{persona.age} ans</span>
                </div>
              )}
              {persona.demographics?.location && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                  </span>
                  <span className="text-muted-foreground truncate">{persona.demographics.location}</span>
                </div>
              )}
              {persona.demographics?.income && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                  </span>
                  <span className="text-muted-foreground truncate">{persona.demographics.income}</span>
                </div>
              )}
              {techLabel && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                    <Monitor className="w-3 h-3 text-muted-foreground" />
                  </span>
                  <span className="text-muted-foreground truncate">{techLabel}</span>
                </div>
              )}
              {persona.demographics?.education && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                    <BookOpen className="w-3 h-3 text-muted-foreground" />
                  </span>
                  <span className="text-muted-foreground truncate">{persona.demographics.education}</span>
                </div>
              )}
            </div>
          </div>

          {/* Story / Background - Second */}
          {(persona.background || persona.psychographics?.motivations) && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">Background</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.background || 
                 `${persona.name} is a ${persona.occupation || "professional"} looking to improve their productivity. ${persona.psychographics?.motivations?.[0] || ""}`}
              </p>
            </div>
          )}

          {/* Goals & Pain Points - Last, Two Columns */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Goals */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-foreground">Goals</h3>
                {persona.goals && persona.goals.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{persona.goals.length}</Badge>
                )}
              </div>
              <div className="space-y-2">
                {persona.goals && persona.goals.length > 0 ? (
                  persona.goals.slice(0, 4).map((goal, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{goal}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground/70 italic">No specific goals identified</p>
                )}
              </div>
            </div>

            {/* Pain Points */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold text-foreground">Pain Points</h3>
                {persona.frustrations && persona.frustrations.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{persona.frustrations.length}</Badge>
                )}
              </div>
              <div className="space-y-2">
                {persona.frustrations && persona.frustrations.length > 0 ? (
                  persona.frustrations.slice(0, 4).map((frustration, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{frustration}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground/70 italic">No specific pain points identified</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
