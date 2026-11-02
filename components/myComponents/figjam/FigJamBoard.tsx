"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";

import { useFigJamBoard } from "@/hooks/useFigJamBoard";
import { ClusterLabel } from "./ClusterLabel";
import { FigJamToolbar } from "./FigJamToolbar";
import { MiniMap } from "./MiniMap";
import { AIGroupingPanel } from "./AIGroupingPanel";
import { LassoContextMenu, ClusterContextMenu } from "./ContextMenu";
import { ClusterAIRename } from "./ClusterAIRename";
import { CommentBubblesLayer } from "./CommentBubble";
import { PresentationMode } from "./PresentationMode";
import { InsightsSidebar } from "./InsightsSidebar";
import { TapePeek, type TapePeekTarget } from "@/components/myComponents/affinity/TapePeek";
import { FindStudyDialog } from "@/components/myComponents/FindStudyDialog";
import { ShareProjectModal } from "@/components/myComponents/ShareProjectModal";
import { CastDialog } from "../CastDialog";
import { CastPeek, type CastPeekAnchor, type CastPeekPersona } from "../CastPeek";
import { WallCast } from "./WallCast";
import { GDPRConsent } from "../GDPRConsent";
import type { FigJamElement, Position, Size, StickyColor, StickyNoteData, DotData, ClusterLabelData, SectionData, TextData } from "@/types/figjam";
import type { Insight } from "@/types";
import {
  PACKET_EMPTY,
  PACKET_MAX_COLS,
  SLIP_MIN_HEIGHT,
  SLIP_MIN_WIDTH,
  packetColumns,
  packetHeight,
  packetHugWidth,
  packetSlipPosition,
  findPacketSlot,
  type PacketRect,
} from "@/lib/packetLayout";
import { slipKindOf } from "@/components/myComponents/affinity/SlipFace";
import {
  applyRemoteFigJam,
  buildFigJamSavePayload,
  isFigJamTombstone,
  liveFigJamElements,
  preferRicherFigJam,
} from "@/lib/figjamMerge";
import { castAvatarUrl, resolveCastAvatar } from "@/lib/castAvatar";

interface CommentBubbleData {
  id: string;
  position: Position;
  targetId?: string;
  targetType?: "sticky" | "label" | "canvas";
  resolved: boolean;
  createdBy?: string;
  createdByName?: string;
}
import { useAuth, useUser } from "@clerk/nextjs";
import { usePresence } from "@/hooks/usePresence";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import { useThrottle } from "@/hooks/useThrottle";
import { useVotingSync } from "@/hooks/useVotingSync";
import { MentionToastProvider } from "@/hooks/useMentionToasts";
import { toast } from "sonner";
import { MonitorSmartphone } from "lucide-react";
import { useConfirmationToast } from "@/hooks/useConfirmationToast";

interface PresenceUser {
  _id: string;
  _creationTime: number;
  userId: string;
  mapId: string;
  cursor: { x: number; y: number };
  selection: string[];
  user: { id: string; name: string; avatar?: string };
  cursorColor?: string;
  lastSeen: number;
}

type ElementPatch = Partial<StickyNoteData> | Partial<SectionData> | Partial<TextData> | Partial<DotData> | Partial<ClusterLabelData>;


// ─── Canvas dot grid ──────────────────────────────────────────────────────────

function CanvasGrid({ zoom, pan }: { zoom: number; pan: Position }) {
  const spacing = 24 * zoom;
  const offsetX = (pan.x % spacing + spacing) % spacing;
  const offsetY = (pan.y % spacing + spacing) % spacing;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <pattern
          id="figjam-grid"
          x={offsetX} y={offsetY}
          width={spacing} height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={1} cy={1} r={1} fill="currentColor" className="text-border/40" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#figjam-grid)" />
    </svg>
  );
}

// ─── FigJamBoard ──────────────────────────────────────────────────────────────

interface FigJamBoardProps {
  projectName?: string;
  projectId?: string;
  storageKey?: string;
  onChange?: (elements: Record<string, FigJamElement>) => void;
  initialElements?: Record<string, FigJamElement>;
  mapId?: string;
  maxVotesPerUser?: number;
  onToggleActivityPanel?: () => void;
  isActivityPanelOpen?: boolean;
  style?: React.CSSProperties;
  isVotingMode?: boolean;
  voting?: ReturnType<typeof useVotingSync>;
  onBack?: () => void;
  onOpenComment?: (elementId: string, elementRect: DOMRect, elementTitle?: string) => void;
  // Import insights
  projectInsights?: Insight[];
  existingInsightIds?: string[];
  onImportInsights?: (insights: Insight[]) => void;
  // Callback to get current insight IDs on canvas
  onCanvasInsightIdsChange?: (insightIds: string[]) => void;
  sittingId?: string;
  // Presence users for displaying voter names
  presenceUsers?: Array<{ userId: string; user?: { id: string; name: string; avatar?: string } }>;
  // Current user for displaying own vote name
  currentUser?: { userId: string; name: string };
  // Callback to open persona panel
  onOpenPersona?: () => void;
  // Callback to receive cluster/label data for panels
  onLabelDataChange?: (labels: Array<{ id: string; title: string; insightIds: string[]; color: string; position: Position }>) => void;
  // Callback to toggle voting mode
  onToggleVoting?: () => void;
  // Trigger to open voting config modal (passed as number)
  votingConfigTrigger?: number;
  // Whether personas exist for showing "View Persona" vs "Generate Persona"
  hasPersonas?: boolean;
  // Callbacks for undo/redo (for Timeline panel integration)
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Callback to expose board controls (undo/redo) to parent
  onBoardControlsReady?: (controls: { undo: () => void; redo: () => void; openFind: () => void }) => void;
}

export function FigJamBoard({
  projectName,
  projectId,
  storageKey = "figjam-default",
  onChange,
  initialElements,
  mapId,
  maxVotesPerUser = 10,
  style,
  isVotingMode,
  voting: votingProp,
  onBack,
  onOpenComment,
  projectInsights = [],
  existingInsightIds: _existingInsightIds = [],
  onImportInsights,
  onCanvasInsightIdsChange,
  sittingId,
  presenceUsers = [],
  currentUser,
  onOpenPersona,
  onLabelDataChange,
  onToggleVoting,
  hasPersonas = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onBoardControlsReady,
}: FigJamBoardProps) {
  const board = useFigJamBoard();
  const { state, setTool } = board;

  // Detect mobile/touch device
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      // Touch device OR small screen (< 768px)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force select mode on mobile (read-only experience)
  useEffect(() => {
    if (isMobile) {
      setTool("select");
      setShowInsightsSidebar(false);
    }
  }, [isMobile, setTool]);

  // Pre-compute stickies for use in drag handlers (memoized)
  const allSortedElements = useMemo(() => 
    Object.values(state.elements).sort((a, b) => a.zIndex - b.zIndex), 
    [state.elements]
  );
  const stickies = useMemo(() => 
    allSortedElements.filter((el): el is StickyNoteData => el.type === "sticky"),
    [allSortedElements]
  );

  // Conditional debug logging (only in development)
  const DEBUG = process.env.NODE_ENV === 'development';
  const debugLog = (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  };

  // Expose undo/redo after persist helpers are defined

  const hasMapId = !!mapId && !!projectId;
  
  // Simple voting mode - controlled by parent
  const isVotingModeEnabled = isVotingMode ?? false;

  // Voting hook - use passed prop or create new instance
  const localVoting = useVotingSync(undefined, undefined);
  const voting = votingProp ?? localVoting;

  // Local state for UI
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Track last saved elements to prevent save loops
  const lastSavedElementsRef = useRef<string>("");
  const knownLiveIdsRef = useRef<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Map<string, number>>(new Map());
  const suppressRemoteUntilRef = useRef(0);
  const forceSaveAfterUpdateRef = useRef(false);
  const lastEmptyBubbleIdRef = useRef<string | null>(null);
  // Track last processed movement timestamp to avoid duplicates
  const lastProcessedTimestampRef = useRef<number>(0);

  const draggingRef = useRef<Set<string>>(new Set());
  const draggingClusterRef = useRef<string | null>(null);
  const draggingClusterStartPosRef = useRef<Position | null>(null);

  const isDraggingElement = useCallback((id: string) => {
    return draggingRef.current.has(id);
  }, []);

  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);

  useEffect(() => {
    const clearDrag = () => setDraggingStickyId(null);
    window.addEventListener("dragend", clearDrag);
    return () => window.removeEventListener("dragend", clearDrag);
  }, []);
  const draggingPositionRef = useRef<{ pos: Position; size: Size } | null>(null);

  const [lassoStart, setLassoStart] = useState<Position | null>(null);
  const [lassoEnd, setLassoEnd] = useState<Position | null>(null);
  const isLassoing = lassoStart !== null;

  const [renameSectionId, setRenameSectionId] = useState<string | null>(null);
  const [autoFitSectionId, setAutoFitSectionId] = useState<string | null>(null);
  const [showStickyPicker, setShowStickyPicker] = useState(false);
  const [pendingStickyPosition, setPendingStickyPosition] = useState<Position | null>(null);
  const [showAIGroupingPanel, setShowAIGroupingPanel] = useState(false);
  const [showGDPRConsent, setShowGDPRConsent] = useState(false);
  const [showInsightsSidebar, setShowInsightsSidebar] = useState(true);
  const [tapePeek, setTapePeek] = useState<TapePeekTarget | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [castSeedPacketId, setCastSeedPacketId] = useState<string | null>(null);
  const [castPeek, setCastPeek] = useState<CastPeekPersona | null>(null);
  const [castPeekAnchor, setCastPeekAnchor] = useState<CastPeekAnchor | null>(null);
  const [castPositionOverrides, setCastPositionOverrides] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [votingConfigTrigger, setVotingConfigTrigger] = useState(0);

  // Guard to prevent duplicate cluster creation on single click
  const clusterCreationGuardRef = useRef<{ timestamp: number; position: { x: number; y: number } } | null>(null);
  // Guard to prevent duplicate sticky creation on single click
  const stickyCreationGuardRef = useRef<{ timestamp: number; position: { x: number; y: number } } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    ids: string[];
  } | null>(null);
  
  const [clusterContextMenu, setClusterContextMenu] = useState<{
    position: { x: number; y: number };
    clusterId: string;
  } | null>(null);

  const [showAIRenameDialog, setShowAIRenameDialog] = useState(false);
  const [selectedClusterForRename, setSelectedClusterForRename] = useState<string | null>(null);

  // Comment bubbles state - loaded from Convex
  const convexBubbles = useQuery(
    mapId ? api.commentBubbles.getBubblesByMap : "skip" as any,
    mapId ? { mapId: mapId as Id<"affinityMaps"> } : {}
  );
  const savedCasts = useQuery(
    api.personas.getPersonasByMap,
    mapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );
  const openCast = useCallback((packetId?: string) => {
    setCastSeedPacketId(packetId ?? null);
    setCastOpen(true);
    onOpenPersona?.();
  }, [onOpenPersona]);
  
  const commentBubbles: CommentBubbleData[] = (convexBubbles ?? []).map((b: any) => ({
    id: b._id,
    position: b.position,
    targetId: b.targetId,
    targetType: b.targetType,
    resolved: b.resolved,
    createdBy: b.createdBy,
    createdByName: b.createdByName,
  }));

  const createBubbleMutation = useMutation(api.commentBubbles.createBubble);
  const deleteBubbleMutation = useMutation(api.commentBubbles.deleteBubble);
  const updateBubblePositionMutation = useMutation(api.commentBubbles.updateBubblePosition);
  const resolveBubbleMutation = useMutation(api.commentBubbles.resolveBubble);
  const deletePersonaMutation = useMutation(api.personas.deletePersona);
  const updatePersonaWallPosition = useMutation(api.personas.updatePersonaWallPosition);
  const updatePersonaMutation = useMutation(api.personas.updatePersona);

  // Backfill missing profileImage for older casts (derive randomuser from name).
  const avatarBackfillRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!savedCasts) return;
    for (const persona of savedCasts) {
      const stored = persona.profileImage?.trim();
      if (
        stored &&
        !stored.includes("dicebear.com") &&
        !stored.includes("ui-avatars.com")
      ) {
        continue;
      }
      if (avatarBackfillRef.current.has(persona._id)) continue;
      avatarBackfillRef.current.add(persona._id);
      const url = castAvatarUrl(persona.name, persona.gender);
      void updatePersonaMutation({
        personaId: persona._id,
        profileImage: url,
      }).catch(() => {
        avatarBackfillRef.current.delete(persona._id);
      });
    }
  }, [savedCasts, updatePersonaMutation]);

  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isCommentToolActive, setIsCommentToolActive] = useState(false);
  const commentToolArmedRef = useRef(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isOverCluster, setIsOverCluster] = useState(false);
  const [newBubbleCount, setNewBubbleCount] = useState(0);
  const [isPresentationModeActive, setIsPresentationModeActive] = useState(false);
  const [bouncingBubbleId, setBouncingBubbleId] = useState<string | null>(null);

  // Pure helper function to find cluster at position (defined before useCallback to avoid hoisting issues)
  function findClusterAtPositionHelper(x: number, y: number, width: number, height: number, clusterLabels: ClusterLabelData[]): string | null {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    for (const label of clusterLabels) {
      const clusterX = label.position.x;
      const clusterY = label.position.y;
      const clusterWidth = label.width ?? PACKET_EMPTY.width;
      const clusterHeight = label.height ?? PACKET_EMPTY.height;
      
      if (
        centerX >= clusterX &&
        centerX <= clusterX + clusterWidth &&
        centerY >= clusterY &&
        centerY <= clusterY + clusterHeight
      ) {
        return label.id;
      }
    }
    return null;
  }

  // Helper to calculate sticky position in grid within cluster
  function calculateStickyPositionInCluster(
    cluster: ClusterLabelData,
    stickiesInCluster: StickyNoteData[]
  ): Position {
    const width = cluster.width ?? PACKET_EMPTY.width;
    const cols = packetColumns(width, stickiesInCluster.length + 1);
    return packetSlipPosition(
      { x: cluster.position.x, y: cluster.position.y, width },
      stickiesInCluster.length,
      cols
    );
  }

  // Track which insights are currently on canvas (use ref to avoid infinite loop)
  const onCanvasInsightIdsChangeRef = useRef(onCanvasInsightIdsChange);
  useEffect(() => {
    onCanvasInsightIdsChangeRef.current = onCanvasInsightIdsChange;
  });
  
  useEffect(() => {
    if (!onCanvasInsightIdsChangeRef.current) return;
    
    const canvasInsightIds = Object.values(state.elements)
      .filter(el => el.type === "sticky" && (el as any).insightId)
      .map(el => (el as any).insightId as string);
    
    onCanvasInsightIdsChangeRef.current(canvasInsightIds);
  }, [state.elements]);

  const TRAY_PARK = { x: -2400, y: -2400 };
  const trayHydratedRef = useRef(false);
  const pendingImportIdsRef = useRef<Set<string>>(new Set());
  const dedupeRanRef = useRef(false);

  const importInsightsToTray = useCallback((incoming: Insight[], silent = false) => {
    if (incoming.length === 0) return;

    const alreadyOnBoard = new Set(
      Object.values(board.state.elements)
        .filter((el): el is StickyNoteData => el.type === "sticky" && Boolean(el.insightId))
        .map((el) => el.insightId as string)
    );

    const unique = incoming.filter((insight) => {
      if (alreadyOnBoard.has(insight.id)) return false;
      if (pendingImportIdsRef.current.has(insight.id)) return false;
      return true;
    });
    if (unique.length === 0) return;

    unique.forEach((insight) => pendingImportIdsRef.current.add(insight.id));

    const size = { width: SLIP_MIN_WIDTH, height: SLIP_MIN_HEIGHT };

    board.beginHistoryBatch();
    unique.forEach((insight) => {
      let stickyColor: StickyColor = "insight";
      if (insight.type === "quote") stickyColor = "quote";
      else if (insight.type === "pain-point") stickyColor = "pain-point";
      else if (insight.type === "follow-up") stickyColor = "follow-up";

      const stickyId = board.addStickyNote(
        TRAY_PARK,
        stickyColor,
        size,
        insight.createdByName || "Imported"
      );

      board.updateElement(stickyId, {
        content: insight.text,
        insightId: insight.id,
        interviewId: insight.interviewId,
        timestamp: insight.timestamp,
        clusterId: null,
        parentSectionId: null,
        source: insight.type,
      });
    });
    board.endHistoryBatch(false);

    setShowInsightsSidebar(true);
    if (!silent) {
      toast.success(
        unique.length === 1 ? "1 slip in the tray" : `${unique.length} slips in the tray`
      );
    }
    onImportInsights?.(unique);
  }, [board, onImportInsights]);

  /** Keep one sticky per insightId (prefer clustered / richer content). */
  const dedupeStickiesByInsightId = useCallback(() => {
    const byInsight = new Map<string, StickyNoteData[]>();
    for (const el of Object.values(board.state.elements)) {
      if (el.type !== "sticky") continue;
      const sticky = el as StickyNoteData;
      if (!sticky.insightId) continue;
      const list = byInsight.get(sticky.insightId) ?? [];
      list.push(sticky);
      byInsight.set(sticky.insightId, list);
    }

    const toDelete: string[] = [];
    for (const [, copies] of byInsight) {
      if (copies.length < 2) continue;
      const ranked = [...copies].sort((a, b) => {
        const aCluster = a.clusterId || a.parentSectionId ? 1 : 0;
        const bCluster = b.clusterId || b.parentSectionId ? 1 : 0;
        if (bCluster !== aCluster) return bCluster - aCluster;
        const aLen = (a.content ?? "").trim().length;
        const bLen = (b.content ?? "").trim().length;
        if (bLen !== aLen) return bLen - aLen;
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      });
      for (let i = 1; i < ranked.length; i++) {
        toDelete.push(ranked[i]!.id);
      }
    }

    if (toDelete.length === 0) return 0;
    const deletedAt = Date.now();
    board.beginHistoryBatch();
    for (const id of toDelete) {
      pendingDeletesRef.current.set(id, deletedAt);
      board.deleteElement(id);
    }
    board.endHistoryBatch(false);
    return toDelete.length;
  }, [board]);

  // Track element positions to update bubbles that follow targets
  const elementPositionsRef = useRef<Record<string, Position>>({});

  // Update bubble positions when target elements move
  useEffect(() => {
    if (!convexBubbles) return;

    commentBubbles.forEach((bubble) => {
      if (bubble.targetId && bubble.targetType !== "canvas") {
        const targetElement = state.elements[bubble.targetId];
        if (targetElement) {
          const newPos = targetElement.position;
          const oldPos = elementPositionsRef.current[bubble.targetId];
          
          if (oldPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
            const dx = newPos.x - oldPos.x;
            const dy = newPos.y - oldPos.y;
            const newBubblePos = {
              x: bubble.position.x + dx,
              y: bubble.position.y + dy,
            };
            updateBubblePositionMutation({ 
              bubbleId: bubble.id as Id<"commentBubbles">, 
              position: newBubblePos 
            });
          }
        }
        elementPositionsRef.current[bubble.targetId] = targetElement.position;
      }
    });
  }, [state.elements, commentBubbles]);
  
  // ── Presence (cursors) ───────────────────────────────────────────────────
  const { userId } = useAuth();
  const { user } = useUser();
  const currentUserName = user?.fullName || user?.firstName || "Anonymous";

  const votePanOriginRef = useRef<Position>({ x: 0, y: 0 });
  const lastVoteRef = useRef<string[]>([]);

  useEffect(() => {
    if (!voting.isVoting) lastVoteRef.current = [];
  }, [voting.isVoting]);

  // ── Confirmation Toasts ─────────────────────────────────────────────────
  const { confirmDelete, confirmMerge, showUndoToast } = useConfirmationToast();
  
  const CURSOR_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  
  // User color for voting dots - consistent based on userId
  const userColor = useMemo(() => {
    const VOTING_COLORS = [
      "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
      "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
    ];
    if (!userId) return "#22c55e";
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return VOTING_COLORS[hash % VOTING_COLORS.length];
  }, [userId]);
  const OFFLINE_THRESHOLD_MS = 30000;
  const INACTIVE_THRESHOLD_MS = 5000;

  function getUserColor(userId: string): string {
    // Generate consistent color based on userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // ============================================
  // CONvex - Load/Save FigJam Elements
  // ============================================
  const updatePresence = usePresence(hasMapId ? (mapId as Id<"affinityMaps">) : "");
  
  // Query: Get other users' presence (cursors, selections)
  const otherUsers = useQuery(
    api.presence.getByMap,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );

  // Create userNames map from other users
  const userNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set("current-user", "You");
    if (userId) map.set(userId, currentUserName);
    otherUsers?.forEach((u: PresenceUser) => {
      if (u.userId && u.user?.name) {
        map.set(u.userId, u.user.name);
      }
    });
    return map;
  }, [otherUsers, userId, currentUserName]);

  // Query: Load FigJam elements from Convex
  const savedElements = useQuery(
    api.affinityMaps.getFigJamElements,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );
  
  // Query: Get recent movements for real-time sync
  const recentMovements = useQuery(
    api.affinityMaps.getRecentMovements,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );

  // Query: Get element locks
  const elementLocks = useQuery(
    api.affinityMaps.getElementLocks,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );

  // Mutation: Save FigJam elements to Convex (debounced)
  const saveToConvex = useMutation(api.affinityMaps.saveFigJamElements);
  
  // Mutation: Broadcast real-time movement
  const broadcastMovement = useMutation(api.affinityMaps.broadcastMovement);
  
  // Mutation: Lock/unlock elements
  const lockElement = useMutation(api.affinityMaps.lockElement);
  const unlockElement = useMutation(api.affinityMaps.unlockElement);
  
  // Mutation: Log activity
  const logActivity = useMutation(api.activityLog.logActivity);
  
  // Immediate save - for critical operations like lock/unlock
  const persistToConvex = useCallback((live: Record<string, FigJamElement>) => {
    if (!hasMapId) return Promise.resolve();
    if (Object.keys(live).length === 0 && knownLiveIdsRef.current.size > 0) {
      return Promise.resolve();
    }
    // Only tombstone IDs explicitly deleted this session — never infer from knownLiveIds.
    const payload = buildFigJamSavePayload(live, pendingDeletesRef.current);
    for (const id of Object.keys(live)) {
      knownLiveIdsRef.current.add(id);
      pendingDeletesRef.current.delete(id);
    }
    return saveToConvex({
      mapId: mapId as Id<"affinityMaps">,
      elements: payload,
    }).then(() => {
      lastSavedElementsRef.current = JSON.stringify(live);
      for (const [id, stored] of Object.entries(payload)) {
        if (isFigJamTombstone(stored)) {
          knownLiveIdsRef.current.delete(id);
          pendingDeletesRef.current.delete(id);
        }
      }
    });
  }, [hasMapId, mapId, saveToConvex]);

  const immediateSave = useCallback((elements: Record<string, FigJamElement>) => {
    if (!hasMapId) return;
    suppressRemoteUntilRef.current = Date.now() + 2500;
    void persistToConvex(elements);
    debugLog("[IMMEDIATE_SAVE] Saved", Object.keys(elements).length, "elements");
  }, [hasMapId, persistToConvex]);

  const deleteAndTrack = useCallback(
    (id: string) => {
      pendingDeletesRef.current.set(id, Date.now());
      board.deleteElement(id);
    },
    [board]
  );
  
  const throttledSave = useThrottle((elements: Record<string, FigJamElement>) => {
    void persistToConvex(elements);
  }, 500);
  
  // Throttled broadcast - sends movement updates every 100ms for real-time sync
  const throttledBroadcast = useThrottle((
    elementId: string,
    elementType: "sticky" | "section" | "dot" | "label",
    action: "move" | "resize" | "update",
    position?: { x: number; y: number },
    size?: { width: number; height: number },
    patch?: ElementPatch
  ) => {
    if (hasMapId && userId) {
      broadcastMovement({
        mapId: mapId as Id<"affinityMaps">,
        elementId,
        elementType,
        action,
        position,
        size,
        patch,
        userId,
      });
    }
  }, 200);

  // Helper function to log activity
  const safeLogActivity = useCallback((
    action: "sticky_created" | "sticky_updated" | "sticky_moved" | "sticky_deleted" |
            "section_created" | "section_renamed" | "section_moved" | "section_deleted" |
            "group_created" | "group_renamed" | "group_moved" | "group_deleted" |
            "ai_cluster_created" | "ai_suggestions_generated" | "elements_grouped",
    targetId: string,
    targetName?: string
  ) => {
    if (hasMapId && mapId) {
      try {
        logActivity({
          mapId: mapId as Id<"affinityMaps">,
          action,
          targetId,
          targetName,
        });
      } catch (err) {
        console.error("Failed to log activity:", err);
      }
    }
  }, [hasMapId, mapId, logActivity]);

  // Helper to get lock info for an element
  const getLockInfo = (elementId: string) => {
    const lock = elementLocks?.find(l => l.elementId === elementId);
    if (!lock) return { isLocked: false, lockedByName: undefined };
    
    // Find user name from presence
    const user = otherUsers?.find(u => u.userId === lock.userId);
    const isLockedByMe = lock.userId === userId;
    
    return {
      isLocked: !isLockedByMe,
      lockedByName: user?.user?.name || (isLockedByMe ? "You" : "Someone"),
    };
  };

  // ============================================
  // Selection with locking
  // ============================================
  const handleSelectWithLock = useCallback(async (id: string, multi: boolean = false) => {
    if (!hasMapId || !userId) return;
    
    // Check if already locked by someone else
    const lock = elementLocks?.find(l => l.elementId === id);
    if (lock && lock.userId !== userId) {
      // Element is locked by another user - can't select
      return;
    }
    
    // Lock the element
    const result = await lockElement({
      mapId: mapId as Id<"affinityMaps">,
      elementId: id,
      userId,
    });
    
    if (result.success) {
      board.selectElement(id, multi);
    }
  }, [hasMapId, userId, elementLocks, lockElement, board]);

  const handleDeselectAndUnlock = useCallback(async (id: string) => {
    if (!hasMapId || !userId) return;
    
    // Unlock the element
    await unlockElement({
      mapId: mapId as Id<"affinityMaps">,
      elementId: id,
      userId,
    });
  }, [hasMapId, userId, unlockElement]);

  // ============================================
  // LOAD: Priority Convex > initialElements > localStorage
  // ============================================
  const hasLoadedInitialRef = useRef(false);
  const lastMapIdRef = useRef(mapId);

  useEffect(() => {
    if (lastMapIdRef.current === mapId) return;
    lastMapIdRef.current = mapId;
    hasLoadedInitialRef.current = false;
    knownLiveIdsRef.current = new Set();
    lastSavedElementsRef.current = "";
    setIsLoaded(false);
  }, [mapId]);
  const savedElementsRef = useRef(savedElements);
  
  // Update ref when savedElements changes
  useEffect(() => {
    savedElementsRef.current = savedElements;
  }, [savedElements]);
  
  useEffect(() => {
    // Only run on mount (when savedElements first loads)
    if (hasLoadedInitialRef.current) return;
    
    // Wait for savedElements to be defined (not undefined)
    if (savedElementsRef.current === undefined) return;
    
    hasLoadedInitialRef.current = true;

    if (savedElements && typeof savedElements === "object") {
      let live = liveFigJamElements(savedElements as Record<string, unknown>);
      // Heal: localStorage may still hold packets tombstoned by a raced save.
      if (storageKey) {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const localLive = liveFigJamElements(parsed);
            const richer = preferRicherFigJam(live, localLive);
            if (richer !== live) {
              const healedAt = Date.now();
              live = Object.fromEntries(
                Object.entries(richer).map(([id, el]) => [
                  id,
                  { ...el, updatedAt: Math.max(el.updatedAt ?? 0, healedAt) },
                ])
              ) as Record<string, FigJamElement>;
              // Push healed wall back so Issue / dashboard catch up.
              suppressRemoteUntilRef.current = Date.now() + 4000;
              void persistToConvex(live);
            }
          }
        } catch {
          /* ignore corrupt backup */
        }
      }
      board.loadElements(live);
      lastSavedElementsRef.current = JSON.stringify(live);
      knownLiveIdsRef.current = new Set(Object.keys(live));
      setIsLoaded(true);
      return;
    }

    if (initialElements && Object.keys(initialElements).length > 0) {
      board.loadElements(initialElements);
      lastSavedElementsRef.current = JSON.stringify(initialElements);
      knownLiveIdsRef.current = new Set(Object.keys(initialElements));
      setIsLoaded(true);
      return;
    }

    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Record<string, unknown>;
          const live = liveFigJamElements(parsed);
          board.loadElements(live);
          lastSavedElementsRef.current = JSON.stringify(live);
          knownLiveIdsRef.current = new Set(Object.keys(live));
          setIsLoaded(true);
          return;
        } catch (e) {
          console.error("Failed to load board from localStorage:", e);
        }
      }
    }
    
    setIsLoaded(true);
  }, [savedElements, initialElements, storageKey, board, persistToConvex]);

  useEffect(() => {
    if (!isLoaded) return;
    // Wait for Convex map payload before importing — avoids twining saved slips.
    if (hasMapId && savedElements === undefined) return;

    const stickiesOnBoard = Object.values(state.elements).filter(
      (el): el is StickyNoteData => el.type === "sticky"
    );
    const presentInsightIds = new Set(
      stickiesOnBoard
        .filter((el) => Boolean(el.insightId))
        .map((el) => el.insightId as string)
    );

    // One-shot cleanup of historical duplicates (same insightId, many stickies).
    if (!dedupeRanRef.current && stickiesOnBoard.length > 0) {
      dedupeRanRef.current = true;
      const removed = dedupeStickiesByInsightId();
      if (removed > 0) {
        toast.message(
          removed === 1
            ? "Removed 1 duplicate slip"
            : `Removed ${removed} duplicate slips`
        );
        return;
      }
    }

    for (const id of presentInsightIds) {
      pendingImportIdsRef.current.delete(id);
    }

    const missing = projectInsights.filter((insight) => {
      if (presentInsightIds.has(insight.id)) return false;
      if (pendingImportIdsRef.current.has(insight.id)) return false;
      return true;
    });
    if (missing.length === 0) {
      trayHydratedRef.current = true;
      board.markLoaded();
      return;
    }

    const silent = trayHydratedRef.current;
    trayHydratedRef.current = true;
    importInsightsToTray(missing, silent);
    board.markLoaded();
  }, [
    isLoaded,
    hasMapId,
    savedElements,
    projectInsights,
    importInsightsToTray,
    dedupeStickiesByInsightId,
    state.elements,
    board,
  ]);

  // ============================================
  // REAL-TIME SYNC: Sync with Convex when data changes from other users
  // ============================================
  const lastSyncedElementsRef = useRef<string>("");
  const didPushRicherRef = useRef(false);

  // If this tab still has packets Convex lost (tombstone race), push them back once.
  useEffect(() => {
    if (!isLoaded || !hasMapId || savedElements === undefined) return;
    if (didPushRicherRef.current) return;
    if (Date.now() < suppressRemoteUntilRef.current) return;

    const remoteLive = liveFigJamElements(savedElements as Record<string, unknown>);
    const localLive = state.elements;
    const preferred = preferRicherFigJam(remoteLive, localLive);
    if (preferred !== localLive) return;

    const localLabels = Object.values(localLive).filter((el) => el.type === "label").length;
    const remoteLabels = Object.values(remoteLive).filter((el) => el.type === "label").length;
    const localGrouped = Object.values(localLive).filter(
      (el) => el.type === "sticky" && (el.clusterId || el.parentSectionId)
    ).length;
    const remoteGrouped = Object.values(remoteLive).filter(
      (el) => el.type === "sticky" && (el.clusterId || el.parentSectionId)
    ).length;
    if (localLabels <= remoteLabels && localGrouped <= remoteGrouped) return;

    didPushRicherRef.current = true;
    const healedAt = Date.now();
    const bumped = Object.fromEntries(
      Object.entries(localLive).map(([id, el]) => [
        id,
        { ...el, updatedAt: Math.max(el.updatedAt ?? 0, healedAt) },
      ])
    ) as Record<string, FigJamElement>;
    suppressRemoteUntilRef.current = Date.now() + 4000;
    void persistToConvex(bumped);
  }, [isLoaded, hasMapId, savedElements, state.elements, persistToConvex]);

  useEffect(() => {
    if (!isLoaded || savedElements === undefined) return;
    if (!hasLoadedInitialRef.current) return;
    if (Date.now() < suppressRemoteUntilRef.current) return;

    const savedStr = JSON.stringify(savedElements ?? {});
    if (savedStr === lastSyncedElementsRef.current) return;

    const remoteStored = (savedElements ?? {}) as Record<string, unknown>;
    const merged = applyRemoteFigJam(
      board.state.elements,
      remoteStored,
      pendingDeletesRef.current
    );
    const mergedStr = JSON.stringify(merged);
    if (mergedStr !== JSON.stringify(board.state.elements)) {
      board.loadElements(merged);
    }
    lastSyncedElementsRef.current = savedStr;
    lastSavedElementsRef.current = mergedStr;
    knownLiveIdsRef.current = new Set(Object.keys(merged));
  }, [savedElements, isLoaded, board]);

  // ============================================
  // Save: On every change → Convex + localStorage
  // ============================================
  const pendingSaveRef = useRef<Record<string, FigJamElement> | null>(null);

  const flushSave = useCallback((elements?: Record<string, FigJamElement>, force = false) => {
    const payload = elements ?? pendingSaveRef.current;
    if (!payload || !hasMapId) return;

    const remoteStored = savedElementsRef.current;
    if (!force && remoteStored && typeof remoteStored === "object") {
      const remoteLive = liveFigJamElements(remoteStored as Record<string, unknown>);
      const localMax = Object.values(payload).reduce(
        (max, el) => Math.max(max, el.updatedAt ?? 0),
        0
      );
      const remoteMax = Object.values(remoteLive).reduce(
        (max, el) => Math.max(max, el.updatedAt ?? 0),
        0
      );
      const localIds = Object.keys(payload);
      const missingLocalIds = [...knownLiveIdsRef.current].some((id) => !(id in payload));
      const extraLocalIds = localIds.some((id) => !(id in remoteLive));
      if (localMax < remoteMax && !missingLocalIds && !extraLocalIds) {
        pendingSaveRef.current = null;
        return;
      }
    }

    void persistToConvex(payload);
    pendingSaveRef.current = null;
  }, [hasMapId, persistToConvex]);

  const persistUndo = useCallback(() => {
    const restored = board.undo();
    onUndo?.();
    if (!restored) return restored;
    suppressRemoteUntilRef.current = Date.now() + 2500;
    lastSavedElementsRef.current = JSON.stringify(restored);
    flushSave(restored, true);
    return restored;
  }, [board.undo, onUndo, flushSave]);

  const persistRedo = useCallback(() => {
    const restored = board.redo();
    onRedo?.();
    if (!restored) return restored;
    suppressRemoteUntilRef.current = Date.now() + 2500;
    lastSavedElementsRef.current = JSON.stringify(restored);
    flushSave(restored, true);
    return restored;
  }, [board.redo, onRedo, flushSave]);

  const persistUndoRef = useRef(persistUndo);
  const persistRedoRef = useRef(persistRedo);
  persistUndoRef.current = persistUndo;
  persistRedoRef.current = persistRedo;

  const handleFitFrame = useCallback((clusterId: string, size: { width?: number; height?: number }) => {
    board.updateElementNoHistory(clusterId, size);
  }, [board.updateElementNoHistory]);

  const openTapePeek = useCallback((stickyId: string) => {
    const sticky = stickies.find((item) => item.id === stickyId);
    if (!sticky) return;
    const insight = projectInsights.find((item) => item.id === sticky.insightId);
    const interviewId = sticky.interviewId || insight?.interviewId;
    const timestamp = sticky.timestamp ?? insight?.timestamp ?? 0;
    if (!interviewId) {
      toast.error("This slip has no tape origin");
      return;
    }
    setTapePeek({
      interviewId,
      timestamp,
      quote: sticky.content || insight?.text || "",
    });
  }, [stickies, projectInsights]);

  useEffect(() => {
    onBoardControlsReady?.({
      undo: () => persistUndoRef.current(),
      redo: () => persistRedoRef.current(),
      openFind: () => setFindOpen(true),
    });
  }, [onBoardControlsReady]);

  useEffect(() => {
    if (!isLoaded) return;

    const currentElementsStr = JSON.stringify(state.elements);
    if (currentElementsStr === lastSavedElementsRef.current) {
      return;
    }

    if (storageKey) {
      localStorage.setItem(storageKey, currentElementsStr);
    }

    pendingSaveRef.current = state.elements;
    if (forceSaveAfterUpdateRef.current) {
      forceSaveAfterUpdateRef.current = false;
      suppressRemoteUntilRef.current = Date.now() + 2500;
      immediateSave(state.elements);
    } else {
      throttledSave(state.elements);
    }
    onChange?.(state.elements);
  }, [state.elements, storageKey, isLoaded, throttledSave, immediateSave, onChange]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flushSave();
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushSave]);

  // ============================================
  // PHASE 3: Real-time movements from other users
  // ============================================
  useEffect(() => {
    if (!recentMovements || recentMovements.length === 0) return;
    
    for (const movement of recentMovements) {
      if (movement.userId === userId) continue;
      if (movement.timestamp <= lastProcessedTimestampRef.current) continue;
      lastProcessedTimestampRef.current = movement.timestamp;

      const element = state.elements[movement.elementId];
      if (!element) continue;

      if (isDraggingElement(movement.elementId)) continue;
      
      if (movement.action === "move" && movement.position) {
        board.updateElement(movement.elementId, {
          position: movement.position,
        });
      } else if (movement.action === "resize" && movement.size) {
        // Handle both sticky (size object) and label/cluster (width/height directly)
        const element = state.elements[movement.elementId];
        if (element?.type === "label") {
          board.updateElement(movement.elementId, {
            width: movement.size.width,
            height: movement.size.height,
          });
        } else {
          board.updateElement(movement.elementId, {
            size: movement.size,
          });
        }
      } else if (movement.action === "update" && movement.patch) {
        board.updateElement(movement.elementId, movement.patch);
      }
    }
  }, [recentMovements, userId, isDraggingElement]);

  // ============================================
  // Unlock elements when deselecting
  // ============================================
  useEffect(() => {
    if (!hasMapId || !userId || !elementLocks) return;
    
    // Find locks we hold that are no longer in selection
    const selectedIds = state.selectedIds;
    const ourLocks = elementLocks.filter(l => l.userId === userId);
    
    for (const lock of ourLocks) {
      if (!selectedIds.includes(lock.elementId)) {
        // We held a lock but no longer have this element selected - unlock it
        unlockElement({
          mapId: mapId as Id<"affinityMaps">,
          elementId: lock.elementId,
          userId,
        });
      }
    }
  }, [state.selectedIds, elementLocks, hasMapId, userId]);

  // Unlock all elements when user leaves the page
  useEffect(() => {
    return () => {
      if (hasMapId && userId && elementLocks) {
        const ourLocks = elementLocks.filter(l => l.userId === userId);
        for (const lock of ourLocks) {
          unlockElement({
            mapId: mapId as Id<"affinityMaps">,
            elementId: lock.elementId,
            userId,
          });
        }
      }
    };
  }, [hasMapId, userId, elementLocks]);

  // ── Context menu event handlers ─────────────────────────────────────
  useEffect(() => {
    const handleRenameSection = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      setRenameSectionId(sectionId);
    };

    const handleDuplicateSection = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      board.duplicateElement(sectionId);
    };

    window.addEventListener("renameSection", handleRenameSection);
    window.addEventListener("duplicateSection", handleDuplicateSection);

    return () => {
      window.removeEventListener("renameSection", handleRenameSection);
      window.removeEventListener("duplicateSection", handleDuplicateSection);
    };
  }, [board]);

  // ── Derived state ───────────────────────────────────────────────────
  const allStickies = Object.values(state.elements).filter(
    (el): el is StickyNoteData => el.type === "sticky"
  );

  const allClusters = Object.values(state.elements).filter(
    (el): el is ClusterLabelData => el.type === "label"
  );

  // ── Space key for pan ────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept space if typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      if (e.code === "Space" && !e.repeat && !isTyping) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't intercept space if typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      if (e.code === "Space" && !isTyping) {
        setIsSpacePressed(false);
        isPanning.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const releaseDrag = () => board.endDrag();
    window.addEventListener("pointerup", releaseDrag);
    window.addEventListener("pointercancel", releaseDrag);
    return () => {
      window.removeEventListener("pointerup", releaseDrag);
      window.removeEventListener("pointercancel", releaseDrag);
    };
  }, [board.endDrag]);

  // ── Canvas pan / zoom ────────────────────────────────────────────────────

  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart  = useRef<Position>({ x: 0, y: 0 });
  const panOrigin = useRef<Position>({ x: 0, y: 0 });

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Position => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left  - state.pan.x) / state.zoom,
        y: (screenY - rect.top   - state.pan.y) / state.zoom,
      };
    },
    [state.pan, state.zoom]
  );

  // Wheel zoom centred on cursor
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const delta  = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newZoom = Math.min(4, Math.max(0.1, state.zoom * delta));
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      board.setZoom(newZoom);
      board.setPan({
        x: mx - (mx - state.pan.x) * (newZoom / state.zoom),
        y: my - (my - state.pan.y) * (newZoom / state.zoom),
      });
    },
    [state.zoom, state.pan, board]
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Canvas pointer events ────────────────────────────────────────────────

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isMiddle   = e.button === 1;
      const isHandTool = state.activeTool === "hand";
      const isSpacePan = isSpacePressed;
      const isVotePan  = voting.isVoting && e.button === 0 && !isHandTool && !isSpacePan;

      if (isMiddle || isHandTool || isSpacePan) {
        isPanning.current = true;
        panStart.current  = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...state.pan };
        e.currentTarget.setPointerCapture(e.pointerId);
        
        if (isSpacePan) {
          document.body.style.cursor = "grabbing";
        }
        return;
      }

      const target = e.target as HTMLElement;
      const isCanvasClick = target === canvasRef.current || target.closest(".lasso-area");
      if (!isCanvasClick) return;

      if (isVotePan) {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...state.pan };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Cluster tool - create ONE cluster
      if (state.activeTool === "cluster") {
        debugLog("Cluster click detected, activeTool:", state.activeTool);
        const pos = screenToCanvas(e.clientX, e.clientY);
        debugLog("Canvas position:", pos);

        // Guard: prevent duplicate creation within 500ms at same position
        const now = Date.now();
        const guard = clusterCreationGuardRef.current;
        if (guard &&
            now - guard.timestamp < 500 &&
            Math.abs(guard.position.x - pos.x) < 10 &&
            Math.abs(guard.position.y - pos.y) < 10) {
          debugLog("Blocked duplicate cluster creation");
          return;
        }
        clusterCreationGuardRef.current = { timestamp: now, position: pos };

        debugLog("Calling addClusterLabel...");
        const clusterId = board.addClusterLabel(
          { x: pos.x - PACKET_EMPTY.width / 2, y: pos.y - PACKET_EMPTY.height / 2 },
          PACKET_EMPTY
        );
        debugLog("Created cluster:", clusterId);
        safeLogActivity("section_created", clusterId, "Untitled");
        board.setTool("select");
        debugLog("Cluster creation complete");
        return;
      }

      // Label tool
      if (state.activeTool === "label") {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const labelId = board.addClusterLabel({ x: pos.x, y: pos.y });
        safeLogActivity("section_created", labelId, "New Section");
        board.setTool("select");
        return;
      }

      // Note tool — pin on wall, slip, or packet
      if (isCommentToolActive) {
        if (!commentToolArmedRef.current) return;
        const pos = screenToCanvas(e.clientX, e.clientY);
        commentToolArmedRef.current = false;

        let targetId: string | undefined;
        let targetType: "sticky" | "label" | "canvas" = "canvas";
        let placeAt = pos;

        // Prefer slip under cursor, then packet
        for (const sticky of stickies) {
          const w = sticky.size?.width ?? 200;
          const h = sticky.size?.height ?? 200;
          if (
            pos.x >= sticky.position.x &&
            pos.x <= sticky.position.x + w &&
            pos.y >= sticky.position.y &&
            pos.y <= sticky.position.y + h
          ) {
            targetId = sticky.id;
            targetType = "sticky";
            placeAt = { x: sticky.position.x + w / 2, y: sticky.position.y - 14 };
            break;
          }
        }
        if (!targetId) {
          for (const label of allClusters) {
            const w = label.width ?? PACKET_EMPTY.width;
            const h = label.height ?? PACKET_EMPTY.height;
            if (
              pos.x >= label.position.x &&
              pos.x <= label.position.x + w &&
              pos.y >= label.position.y &&
              pos.y <= label.position.y + h
            ) {
              targetId = label.id;
              targetType = "label";
              placeAt = { x: label.position.x + w / 2, y: label.position.y - 14 };
              break;
            }
          }
        }

        createBubbleMutation({
          mapId: mapId as Id<"affinityMaps">,
          position: placeAt,
          targetId,
          targetType,
          createdBy: userId || "",
          createdByName: currentUserName,
        }).then((id) => {
          lastEmptyBubbleIdRef.current = id;
          setSelectedBubbleId(id);
          board.setTool("select");
          setIsCommentToolActive(false);
        }).catch(console.error);
        return;
      }

      // Sticky tool
      if (state.activeTool === "sticky" && !voting.isVoting) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        
        // Guard: prevent duplicate creation within 500ms at same position
        const now = Date.now();
        const guard = stickyCreationGuardRef.current;
        if (guard && 
            now - guard.timestamp < 500 && 
            Math.abs(guard.position.x - pos.x) < 10 && 
            Math.abs(guard.position.y - pos.y) < 10) {
          return;
        }
        stickyCreationGuardRef.current = { timestamp: now, position: pos };
        
        const stickyColor: StickyColor = "insight";
        const size = { width: 200, height: 200 };
        const stickyPos = { x: pos.x - 100, y: pos.y - 100 };
        
        const currentLabels = Object.values(state.elements).filter((el): el is ClusterLabelData => el.type === "label");
        const clusterId = findClusterAtPositionHelper(stickyPos.x, stickyPos.y, size.width, size.height, currentLabels);
        
        const stickyId = board.addStickyNote(stickyPos, stickyColor, size, currentUserName);
        safeLogActivity("sticky_created", stickyId, stickyColor);
        
        if (clusterId) {
          board.updateElement(stickyId, { clusterId });
        }
        
        if (hasMapId && mapId) {
          throttledBroadcast(stickyId, "sticky", "update", stickyPos, size, { 
            clusterId,
            color: stickyColor,
            content: "",
          });
        }
        return;
      }

      // Lasso for select/lasso tools
      const pos = screenToCanvas(e.clientX, e.clientY);
      setLassoStart(pos);
      setLassoEnd(pos);
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!e.ctrlKey && !e.metaKey) {
        board.clearSelection();
      }
    },
    [state.activeTool, state.pan, board, screenToCanvas, isSpacePressed, currentUserName, hasMapId, mapId, userId, isCommentToolActive, createBubbleMutation, voting.isVoting, stickies, allClusters]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isCommentToolActive || voting.isVoting) {
        setCursorPos({ x: e.clientX, y: e.clientY });
      }

      if (isLassoing) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setLassoEnd(pos);
        return;
      }

      if (!isPanning.current) {
        if (hasMapId && updatePresence && !voting.isVoting) {
          const pos = screenToCanvas(e.clientX, e.clientY);
          updatePresence(pos.x, pos.y, state.selectedIds);
        }
        return;
      }

      board.setPan({
        x: panOrigin.current.x + (e.clientX - panStart.current.x),
        y: panOrigin.current.y + (e.clientY - panStart.current.y),
      });
    },
    [board, isLassoing, isCommentToolActive, screenToCanvas, hasMapId, updatePresence, state.selectedIds, voting.isVoting]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isLassoing && lassoStart && lassoEnd) {
        const minX = Math.min(lassoStart.x, lassoEnd.x);
        const maxX = Math.max(lassoStart.x, lassoEnd.x);
        const minY = Math.min(lassoStart.y, lassoEnd.y);
        const maxY = Math.max(lassoStart.y, lassoEnd.y);
        
        // Only select cluster labels (no stickies)
        const allLabels = Object.values(state.elements).filter(
          (el): el is ClusterLabelData => el.type === "label"
        );
        allLabels.forEach((label) => {
          const labelX = label.position.x;
          const labelY = label.position.y;
          const lassoPadding = 100;
          const intersects = 
            labelX >= minX - lassoPadding && 
            labelX <= maxX + lassoPadding &&
            labelY >= minY - lassoPadding && 
            labelY <= maxY + lassoPadding;
          
          if (intersects) {
            board.selectElement(label.id, true);
          }
        });
      }
      
      setLassoStart(null);
      setLassoEnd(null);
      isPanning.current = false;
    },
    [isLassoing, lassoStart, lassoEnd, state.elements, board]
  );

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const cmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === "Escape" && tapePeek) {
        e.preventDefault();
        setTapePeek(null);
        return;
      }

      if (e.key === "Escape" && castPeek) {
        e.preventDefault();
        setCastPeek(null);
        setCastPeekAnchor(null);
        return;
      }

      if (!cmd && !e.altKey && e.key === "/") {
        if (isPresentationModeActive) return;
        e.preventDefault();
        setFindOpen(true);
        return;
      }

      if (cmd && e.key === "s") {
        e.preventDefault();
        flushSave(state.elements);
        toast.success("Wall saved");
        return;
      }

      if (cmd && key === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (voting.isVoting && lastVoteRef.current.length > 0) {
          const lastClusterId = lastVoteRef.current.pop();
          if (lastClusterId) {
            void voting.toggleVote(lastClusterId, { x: 0, y: 0 });
          }
          return;
        }
        if (lastEmptyBubbleIdRef.current) {
          const emptyId = lastEmptyBubbleIdRef.current;
          lastEmptyBubbleIdRef.current = null;
          deleteBubbleMutation({ bubbleId: emptyId as Id<"commentBubbles"> });
          if (selectedBubbleId === emptyId) setSelectedBubbleId(null);
          return;
        }
        persistUndo();
        return;
      }
      if (cmd && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        e.stopPropagation();
        persistRedo();
        return;
      }

      if (cmd && key === "d") {
        e.preventDefault();
        board.beginHistoryBatch();
        state.selectedIds.forEach((id) => board.duplicateElement(id));
        board.endHistoryBatch();
        return;
      }

      if (cmd && e.key === "g") {
        e.preventDefault();
        board.groupSelectedIntoSection();
        return;
      }

      if (cmd && e.key === "a") {
        e.preventDefault();
        if (e.shiftKey) {
          allStickies.forEach((sticky, i) => board.selectElement(sticky.id, i > 0));
        } else {
          allClusters.forEach((cluster, i) => board.selectElement(cluster.id, i > 0));
        }
        return;
      }

      if (cmd && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        board.setZoom(Math.min(4, state.zoom * 1.15));
        return;
      }
      if (cmd && e.key === "-") {
        e.preventDefault();
        board.setZoom(Math.max(0.1, state.zoom / 1.15));
        return;
      }
      if (cmd && e.key === "0") {
        e.preventDefault();
        board.setZoom(1);
        return;
      }

      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (arrowKeys.includes(e.key) && state.selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        switch (e.key) {
          case "ArrowUp": dy = -step; break;
          case "ArrowDown": dy = step; break;
          case "ArrowLeft": dx = -step; break;
          case "ArrowRight": dx = step; break;
        }

        const selectedElements = state.selectedIds
          .map((id) => state.elements[id])
          .filter((el) => el && (el.type === "sticky" || el.type === "label"));

        const patches: { id: string; patch: ElementPatch }[] = selectedElements.map((el) => ({
          id: el.id,
          patch: {
            position: {
              x: el.position.x + dx,
              y: el.position.y + dy,
            },
          },
        }));

        if (patches.length > 0) {
          board.updateMany(patches);
          if (hasMapId) {
            patches.forEach(({ id, patch }) => {
              const element = state.elements[id];
              if (element?.type === "sticky") {
                throttledBroadcast(id, "sticky", "move", patch.position as Position);
              } else if (element?.type === "label") {
                throttledBroadcast(id, "label", "move", patch.position as Position);
              }
            });
          }
        }
        return;
      }

      if (!cmd && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "l":
            board.setTool("select");
            commentToolArmedRef.current = false;
            setIsCommentToolActive(false);
            return;
          case "h":
            board.setTool("hand");
            commentToolArmedRef.current = false;
            setIsCommentToolActive(false);
            return;
          case "c":
          case "f":
            board.setTool("cluster");
            commentToolArmedRef.current = false;
            setIsCommentToolActive(false);
            return;
          case "n":
            board.setTool("select");
            setIsCommentToolActive((v) => {
              const next = !v;
              commentToolArmedRef.current = next;
              return next;
            });
            return;
          case "v":
            setVotingConfigTrigger((prev) => prev + 1);
            return;
        }
      }

      switch (e.key) {
        case "F2":
          if (state.selectedIds.length === 1) {
            const selectedEl = state.elements[state.selectedIds[0]];
            if (selectedEl?.type === "section" || selectedEl?.type === "label") {
              e.preventDefault();
              setRenameSectionId(state.selectedIds[0]);
            }
          }
          break;
        case "Escape":
          if (selectedBubbleId) {
            break;
          }
          if (isCommentToolActive) {
            commentToolArmedRef.current = false;
            setIsCommentToolActive(false);
            board.setTool("select");
            break;
          }
          board.setTool("select");
          board.clearSelection();
          setShowStickyPicker(false);
          setShowAIGroupingPanel(false);
          setTapePeek(null);
          break;
        case "Backspace":
        case "Delete":
          board.beginHistoryBatch();
          state.selectedIds.forEach((id) => {
            const element = state.elements[id];
            if (element) {
              if (hasMapId && mapId) {
                try {
                  if (element.type === "sticky") {
                    logActivity({
                      mapId: mapId as Id<"affinityMaps">,
                      action: "sticky_deleted",
                      targetId: id,
                      targetName: (element as StickyNoteData).source || "sticky",
                    });
                  } else if (element.type === "label") {
                    logActivity({
                      mapId: mapId as Id<"affinityMaps">,
                      action: "group_deleted",
                      targetId: id,
                      targetName: (element as ClusterLabelData).text || "label",
                    });
                  }
                } catch (err) {
                  console.error("Failed to log activity:", err);
                }
              }

              if (element.type === "sticky") {
                // Move sticky to "discard" area instead of deleting
                // Also clear votes to remove blue dot
                const ungroupedAreaY = 50;
                const ungroupedAreaX = 50 + Math.random() * 200;
                board.updateElement(id, { 
                  clusterId: null, 
                  parentSectionId: null,
                  position: { x: ungroupedAreaX, y: ungroupedAreaY },
                  votes: 0,
                  votedBy: [],
                });
              } else if (element.type === "label") {
                const clusterId = id;
                const stickiesInCluster = allStickies.filter(s => s.clusterId === clusterId || s.parentSectionId === clusterId);
                board.beginHistoryBatch();
                stickiesInCluster.forEach(sticky => {
                  const ungroupedY = 50 + Math.random() * 200;
                  board.updateElement(sticky.id, { 
                    clusterId: null, 
                    parentSectionId: null,
                    position: { ...sticky.position, y: ungroupedY },
                    votes: 0,
                    votedBy: [],
                  });
                });
                deleteAndTrack(id);
                board.endHistoryBatch();
              }
            }
          });
          board.endHistoryBatch();
          break;
        case "+": board.setZoom(state.zoom * 1.15); break;
        case "-": board.setZoom(state.zoom / 1.15); break;
        case "0": board.setZoom(1); board.setPan({ x: 0, y: 0 }); break;
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [
    board,
    state.selectedIds,
    state.zoom,
    state.elements,
    allStickies,
    allClusters,
    persistUndo,
    persistRedo,
    flushSave,
    tapePeek,
    isPresentationModeActive,
    hasMapId,
    throttledBroadcast,
    setShowAIGroupingPanel,
    voting.isVoting,
    voting.toggleVote,
    isCommentToolActive,
    selectedBubbleId,
    deleteBubbleMutation,
    deleteAndTrack,
  ]);

  // ── Sort elements for rendering ──────────────────────────────────────────

  const sorted    = Object.values(state.elements).sort((a, b) => a.zIndex - b.zIndex);
  const labels    = sorted.filter((el): el is ClusterLabelData     => el.type === "label");
  // stickies already defined at top of component
  const clusterElements = labels;

  // Track previous label data to avoid unnecessary updates
  const prevLabelDataRef = useRef<string>("");

  // Compute label data for parent (memoized to avoid infinite loop)
  const labelData = useMemo(() => {
    return labels.map(label => ({
      id: label.id,
      title: label.text || "Untitled Cluster",
      insightIds: stickies
        .filter(s => s.clusterId === label.id || s.parentSectionId === label.id)
        .map(s => s.id),
      color: label.color || "#E1BEE7",
      position: label.position,
    }));
  }, [labels, stickies]);

  // Notify parent of labels change only when data actually changes
  useEffect(() => {
    const newDataStr = JSON.stringify(labelData);
    if (prevLabelDataRef.current !== newDataStr) {
      prevLabelDataRef.current = newDataStr;
      onLabelDataChange?.(labelData);
    }
  }, [labelData, onLabelDataChange]);

  // Detect when cursor is hovering over a cluster (for voting cursor scale)
  useEffect(() => {
    if (!voting.isVoting || !cursorPos) {
      setIsOverCluster(false);
      return;
    }

    const canvasX = (cursorPos.x - state.pan.x) / state.zoom;
    const canvasY = (cursorPos.y - state.pan.y) / state.zoom;

    let overCluster = false;
    for (const label of labels) {
      const clusterX = label.position.x;
      const clusterY = label.position.y;
      const clusterWidth = label.width ?? PACKET_EMPTY.width;
      const clusterHeight = label.height ?? PACKET_EMPTY.height;

      if (
        canvasX >= clusterX &&
        canvasX <= clusterX + clusterWidth &&
        canvasY >= clusterY &&
        canvasY <= clusterY + clusterHeight
      ) {
        overCluster = true;
        break;
      }
    }
    setIsOverCluster(overCluster);
  }, [cursorPos, voting.isVoting, labels, state.pan, state.zoom]);

  // Explicit clusterId-based grouping - use clusterId from sticky directly
  // Also check parentSectionId for backwards compatibility with old data
  const getStickyCluster = useCallback((sticky: StickyNoteData): string | null => {
    return sticky.clusterId ?? sticky.parentSectionId ?? null;
  }, []);

  // Ungrouped stickies - stickies not in any cluster
  const ungroupedStickies = useMemo(() => {
    return stickies.filter((s) => {
      const clusterId = getStickyCluster(s as StickyNoteData);
      return clusterId === null;
    });
  }, [stickies, getStickyCluster]);

  const sittingInsightIds = useMemo(() => {
    if (!sittingId) return null;
    return new Set(
      projectInsights
        .filter((insight) => insight.interviewId === sittingId)
        .map((insight) => insight.id)
    );
  }, [sittingId, projectInsights]);

  const trayStickies = useMemo(() => {
    if (!sittingInsightIds) return ungroupedStickies;
    return ungroupedStickies.filter(
      (sticky) => sticky.insightId && sittingInsightIds.has(sticky.insightId)
    );
  }, [ungroupedStickies, sittingInsightIds]);

  // ── Is sticky filtered function ──────────────────────────────────────
  const isStickyFiltered = useCallback((_sticky: StickyNoteData): boolean => {
    return false;
  }, []);

  // Handle creating a cluster from AI grouping suggestions
  const sortPlacedRectsRef = useRef<PacketRect[]>([]);

  useEffect(() => {
    if (showAIGroupingPanel) sortPlacedRectsRef.current = [];
  }, [showAIGroupingPanel]);

  const handleCreateClusterFromAI = useCallback((
    stickyIds: string[],
    title: string
  ) => {
    const cols = Math.min(PACKET_MAX_COLS, Math.max(1, stickyIds.length));
    const clusterWidth = packetHugWidth(stickyIds.length);
    const clusterHeight = packetHeight(stickyIds.length, cols);
    const occupied: PacketRect[] = [
      ...labels.map((label) => ({
        x: label.position.x,
        y: label.position.y,
        width: label.width ?? PACKET_EMPTY.width,
        height: label.height ?? PACKET_EMPTY.height,
      })),
      ...sortPlacedRectsRef.current,
    ];
    const origin = {
      x: -state.pan.x + 48 / state.zoom,
      y: -state.pan.y + 96 / state.zoom,
    };
    const position = findPacketSlot(
      occupied,
      { width: clusterWidth, height: clusterHeight },
      origin,
      2
    );
    sortPlacedRectsRef.current = [
      ...sortPlacedRectsRef.current,
      { ...position, width: clusterWidth, height: clusterHeight },
    ];

    board.beginHistoryBatch();
    const clusterId = board.addClusterLabel(position, { width: clusterWidth, height: clusterHeight });

    stickyIds.forEach((stickyId, index) => {
      const stickyPosition = packetSlipPosition(
        { x: position.x, y: position.y, width: clusterWidth },
        index,
        cols
      );
      const sticky = state.elements[stickyId];
      const size = (sticky && sticky.type === "sticky")
        ? (sticky as StickyNoteData).size
        : { width: SLIP_MIN_WIDTH, height: SLIP_MIN_HEIGHT };

      board.updateElement(stickyId, {
        position: stickyPosition,
        size,
        clusterId,
        parentSectionId: clusterId,
      });
    });

    board.updateElement(clusterId, { text: title });
    board.endHistoryBatch();
    safeLogActivity("ai_cluster_created", clusterId, title);
    forceSaveAfterUpdateRef.current = true;
    suppressRemoteUntilRef.current = Date.now() + 2500;
  }, [
    board,
    labels,
    state.elements,
    state.pan.x,
    state.pan.y,
    state.zoom,
  ]);

  const handleAddToClusterFromAI = useCallback((
    stickyIds: string[],
    clusterId: string
  ) => {
    const cluster = state.elements[clusterId] as ClusterLabelData | undefined;
    if (!cluster || cluster.type !== "label") return;

    const alreadyIn = stickies.filter(
      (s) => s.clusterId === clusterId || s.parentSectionId === clusterId
    );
    const width = cluster.width ?? PACKET_EMPTY.width;
    const cols = packetColumns(width, alreadyIn.length + stickyIds.length);

    board.beginHistoryBatch();
    stickyIds.forEach((stickyId, index) => {
      const position = packetSlipPosition(
        { x: cluster.position.x, y: cluster.position.y, width },
        alreadyIn.length + index,
        cols
      );
      board.updateElement(stickyId, {
        position,
        clusterId,
        parentSectionId: clusterId,
      });
    });
    board.endHistoryBatch();
    forceSaveAfterUpdateRef.current = true;
    suppressRemoteUntilRef.current = Date.now() + 2500;
  }, [board, state.elements, stickies]);

  // Vote results for ranking display (using voting hook)
  const voteResults = useMemo(() => {
    if (!voting.session || voting.session.isActive) return [];
    return labels
      .map(label => {
        const clusterVotes = voting.getClusterVotes(label.id);
        return {
          sectionId: label.id,
          title: label.text || "Untitled Cluster",
          voteCount: clusterVotes.length,
          colors: clusterVotes.map((v: { color: string }) => v.color),
        };
      })
      .filter(r => r.voteCount > 0)
      .sort((a, b) => b.voteCount - a.voteCount);
  }, [labels, voting.session, voting]);

  const castPackets = useMemo(
    () =>
      labels.map((label) => ({
        id: label.id,
        title: label.text || "",
        slips: stickies
          .filter((sticky) => sticky.clusterId === label.id || sticky.parentSectionId === label.id)
          .map((sticky) => ({
            id: sticky.id,
            text: sticky.content || "",
            type: slipKindOf(sticky.color, sticky.source),
          })),
      })),
    [labels, stickies]
  );

  const selectedPacketIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of state.selectedIds) {
      const element = state.elements[id];
      if (!element) continue;
      if (element.type === "label") ids.add(element.id);
      if (element.type === "sticky") {
        const sticky = element as StickyNoteData;
        if (sticky.clusterId) ids.add(sticky.clusterId);
        else if (sticky.parentSectionId) ids.add(sticky.parentSectionId);
      }
    }
    return Array.from(ids);
  }, [state.selectedIds, state.elements]);

  const CAST_CARD_W = 200;
  const CAST_CARD_H = 72;
  const CAST_GAP = 20;

  const castSpawnPosition = useMemo(() => {
    const seedIds = new Set<string>();
    if (castSeedPacketId) seedIds.add(castSeedPacketId);
    for (const id of selectedPacketIds) seedIds.add(id);

    const related =
      seedIds.size > 0
        ? labels.filter((label) => seedIds.has(label.id))
        : labels;

    if (related.length === 0) {
      return {
        x: -state.pan.x + 280,
        y: -state.pan.y + 200,
      };
    }

    let maxRight = -Infinity;
    let minTop = Infinity;
    let maxBottom = -Infinity;
    for (const label of related) {
      const w = label.width ?? 280;
      const h = label.height ?? 200;
      maxRight = Math.max(maxRight, label.position.x + w);
      minTop = Math.min(minTop, label.position.y);
      maxBottom = Math.max(maxBottom, label.position.y + h);
    }

    // Cast lane to the right of the packet liasse — not on top of clusters.
    let x = maxRight + CAST_GAP + 16;
    let y = minTop;

    const occupied = (savedCasts ?? [])
      .map((persona) => {
        const override = castPositionOverrides[persona._id];
        return override ?? persona.wallPosition ?? null;
      })
      .filter((p): p is { x: number; y: number } => p !== null);

    const overlaps = (px: number, py: number) =>
      occupied.some(
        (o) =>
          Math.abs(o.x - px) < CAST_CARD_W + 8 &&
          Math.abs(o.y - py) < CAST_CARD_H + 8
      );

    let guard = 0;
    while (overlaps(x, y) && guard < 24) {
      y += CAST_CARD_H + CAST_GAP;
      if (y > maxBottom + 40) {
        x += CAST_CARD_W + CAST_GAP;
        y = minTop;
      }
      guard += 1;
    }

    return { x, y };
  }, [
    castSeedPacketId,
    labels,
    selectedPacketIds,
    state.pan.x,
    state.pan.y,
    savedCasts,
    castPositionOverrides,
  ]);

  const canvasToScreenRect = useCallback(
    (canvasPos: { x: number; y: number }, w = CAST_CARD_W, h = CAST_CARD_H): CastPeekAnchor => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const left = (rect?.left ?? 0) + state.pan.x + canvasPos.x * state.zoom;
      const top = (rect?.top ?? 0) + state.pan.y + canvasPos.y * state.zoom;
      return {
        left,
        top,
        width: w * state.zoom,
        height: h * state.zoom,
      };
    },
    [state.pan.x, state.pan.y, state.zoom]
  );

  const wallCasts = useMemo(() => {
    return (savedCasts ?? []).map((persona, index) => {
      const override = castPositionOverrides[persona._id];
      let position = override ?? persona.wallPosition ?? null;
      if (!position) {
        const packetIds = persona.basedOn?.packetIds ?? [];
        const linked = labels.filter(
          (label) =>
            packetIds.includes(label.id) ||
            (persona.basedOn?.groupTitles ?? []).some(
              (title) =>
                title.trim().toLowerCase() === (label.text ?? "").trim().toLowerCase()
            )
        );
        if (linked.length > 0) {
          let maxRight = -Infinity;
          let minTop = Infinity;
          for (const label of linked) {
            maxRight = Math.max(maxRight, label.position.x + (label.width ?? 280));
            minTop = Math.min(minTop, label.position.y);
          }
          position = {
            x: maxRight + CAST_GAP + 16,
            y: minTop + index * (CAST_CARD_H + CAST_GAP),
          };
        } else {
          position = {
            x: 200 + (index % 4) * (CAST_CARD_W + CAST_GAP),
            y: 160 + Math.floor(index / 4) * (CAST_CARD_H + CAST_GAP),
          };
        }
      }
      return {
        id: persona._id,
        name: persona.name,
        occupation: persona.occupation,
        profileImage: resolveCastAvatar(
          persona.name,
          persona.profileImage,
          persona.gender
        ),
        position,
      };
    });
  }, [savedCasts, labels, castPositionOverrides]);

  const voteWinnerIds = useMemo(
    () => voteResults.slice(0, 3).map((result) => result.sectionId),
    [voteResults]
  );

  const cursorStyle =
    (voting.isVoting && (isSpacePressed || state.activeTool === "hand"))
      ? "cursor-grab"
      : voting.isVoting
        ? "cursor-none"
    : state.activeTool === "hand"    ? "cursor-grab"
    : state.activeTool === "sticky"  ? "cursor-crosshair"
    : state.activeTool === "section" ? "cursor-crosshair"
    : state.activeTool === "label"  ? "cursor-crosshair"
    : isCommentToolActive ? "cursor-pointer"
    : isSpacePressed ? "cursor-grab"
    : "cursor-default";

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none flex bg-dot-pattern"
      style={{ fontFamily: "inherit", ...style }}
    >
      {/* ── Insights Sidebar ── */}
      {showInsightsSidebar && !isPresentationModeActive && (
        <InsightsSidebar
          ungroupedStickies={trayStickies}
          onCreateSticky={(content, color) => {
            const size = { width: 160, height: 120 };
            const position = { x: 100, y: 100 };
            const stickyId = board.addStickyNote(position, color, size, currentUserName);
            board.updateElement(stickyId, { content });
            safeLogActivity("sticky_created", stickyId, color);
            return stickyId;
          }}
          onDragStart={(sticky) => {
            setDraggingStickyId(sticky.id);
          }}
          onDragEnd={() => setDraggingStickyId(null)}
          sittingFilter={Boolean(sittingId)}
          draggingStickyId={draggingStickyId}
          currentUserId={userId || undefined}
          currentUserName={currentUserName}
          onSlipClick={openTapePeek}
          onDeleteSticky={(stickyId) => {
            deleteAndTrack(stickyId);
            safeLogActivity("sticky_deleted", stickyId);
          }}
          onCleanDrafts={(stickyIds) => {
            stickyIds.forEach((id) => {
              deleteAndTrack(id);
            });
            safeLogActivity("sticky_deleted", stickyIds.join(","));
          }}
        />
      )}

      {/* Sidebar Toggle Button */}
      {!isPresentationModeActive && (
      <button
        onClick={() => setShowInsightsSidebar(!showInsightsSidebar)}
        className="absolute top-1/2 z-30 w-6 h-14 bg-card border border-l-0 border-border flex items-center justify-center hover:bg-accent transition-transform duration-150 ease-out active:scale-[0.97] -translate-y-1/2"
        style={{ left: showInsightsSidebar ? "18rem" : "0px" }}
        aria-label={showInsightsSidebar ? "Hide tray" : "Show tray"}
      >
        <svg 
          className={`w-4 h-4 text-muted-foreground transition-transform ${showInsightsSidebar ? "" : "rotate-180"}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      )}

      {/* ── AI Grouping Panel ── */}
      <AIGroupingPanel
        isOpen={showAIGroupingPanel}
        onClose={() => setShowAIGroupingPanel(false)}
        ungroupedStickies={ungroupedStickies}
        existingClusters={labels}
        projectContext={projectName ? `PROJECT NAME: ${projectName}` : undefined}
        onCreateCluster={handleCreateClusterFromAI}
        onAddToCluster={handleAddToClusterFromAI}
        onNeedConsent={() => setShowGDPRConsent(true)}
      />

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        className={`flex-1 ${cursorStyle}`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onContextMenu={(e) => {
            e.preventDefault();
            if (state.selectedIds.length > 0) {
              setContextMenu({
                position: { x: e.clientX, y: e.clientY },
              ids: state.selectedIds,
            });
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const stickyId = e.dataTransfer.getData("application/sticky-id");
          if (stickyId) {
            const pos = screenToCanvas(e.clientX, e.clientY);
            const sticky = state.elements[stickyId];

            if (sticky && sticky.type === "sticky") {
              let targetClusterId: string | null = null;

              for (const label of labels) {
                const clusterX = label.position.x;
                const clusterY = label.position.y;
                const clusterWidth = label.width ?? PACKET_EMPTY.width;
                const clusterHeight = label.height ?? PACKET_EMPTY.height;

                if (
                  pos.x >= clusterX &&
                  pos.x <= clusterX + clusterWidth &&
                  pos.y >= clusterY &&
                  pos.y <= clusterY + clusterHeight
                ) {
                  targetClusterId = label.id;
                  break;
                }
              }

              // FIX: Let the cluster handle the drop if dropped inside a cluster
              // The cluster already manages clusterId AND parentSectionId via its own onDrop
              if (!targetClusterId) {
                // Only handle if dropped outside all clusters (empty canvas)
                board.updateElement(stickyId, {
                  clusterId: null,
                  parentSectionId: null,
                });
                if (hasMapId) {
                  throttledBroadcast(stickyId, "sticky", "update", undefined, undefined, {
                    clusterId: null,
                    parentSectionId: null,
                  });
                }
              }
              // If targetClusterId is set, the cluster handles the drop via its own onDrop
              // Clear selection after drop
              board.clearSelection();
            }
          }
        }}
      >
        <CanvasGrid zoom={state.zoom} pan={state.pan} />

        <div
          className={`absolute origin-top-left lasso-area${
            isCommentToolActive ? " *:pointer-events-none" : ""
          }`}
          style={{ transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})` }}
        >
          {/* ── Remote cursors (inside transformed layer) ── */}
          {/* Hide other users' cursors during voting to avoid influencing votes */}
          {voting.isVoting ? null : otherUsers
            ?.filter((u: PresenceUser) => {
              return Date.now() - u.lastSeen < OFFLINE_THRESHOLD_MS;
            })
            .map((userData: PresenceUser) => (
              <motion.div
                key={userData.userId}
                className="absolute pointer-events-none z-50"
                style={{
                  left: userData.cursor.x,
                  top: userData.cursor.y,
                  opacity: Date.now() - userData.lastSeen > INACTIVE_THRESHOLD_MS ? 0.5 : 1,
                  transition: "opacity 0.3s ease",
                }}
              >
                <div className="flex items-center gap-2">
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    style={{ filter: `drop-shadow(0 0 3px ${userData.cursorColor || getUserColor(userData.userId)})` }}
                  >
                    <path 
                      d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.85 2.85a.5.5 0 0 0-.35-.15.5.5 0 0 0-.5.51z" 
                      fill={userData.cursorColor || getUserColor(userData.userId)}
                    />
                  </svg>
                  <span
                    className="text-xs text-white px-2 py-1 rounded shadow whitespace-nowrap"
                    style={{ backgroundColor: userData.cursorColor || getUserColor(userData.userId) }}
                  >
                    {userData.user?.name || "User"}
                  </span>
                </div>
              </motion.div>
            ))}
          {/* ── Lasso selection visual ── */}
          {lassoStart && lassoEnd && (
            <div
              className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 rounded-md"
              style={{
                left: Math.min(lassoStart.x, lassoEnd.x),
                top: Math.min(lassoStart.y, lassoEnd.y),
                width: Math.abs(lassoEnd.x - lassoStart.x),
                height: Math.abs(lassoEnd.y - lassoStart.y),
              }}
            />
          )}

          {/* ── Cluster Labels ── */}
          {labels.map((el) => {
            const isClusterDragging = draggingClusterRef.current === el.id;
            
            const clusterWidth = el.width ?? PACKET_EMPTY.width;
            const clusterHeight = el.height ?? PACKET_EMPTY.height;
            
            const stickiesInThisCluster = stickies.filter(s => 
              s.clusterId === el.id || s.parentSectionId === el.id
            );

            const clusterVotes = voting.getClusterVotes(el.id);
            const isVotingActive = voting.isVoting;
            const isVotingRevealed = voting.isRevealed;

            // Create voteUsers mapping from sessionVotes and presenceUsers
            const voteUsers = (voting.sessionVotes || [])
              .filter(v => v.targetId === el.id)
              .map(v => {
                const presenceUser = presenceUsers.find(p => p.userId === v.userId);
                const isCurrentUser = currentUser?.userId === v.userId;
                return {
                  userId: v.userId,
                  name: isCurrentUser
                    ? (currentUser.name || "You")
                    : (presenceUser?.user?.name || v.userId.split('-')[0] || "User"),
                  color: v.color,
                };
              });

            // Calculate if user has voted for this cluster
            const hasUserVotedForCluster = (voting.sessionVotes || [])
              .some(v => v.targetId === el.id && v.userId === currentUser?.userId);
            
            return (
              <ClusterLabel
                key={el.id}
                cluster={el}
                memberStickies={stickiesInThisCluster}
                zoom={state.zoom}
                isDragging={isClusterDragging}
                isDropTarget={draggingStickyId !== null}
                isLocked={getLockInfo(el.id).isLocked}
                isSelected={state.selectedIds.includes(el.id)}
                isVotingActive={isVotingActive}
                isVotingRevealed={isVotingRevealed}
                voteCount={clusterVotes.length}
                voteUsers={voteUsers}
                currentUserId={currentUser?.userId}
                currentUserColor={voting.userColor}
                currentUserName={currentUser?.name || "You"}
                hasUserVoted={hasUserVotedForCluster}
                dotsRemaining={voting.getUserVotesRemaining()}
                onVotePanStart={() => {
                  votePanOriginRef.current = { ...state.pan };
                }}
                onVotePanDelta={(dx, dy) => {
                  board.setPan({
                    x: votePanOriginRef.current.x + dx,
                    y: votePanOriginRef.current.y + dy,
                  });
                }}
                onAlsoFile={(stickyId) => {
                  const origin = stickies.find((s) => s.id === stickyId);
                  if (!origin) return;
                  const newId = board.duplicateElement(stickyId);
                  if (!newId) return;
                  board.updateElementNoHistory(newId, {
                    clusterId: null,
                    parentSectionId: null,
                    position: {
                      x: el.position.x + (el.width ?? PACKET_EMPTY.width) + 16,
                      y: el.position.y + PACKET_EMPTY.height / 4,
                    },
                  });
                  toast.success("Copy parked beside the packet");
                }}
                onClusterClick={(clusterId) => {
                  const already = voting.hasUserVotedFor(clusterId);
                  if (!already && voting.getUserVotesRemaining() <= 0) {
                    toast.error("Spent — no dots left");
                    return;
                  }
                  lastVoteRef.current.push(clusterId);
                  void voting.toggleVote(clusterId, { x: 0, y: 0 });
                }}
                onDragStart={() => {
                  draggingClusterRef.current = el.id;
                  // Store the initial position BEFORE drag starts
                  draggingClusterStartPosRef.current = { ...el.position };
                  board.startDrag();
                }}
                onDrag={() => {
                  // Visual drag handled by CSS transform in ClusterLabel
                  // Don't update state during drag - just visual position
                }}
                onDragEnd={(finalX, finalY) => {
                  board.updateElement(el.id, {
                    position: { x: finalX, y: finalY }
                  });

                  // Get the initial position (saved at drag start) to calculate correct delta
                  const startPos = draggingClusterStartPosRef.current;
                  const dx = startPos ? finalX - startPos.x : 0;
                  const dy = startPos ? finalY - startPos.y : 0;

                  // Move all stickies belonging to this cluster
                  stickies.filter(s => s.clusterId === el.id).forEach(sticky => {
                    board.updateElement(sticky.id, {
                      position: {
                        x: sticky.position.x + dx,
                        y: sticky.position.y + dy
                      }
                    });
                    if (hasMapId) {
                      throttledBroadcast(sticky.id, "sticky", "move", {
                        x: sticky.position.x + dx,
                        y: sticky.position.y + dy
                      });
                    }
                  });

                  if (hasMapId) {
                    throttledBroadcast(el.id, "label", "move", { x: finalX, y: finalY });
                  }
                  setDraggingStickyId(null);
                  draggingClusterRef.current = null;
                  draggingClusterStartPosRef.current = null;
                  board.endDrag();
                }}
                onLabelChange={(newLabel) => {
                  board.updateElement(el.id, { text: newLabel });
                  safeLogActivity("section_renamed", el.id, newLabel);
                  if (hasMapId) {
                    throttledBroadcast(el.id, "label", "update", el.position, undefined, { text: newLabel });
                  }
                }}
                onSelect={handleSelectWithLock}
                onRemoveSticky={(stickyId) => {
                  // Clear cluster association AND votes when dragging out
                  board.updateElement(stickyId, { 
                    clusterId: null, 
                    parentSectionId: null,
                    votes: 0,
                    votedBy: [],
                  });
                  if (hasMapId) {
                    throttledBroadcast(stickyId, "sticky", "update", undefined, undefined, { 
                      clusterId: null, 
                      parentSectionId: null,
                      votes: 0,
                      votedBy: [],
                    });
                  }
                }}
                onStickyClick={openTapePeek}
                onStickyUpdate={(stickyId, patch) => {
                  // Clear the lock when saving - use NO_HISTORY since this is meta
                  const lockClearPatch = {
                    ...patch,
                    editingBy: undefined,
                    editingByName: undefined,
                  };
                  // Content change goes to history, lock clear does not
                  board.updateElement(stickyId, patch); // Content to history
                  board.updateElementNoHistory(stickyId, lockClearPatch as any); // Lock clear not in history

                  if (patch.content && hasMapId) {
                    safeLogActivity("sticky_updated", stickyId, patch.content.slice(0, 30));
                  }
                  // Save immediately for lock release
                  if (hasMapId) {
                    debugLog("[LOCK_CLEAR] Saving immediately for sticky:", stickyId);
                    immediateSave(board.state.elements);
                  }
                }}
                onStickyStartEdit={(stickyId) => {
                  // Set the lock when starting to edit - NO_HISTORY (meta operation)
                  board.updateElementNoHistory(stickyId, {
                    editingBy: userId || "local-user",
                    editingByName: currentUser?.name || "You"
                  });
                  // Save immediately for lock acquisition
                  if (hasMapId) {
                    debugLog("[LOCK_ACQUIRE] Saving immediately for sticky:", stickyId, "by:", currentUser?.name);
                    immediateSave(board.state.elements);
                  }
                }}
                onDrop={(stickyId) => {
                  // Calculate position for sticky in grid
                  const stickiesInCluster = stickies.filter(s => 
                    s.clusterId === el.id || s.parentSectionId === el.id
                  );
                  const position = calculateStickyPositionInCluster(el, stickiesInCluster);
                  board.updateElement(stickyId, { 
                    clusterId: el.id, 
                    parentSectionId: el.id,
                    position 
                  });
                  safeLogActivity("sticky_moved", stickyId, `Moved to ${el.text || "cluster"}`);
                  if (hasMapId) {
                    throttledBroadcast(stickyId, "sticky", "update", undefined, undefined, { clusterId: el.id, parentSectionId: el.id });
                    forceSaveAfterUpdateRef.current = true;
                    suppressRemoteUntilRef.current = Date.now() + 2500;
                  }
                  board.clearSelection();
                  setDraggingStickyId(null);
                }}
                onContextMenu={(e, clusterId) => {
                  setClusterContextMenu({ position: { x: e.clientX, y: e.clientY }, clusterId });
                }}
                onResize={(clusterId, newHeight) => {
                  board.updateElement(clusterId, { height: newHeight });
                  if (hasMapId) {
                    const clusterEl = state.elements[clusterId] as ClusterLabelData;
                    throttledBroadcast(clusterId, "label", "resize", undefined, {
                      width: clusterEl?.width ?? PACKET_EMPTY.width,
                      height: newHeight
                    });
                  }
                }}
                onWidthChange={(clusterId, newWidth) => {
                  board.updateElement(clusterId, { width: newWidth });
                  if (hasMapId) {
                    const clusterEl = state.elements[clusterId] as ClusterLabelData;
                    throttledBroadcast(clusterId, "label", "resize", undefined, { 
                      width: newWidth, 
                      height: clusterEl?.height ?? PACKET_EMPTY.height 
                    });
                  }
                }}
                onFitFrame={handleFitFrame}
                onOpenAIRename={(clusterId) => {
                  setSelectedClusterForRename(clusterId);
                  setShowAIRenameDialog(true);
                }}
                triggerEdit={renameSectionId === el.id}
                triggerAutoFit={autoFitSectionId === el.id}
              />
            );
          })}

          {wallCasts.map((cast) => (
            <WallCast
              key={cast.id}
              cast={cast}
              zoom={state.zoom}
              canInteract={!voting.isVoting && !isPresentationModeActive}
              onOpen={(personaId, screenRect) => {
                if (castPeek?._id === personaId) {
                  setCastPeek(null);
                  setCastPeekAnchor(null);
                  return;
                }
                const persona = (savedCasts ?? []).find(
                  (entry) => entry._id === personaId
                );
                if (!persona) return;
                setCastPeekAnchor({
                  left: screenRect.left,
                  top: screenRect.top,
                  width: screenRect.width,
                  height: screenRect.height,
                });
                setCastPeek({
                  _id: persona._id,
                  name: persona.name,
                  occupation: persona.occupation,
                  quote: persona.quote,
                  goals: persona.goals,
                  frustrations: persona.frustrations,
                  profileImage: resolveCastAvatar(
                    persona.name,
                    persona.profileImage,
                    persona.gender
                  ),
                  basedOn: persona.basedOn,
                });
              }}
              onDragEnd={(personaId, position) => {
                setCastPositionOverrides((prev) => ({
                  ...prev,
                  [personaId]: position,
                }));
                void updatePersonaWallPosition({
                  personaId: personaId as Id<"personas">,
                  wallPosition: position,
                }).catch(() => toast.error("Could not move cast"));
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Cluster Context Menu ── */}
      {clusterContextMenu && (() => {
        const cluster = state.elements[clusterContextMenu.clusterId] as ClusterLabelData;
        
        return (
          <ClusterContextMenu
            isOpen={!!clusterContextMenu}
            position={clusterContextMenu.position}
            clusterId={clusterContextMenu.clusterId}
            clusterTitle={cluster?.text || "Untitled Cluster"}
            stickyTexts={stickies
              .filter(
                (s) =>
                  s.clusterId === clusterContextMenu.clusterId ||
                  s.parentSectionId === clusterContextMenu.clusterId
              )
              .map((s) => s.content || "")}
            onSuggestName={() => {
              setSelectedClusterForRename(clusterContextMenu.clusterId);
              setShowAIRenameDialog(true);
              setClusterContextMenu(null);
            }}
            onCopyQuotes={() => {
              const members = stickies.filter(
                (s) =>
                  s.clusterId === clusterContextMenu.clusterId ||
                  s.parentSectionId === clusterContextMenu.clusterId
              );
              const quotes = members
                .filter((s) => slipKindOf(s.color, s.source) === "quote")
                .map((s) => s.content.trim())
                .filter(Boolean);
              const text = (quotes.length ? quotes : members.map((s) => s.content.trim()).filter(Boolean))
                .join("\n\n");
              if (!text) {
                toast.error("No quotes in this packet");
                return;
              }
              void navigator.clipboard.writeText(text);
              toast.success("Quotes copied");
            }}
            onCopyFollowUps={() => {
              const followUps = stickies
                .filter(
                  (s) =>
                    (s.clusterId === clusterContextMenu.clusterId ||
                      s.parentSectionId === clusterContextMenu.clusterId) &&
                    slipKindOf(s.color, s.source) === "follow-up"
                )
                .map((s) => s.content.trim())
                .filter(Boolean);
              if (followUps.length === 0) {
                toast.error("No follow-ups in this packet");
                return;
              }
              void navigator.clipboard.writeText(followUps.map((line) => `• ${line}`).join("\n"));
              toast.success("Follow-ups copied");
            }}
            onCast={() => {
              openCast(clusterContextMenu.clusterId);
              setClusterContextMenu(null);
            }}
            onClose={() => setClusterContextMenu(null)}
            onRename={(newName) => {
              board.updateElement(clusterContextMenu.clusterId, { text: newName });
              toast.success(`Renamed to "${newName}"`);
              setClusterContextMenu(null);
            }}
            onDelete={() => {
              const clusterId = clusterContextMenu.clusterId;
              board.beginHistoryBatch();
              stickies.forEach(sticky => {
                if (sticky.clusterId === clusterId || sticky.parentSectionId === clusterId) {
                  const ungroupedY = 50 + Math.random() * 200;
                  board.updateElement(sticky.id, { 
                    clusterId: null, 
                    parentSectionId: null,
                    position: { ...sticky.position, y: ungroupedY }
                  });
                  if (hasMapId) {
                    throttledBroadcast(sticky.id, "sticky", "update", undefined, undefined, { 
                      clusterId: null, 
                      parentSectionId: null 
                    });
                  }
                }
              });
              
              deleteAndTrack(clusterId);
              board.endHistoryBatch();
              setClusterContextMenu(null);
            }}
          />
        );
      })()}

      {/* ── AI Rename Dialog ── */}
      {showAIRenameDialog && selectedClusterForRename && (() => {
        const cluster = state.elements[selectedClusterForRename] as ClusterLabelData;
        const clusterStickies = stickies.filter(s => s.clusterId === selectedClusterForRename);
        const stickyTexts = clusterStickies.map(s => s.content || "");
        
        return (
          <ClusterAIRename
            isOpen={showAIRenameDialog}
            onClose={() => {
              setShowAIRenameDialog(false);
              setSelectedClusterForRename(null);
            }}
            clusterId={selectedClusterForRename}
            clusterTitle={cluster?.text || "Untitled Cluster"}
            stickyTexts={stickyTexts}
            onRename={(id, newName) => {
              board.updateElement(id, { text: newName });
              toast.success(`Renamed to "${newName}"`);
              setShowAIRenameDialog(false);
              setSelectedClusterForRename(null);
            }}
            onNeedConsent={() => setShowGDPRConsent(true)}
          />
        );
      })()}

      {tapePeek && projectId && (
        <TapePeek
          projectId={projectId}
          target={tapePeek}
          onClose={() => setTapePeek(null)}
        />
      )}

      {projectId ? (
        <FindStudyDialog
          projectId={projectId as Id<"projects">}
          open={findOpen}
          onOpenChange={setFindOpen}
          trigger={null}
          onPick={(target) => {
            setTapePeek(target);
            setFindOpen(false);
          }}
        />
      ) : null}

      {projectId ? (
        <ShareProjectModal
          projectId={projectId as Id<"projects">}
          projectName={projectName}
          open={issueOpen}
          onOpenChange={setIssueOpen}
          hideTrigger
        />
      ) : null}

      {projectId && mapId ? (
        <CastDialog
          open={castOpen}
          onOpenChange={setCastOpen}
          projectId={projectId}
          mapId={mapId}
          packets={castPackets}
          selectedPacketIds={selectedPacketIds}
          voteWinnerIds={voteWinnerIds}
          seedPacketId={castSeedPacketId}
          spawnPosition={castSpawnPosition}
          projectContext={projectName ? `PROJECT: ${projectName}` : undefined}
          onNeedConsent={() => setShowGDPRConsent(true)}
          onCastCreated={(persona) => {
            setCastPeekAnchor(canvasToScreenRect(castSpawnPosition));
            setCastPeek({
              ...persona,
              profileImage: persona.profileImage,
            });
            setCastOpen(false);
          }}
        />
      ) : null}

      {castPeek ? (
        <CastPeek
          persona={castPeek}
          anchor={castPeekAnchor}
          trayOpen={showInsightsSidebar && !isPresentationModeActive}
          onClose={() => {
            setCastPeek(null);
            setCastPeekAnchor(null);
          }}
          onDelete={() => {
            const personaId = castPeek._id;
            setCastPeek(null);
            setCastPeekAnchor(null);
            setCastPositionOverrides((prev) => {
              if (!(personaId in prev)) return prev;
              const next = { ...prev };
              delete next[personaId];
              return next;
            });
            void deletePersonaMutation({
              personaId: personaId as Id<"personas">,
            })
              .then(() => {
                toast.success("Cast deleted");
              })
              .catch(() => toast.error("Could not delete"));
          }}
        />
      ) : null}

      {/* ── Toolbar ── */}
      {!isMobile && (
        <FigJamToolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
        onToolChange={board.setTool}
        onZoomIn={() => board.setZoom(state.zoom * 1.2)}
        onZoomOut={() => board.setZoom(state.zoom / 1.2)}
        onZoomReset={() => { board.setZoom(1); board.setPan({ x: 0, y: 0 }); }}
        onUndo={() => persistUndoRef.current()}
        onRedo={() => persistRedoRef.current()}
        canUndo={board.canUndo}
        canRedo={board.canRedo}
        onBack={onBack}
        ungroupedCount={ungroupedStickies.length}
        onToggleAIGroupingPanel={() => setShowAIGroupingPanel((v) => !v)}
        isCommentToolActive={isCommentToolActive}
        onToggleCommentTool={() => setIsCommentToolActive((v) => {
          const next = !v;
          commentToolArmedRef.current = next;
          return next;
        })}
        bubbleCount={commentBubbles.length + newBubbleCount}
        isPresentationModeActive={isPresentationModeActive}
        onTogglePresentationMode={() => setIsPresentationModeActive((v) => !v)}
        onOpenFind={() => setFindOpen(true)}
        onOpenCast={() => openCast()}
        onOpenIssue={() => setIssueOpen(true)}
        castCount={savedCasts?.length ?? (hasPersonas ? 1 : 0)}
        selectedCount={state.selectedIds.length}
        canvasRef={canvasRef}
        projectName={projectName}
        isVotingActive={voting.isVoting}
        onCloseSidebar={() => setShowInsightsSidebar(false)}
        presenceUsers={(otherUsers ?? []).map((u) => ({
          userId: u.userId,
          name: u.user?.name || "Teammate",
          avatar: u.user?.avatar,
        }))}
        voting={{
          ...voting,
          myVotesCount: voting.myVotesCount,
          maxDotsPerUser: voting.session?.maxDotsPerUser ?? 5,
          userColor: voting.userColor,
          remainingTime: voting.remainingTime,
          isSpent: voting.isSpent,
          roundStats: voting.roundStats,
          flipVoting: voting.flipVoting,
        }}
        voteResults={voteResults.map(r => ({
          clusterId: r.sectionId,
          title: r.title,
          voteCount: r.voteCount,
          colors: r.colors,
        }))}
        totalVotes={voteResults.reduce((sum, r) => sum + r.voteCount, 0)}
        onCreateCluster={(title) => {
          const position = {
            x: -state.pan.x + 400 + Math.random() * 100,
            y: -state.pan.y + 300 + Math.random() * 100,
          };
          const clusterId = board.addClusterLabel(position, PACKET_EMPTY);
          board.updateElement(clusterId, { text: title });
          safeLogActivity("section_created", clusterId, title);
        }}
        votingConfigTrigger={votingConfigTrigger}
      />
      )}

      {/* ── MiniMap ── */}
      <MiniMap
        clusters={clusterElements}
        viewportPosition={state.pan}
        scale={state.zoom}
        viewportSize={{ 
          width: typeof window !== "undefined" ? window.innerWidth : 1200, 
          height: typeof window !== "undefined" ? window.innerHeight : 800 
        }}
        onNavigate={(x, y) => {
          board.setPan({ 
            x: -x * state.zoom + (window.innerWidth / 2), 
            y: -y * state.zoom + (window.innerHeight / 2) 
          });
        }}
      />

      {/* ── Comment Bubbles Layer ── */}
      <CommentBubblesLayer
        bubbles={commentBubbles}
        zoom={state.zoom}
        pan={state.pan}
        selectedBubbleId={selectedBubbleId}
        onBubbleClick={(id) => {
          setSelectedBubbleId(prev => prev === id ? null : id);
          // Stop bouncing animation when bubble is opened
          if (bouncingBubbleId === id) {
            setBouncingBubbleId(null);
          }
        }}
        onBubbleDelete={(id) => {
          if (lastEmptyBubbleIdRef.current === id) {
            lastEmptyBubbleIdRef.current = null;
          }
          deleteBubbleMutation({ bubbleId: id as Id<"commentBubbles"> });
          if (selectedBubbleId === id) {
            setSelectedBubbleId(null);
          }
        }}
        onBubblePositionChange={(id, position) => {
          updateBubblePositionMutation({ 
            bubbleId: id as Id<"commentBubbles">, 
            position 
          });
        }}
        mapId={mapId || ""}
        projectId={projectId || ""}
        presenceUsers={otherUsers?.map(u => ({
          id: u.userId,
          name: u.user?.name || "User",
        })) || []}
        currentUserId={userId ?? undefined}
        currentUserName={currentUserName}
        bouncingBubbleId={bouncingBubbleId}
        onThreadBecameNonEmpty={() => {
          lastEmptyBubbleIdRef.current = null;
        }}
      />

      {/* ── Presentation Mode ── */}
      <PresentationMode
        isActive={isPresentationModeActive}
        onClose={() => setIsPresentationModeActive(false)}
        groups={labels.map((label) => ({
          id: label.id,
          title: label.text || "Untitled packet",
          position: label.position,
        }))}
        zoom={state.zoom}
        pan={state.pan}
        onZoomChange={board.setZoom}
        onPanChange={board.setPan}
      />

      {/* ── Note tool cursor (field-kit pastille) ── */}
      {isCommentToolActive && cursorPos && (
        <div
          className="fixed pointer-events-none z-[60]"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="flex h-7 w-7 items-center justify-center border border-foreground bg-card shadow-sm"
          >
            <span className="font-mono text-[11px] font-medium uppercase leading-none">
              {(currentUserName || "?").charAt(0)}
            </span>
          </motion.div>
        </div>
      )}

      {/* ── Voting Dot Cursor ── */}
      {voting.isVoting && !voting.isRevealed && cursorPos && (
        <div
          className="fixed pointer-events-none z-[60]"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{
              scale: isOverCluster && voting.getUserVotesRemaining() > 0 ? 1.15 : 1,
              opacity: 1,
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-background"
            style={{
              backgroundColor:
                voting.getUserVotesRemaining() > 0 ? voting.userColor : "transparent",
              border:
                voting.getUserVotesRemaining() > 0
                  ? "1px solid color-mix(in oklab, var(--foreground) 35%, transparent)"
                  : "2px solid var(--foreground)",
              opacity: voting.getUserVotesRemaining() > 0 ? 1 : 0.45,
            }}
          />
        </div>
      )}

      {/* ── Context Menu ── */}
      <LassoContextMenu
        selectedIds={contextMenu?.ids || []}
        position={contextMenu?.position || { x: 0, y: 0 }}
        isOpen={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        onGroup={() => {
          board.groupSelectedIntoSection();
          setContextMenu(null);
        }}
        onDelete={() => {
          const ids = contextMenu?.ids || [];
          const count = ids.length;
          confirmDelete(
            `${count} item${count > 1 ? "s" : ""}`,
            count,
            async () => {
              ids.forEach((id) => deleteAndTrack(id));
            }
          );
          setContextMenu(null);
        }}
        onDuplicate={() => {
          contextMenu?.ids.forEach(id => board.duplicateElement(id));
          setContextMenu(null);
        }}
        onComment={() => {
          if (contextMenu?.ids.length && mapId) {
            const firstId = contextMenu.ids[0];
            const element = state.elements[firstId];
            
            let targetType: "sticky" | "label" | "canvas" = "canvas";
            let elementWidth = 200;
            
            if (element?.type === "sticky") {
              targetType = "sticky";
              elementWidth = (element as StickyNoteData).size?.width || 200;
            } else if (element?.type === "label") {
              targetType = "label";
            }
            
            const pos = element 
              ? { x: element.position.x + elementWidth / 2, y: element.position.y - 30 }
              : screenToCanvas(contextMenu.position.x, contextMenu.position.y);
            
            createBubbleMutation({
              mapId: mapId as Id<"affinityMaps">,
              position: pos,
              targetId: firstId,
              targetType,
              createdBy: userId || "",
              createdByName: currentUserName,
            }).then((id) => {
              lastEmptyBubbleIdRef.current = id;
              setSelectedBubbleId(id);
            }).catch(console.error);
          }
          setContextMenu(null);
        }}
        onLabel={() => {
          const pos = screenToCanvas(contextMenu?.position.x || 0, contextMenu?.position.y || 0);
          board.addClusterLabel({ x: pos.x, y: pos.y });
          setContextMenu(null);
        }}
        onMoveToCluster={() => {
          toast.info("Move to cluster feature coming soon");
          setContextMenu(null);
        }}
      />

      {/* ── Mention Toasts ── */}
      <MentionToastProvider
        setBouncingBubbleId={setBouncingBubbleId}
      />

      {/* ── GDPR Consent Dialog ── */}
      <GDPRConsent
        operation="aiGrouping"
        onConsent={() => {
          setShowGDPRConsent(false);
          setShowAIGroupingPanel(true);
        }}
      />

    </div>
  );
}
