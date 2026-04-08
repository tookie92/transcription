"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  DollarSign, 
  Monitor, 
  Target, 
  Heart, 
  AlertCircle,
  MapPin,
  Briefcase,
  GraduationCap,
  TrendingUp,
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

export function PersonaCard({ persona }: { persona: PersonaCardProps }) {
  const initials = persona.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const techIcons: Record<string, string> = {
    beginner: "🟢",
    intermediate: "🟡",
    expert: "🔴",
  };

  return (
    <Card className="w-full max-w-5xl mx-auto overflow-hidden shadow-lg rounded-2xl">
      <div className="flex flex-col md:flex-row max-h-[65vh]">
        {/* Left Panel - Brand Color */}
        <div className="md:w-1/3 bg-primary p-4 md:p-6 flex flex-col items-center justify-center text-primary-foreground min-w-0">
          {persona.profileImage ? (
            <img
              src={persona.profileImage}
              alt={persona.name}
              className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover border-4 border-primary-foreground/30 mb-3 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3 flex-shrink-0">
              <span className="text-3xl font-bold text-primary-foreground">{initials}</span>
            </div>
          )}
          
          <h2 className="text-xl md:text-2xl font-bold text-center mb-1 break-words">{persona.name}</h2>
          {persona.occupation && (
            <p className="text-primary-foreground/80 text-center text-xs md:text-sm mb-2 break-words">{persona.occupation}</p>
          )}
          {persona.quote && (
            <p className="text-primary-foreground/60 text-center italic text-xs px-2">&ldquo;{persona.quote}&rdquo;</p>
          )}
        </div>

        {/* Right Panel - White Background */}
        <div className="md:w-2/3 bg-card p-4 overflow-y-auto min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* About */}
            <div>
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-2">
                <User className="w-4 h-4 flex-shrink-0" />
                About
              </h3>
              <div className="space-y-1 text-xs md:text-sm text-muted-foreground break-words">
                {persona.age && (
                  <div className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Age: {persona.age}
                  </div>
                )}
                {persona.demographics?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    {persona.demographics.location}
                  </div>
                )}
                {persona.demographics?.income && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    {persona.demographics.income}
                  </div>
                )}
                {persona.demographics?.techProficiency && (
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3 h-3 text-muted-foreground" />
                    {persona.demographics.techProficiency.charAt(0).toUpperCase() + persona.demographics.techProficiency.slice(1)} tech user
                  </div>
                )}
              </div>
            </div>

            {/* Motivation */}
            <div>
              <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" />
                Motivation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.psychographics?.motivations?.slice(0, 2).join(" ") || 
                 "Looking for solutions that simplify their daily workflow and provide real value."}
              </p>
            </div>

            {/* Story */}
            <div>
              <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4" />
                Story
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.background || 
                 `${persona.name} is a ${persona.occupation || "professional"} looking to improve their productivity and achieve better results in their daily work.`}
              </p>
            </div>

            {/* Core Need */}
            <div>
              <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4" />
                Core Need
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.goals?.slice(0, 2).join(" ") || 
                 "Needs an intuitive, reliable solution that saves time and reduces friction in their workflow."}
              </p>
            </div>

            {/* Pain Points */}
            <div className="md:col-span-2">
              <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" />
                Pain Points
              </h3>
              <div className="flex flex-wrap gap-2">
                {persona.frustrations && persona.frustrations.length > 0 ? (
                  persona.frustrations.slice(0, 3).map((frustration, idx) => (
                    <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {frustration}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Frustrated with complex interfaces and time-consuming processes.
                  </p>
                )}
              </div>
            </div>

            {/* Goals */}
            {persona.goals && persona.goals.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" />
                  Goals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {persona.goals.slice(0, 3).map((goal, idx) => (
                    <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}