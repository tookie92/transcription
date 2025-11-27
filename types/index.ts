// types/index.ts

import { Id } from "@/convex/_generated/dataModel";

export type ActivePanel = 'voting' | 'analytics' | 'persona' | 'export' | 'votingHistory' | "themeDiscovery" | "activity" | "presentation" | "silentSorting" | null;

export type WorkspaceMode = 'grouping' | 'voting';

// Transcription types
export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}



export interface SimpleSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  members: ProjectMember[];
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: number;
}

// Interview types
export interface Interview {
  id: string;
  projectId: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  insights: Insight[];
  isAnalyzing?: boolean;
  createdAt: string;
  status: 'uploading' | 'transcribing' | 'completed' | 'analyzing' | 'ready';
}

// Insight types
export interface Insight {
  id: string;
  interviewId?: string;
  projectId: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
  source: 'ai' | 'manual';
  createdBy: string;
  createdAt: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

// Affinity Map types - SIMPLIFIÉS
export interface AffinityMap {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  version: number;
  isCurrent: boolean;
  groups: AffinityGroup[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface AffinityGroup {
  id: string;
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: string[];
}

// API Request/Response types
export interface VerboseTranscription {
  text: string;
  task: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}

export interface AnalysisRequest {
  transcription: string;
  topic?: string;
  segments?: SimpleSegment[];
}

export interface AnalysisResponse {
  insights: Insight[];
  count: number;
}

export interface InsightResponse {
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up';
  text: string;
  timestamp: number;
}

// Store types
export interface StoreInterview {
  id: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  insights: StoreInsight[];
  isAnalyzing?: boolean;
  createdAt: string;
}

export interface StoreInsight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up';
  text: string;
  timestamp: number;
  segmentId?: number;
  createdAt: string;
}

// Convex-specific types
export interface ConvexProject {
  _id: string;
  _creationTime: number;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  members: ProjectMember[];
  createdAt: number;
  updatedAt: number;
}

export interface ConvexInterview {
  _id: string;
  projectId: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  status: 'uploading' | 'transcribing' | 'completed' | 'analyzing' | 'ready';
  createdAt: number;
}

export interface ConvexInsight {
  _id: string;
  interviewId?: string;
  projectId: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
  source: 'ai' | 'manual';
  createdBy: string;
  createdAt: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

export interface ConvexAffinityMap {
  _id: string;
  projectId: string;
  name: string;
  description?: string;
  version: number;
  isCurrent: boolean;
  groups: AffinityGroup[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// Export types
export interface ExportInterview {
  id: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  insights: ExportInsight[];
  isAnalyzing?: boolean;
  createdAt: string;
}

export interface ExportInsight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
  segmentId?: number;
  createdAt: string;
}

export interface HistoryState {
  groups: AffinityGroup[];
  insights: Insight[];
  timestamp: number;
  action: string;
  description: string;
}

export interface HistoryActions {
  pushState: (groups: AffinityGroup[], action: string, description: string) => void;
  undo: () => AffinityGroup[] | null;
  redo: () => AffinityGroup[] | null;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

// dotVotingSessions




// export interface GroupVoteSummary {
//   groupId: string;
//   totalVotes: number;
//   userVotes: number;
//   group: AffinityGroup;
// }

//
// types/index.ts - AJOUTER CES TYPES

export type ThemeType = 'hierarchical' | 'related' | 'contradictory' | 'complementary';

export interface DetectedTheme {
  id: string;
  name: string;
  type: ThemeType;
  confidence: number;
  groupIds: string[];
  description: string;
  parentThemeId?: string;
  insightsCount: number;
}

export interface ThemeAnalysis {
  themes: DetectedTheme[];
  summary: {
    totalThemes: number;
    coverage: number; // % de groupes couverts par les thèmes
    avgConfidence: number;
    mainTheme?: DetectedTheme;
  };
  recommendations: ThemeRecommendation[];
}

// types/index.ts - METTRE À JOUR ThemeRecommendation
export interface ThemeRecommendation {
  type: 'merge' | 'split' | 'reorganize' | 'create_parent';
  groups: string[];
  reason: string;
  confidence: number;
  expectedImpact: 'high' | 'medium' | 'low';
  suggestedName?: string; // 🆕 OPTIONNEL - pour les noms suggérés
}

export interface Comment {
  _id: string;
  mapId: string;
  groupId: string;
  userId: string;
  userName: string;
  text: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
  viewedAt?: number; // ✅ ajoute ce champ

}



// types/index.ts - AJOUTER CES TYPES

// 🎯 TYPES POUR L'HISTORIQUE D'ACTIVITÉ
export type ActivityAction = 
  | "group_created"
  | "group_moved" 
  | "group_renamed"
  | "group_deleted"
  | "insight_added"
  | "insight_removed"
  | "insight_moved"
  | "comment_added"
  | "user_mentioned";

export interface ActivityDetails {
  // 🎯 DÉTAILS SPÉCIFIQUES POUR CHAQUE ACTION
  from?: { x: number; y: number } | string; // Position ou titre précédent
  to?: { x: number; y: number } | string;   // Position ou nouveau titre
  insightId?: string;
  mentionedUserId?: string;
}

export interface ActivityLog {
  _id: Id<"activityLog">;
  _creationTime: number;
  mapId: Id<"affinityMaps">;
  userId: string;
  userName: string;
  action: ActivityAction;
  targetId: string;
  targetName?: string;
  details?: ActivityDetails;
  timestamp: number;
}

export interface ConvexActivityLog {
  _id: Id<"activityLog">;
  _creationTime: number;
  mapId: Id<"affinityMaps">;
  userId: string;
  userName: string;
  action: ActivityAction;
  targetId: string;
  targetName?: string;
  details?: ActivityDetails;
  timestamp: number;
}

// types/index.ts - AJOUTER CES TYPES

// 🎯 TYPES POUR LE SYSTÈME DE NOTIFICATIONS

export type NotificationType = 
  | "group_created"
  | "group_moved"
  | "group_renamed" 
  | "group_deleted"
  | "insight_added"
  | "insight_moved"
  | "insight_removed"
  | "comment_added"
  | "user_mentioned"
  | "invite_accepted";

export interface Notification {
  _id: Id<"notifications">;
  _creationTime: number;
  userId: string; // User qui reçoit la notification
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string; // ID du groupe/commentaire/insight concerné
  relatedType?: "group" | "comment" | "insight" | "project";
  read: boolean;
  createdAt: number;
  actionUrl?: string; // URL pour naviguer vers l'élément
}

export interface ConvexNotification {
  _id: Id<"notifications">;
  _creationTime: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: "group" | "comment" | "insight" | "project";
  read: boolean;
  createdAt: number;
  actionUrl?: string;
}

// 🎯 TYPES POUR LES PROPS DES COMPOSANTS
export interface NotificationBellProps {
  className?: string;
}

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onClick?: () => void;
}

// 🎯 TYPE POUR LE HOOK useNotifications
export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: Id<"notifications">) => void;
  markAllAsRead: () => void;
  isLoading: boolean;
  refresh: () => void;
}


// types/index.ts - AJOUTER CES TYPES

// 🎯 TYPES POUR LE DOT VOTING AVEC SYSTÈME INVISIBLE
export type VotingPhase = "setup" | "voting" | "revealed" | "completed";

export interface DotVotingSession {
  _id: Id<"dotVotingSessions">;
  _creationTime: number;
  projectId: Id<"projects">;
  mapId: Id<"affinityMaps">;
  name: string;
  maxDotsPerUser: number;
  isActive: boolean;
  votingPhase: VotingPhase;
  isSilentMode: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}


export interface Vote {
  _id: Id<"votes">;
  _creationTime: number;
  sessionId: Id<"dotVotingSessions">;
  userId: string;
  groupId: string;
  votes: number;
  isVisible: boolean;
  color: string;
  position?: { x: number; y: number };
  
  // 🆕 PROPRIÉTÉS POUR DRAG & DROP
  dotSize?: number;
  isDragging?: boolean;
  zIndex?: number;
  
  createdAt: number;
  targetId: string;
  targetType: "group" | "insight";
}

export interface VoteDetail {
  userId: string;
  votes: number;
  color: string;
  position?: { x: number; y: number };
}

export interface GroupVoteResult {
  groupId: string;
  totalVotes: number;
  userVotes: number;
  group: AffinityGroup;
  voteDetails: VoteDetail[];
}

export interface SessionResults {
  session: DotVotingSession;
  results: GroupVoteResult[];
  userTotalVotes: number;
  maxVotesPerUser: number;
  myVotes: Vote[];
}

export interface DotVote {
  _id: Id<"dotVotes">;
  _creationTime: number;
  sessionId: Id<"dotVotingSessions">;
  userId: string;
  targetType: 'group' | 'insight';
  targetId: string;
  color: string;
  position: { x: number; y: number };
  createdAt: number;
}

export interface VotingResult {
  groupId: string;
  groupTitle: string;
  totalVotes: number;
  voteDetails: VoteDetail[];
}

export interface VotingHistoryItem {
  _id: Id<"votingHistory">;
  _creationTime: number;
  sessionId: Id<"dotVotingSessions">;
  results: VotingResult[];
  savedBy: string;
  savedAt: number;
}

// 🎯 AJOUTER AUSSI LE TYPE POUR LA MUTATION saveVotingResults
export interface SaveVotingResultsArgs {
  sessionId: Id<"dotVotingSessions">;
  results: VotingResult[];
}


// types/index.ts - AJOUTER CES TYPES
export interface UserPersona {
  _id?: Id<"personas">;
  _creationTime?: number;
  projectId: Id<"projects">;
  mapId: Id<"affinityMaps">;
  name: string;
  age: number;
  occupation: string;
  background: string;
  goals: string[];
  frustrations: string[];
  behaviors: string[];
  quote: string;
  profileImage: string;
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
  basedOn: {
    groups: number;
    insights: number;
    groupTitles: string[];
  };
  createdAt: number;
}

export interface ConvexUserPersona {
  _id: Id<"personas">;
  _creationTime: number;
  projectId: Id<"projects">;
  mapId: Id<"affinityMaps">;
  name: string;
  age: number;
  occupation: string;
  background: string;
  goals: string[];
  frustrations: string[];
  behaviors: string[];
  quote: string;
  profileImage: string;
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
  basedOn: {
    groups: number;
    insights: number;
    groupTitles: string[];
  };
  createdAt: number;
}

export interface SilentSortingSession {
  _id?: Id<"silentSortingSessions">;
  _creationTime?: number;
  mapId: Id<"affinityMaps">;
  isActive: boolean;
  duration: number; // en secondes
  startTime: number;
  endTime: number;
  createdBy: string;
  participants: string[];
}

export type SilentSortingPhase = 'not-started' | 'sorting' | 'review' | 'completed';

// Dans types/index.ts - AJOUTER CES TYPES
export interface InterviewSummary {
  executiveSummary: string;
  keyPoints: string[];
  recommendations: string[];
  mainThemes: string[];
  criticalIssues: string[];
  generatedAt: number;
}

export interface SummaryRequest {
  transcription: string;
  topic?: string;
  insights: Insight[];
  projectContext?: string;
}

export interface SummaryResponse {
  summary: InterviewSummary;
}