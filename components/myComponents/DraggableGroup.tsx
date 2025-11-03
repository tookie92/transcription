"use client";
import { PanInfo, useMotionValue } from "framer-motion";
import { useEffect, useState, useCallback, memo } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { GripVertical, Trash2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { GroupContextMenu } from "./GroupContextMenu";

interface AffinityGroup {
  id: string;
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: Id<"insights">[];
}

interface Insight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
}

interface DraggableGroupProps {
  group: AffinityGroup;
  insights: Insight[];
  scale: number;
  isHovered: boolean;
  isDragOver: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onMove: (groupId: string, position: { x: number; y: number }) => void;
  onDelete: (groupId: Id<"groupConnections">) => void; // 🆕 OBLIGATOIRE
  onSelect: (groupId: string, e: React.MouseEvent) => void;
  onTitleUpdate: (groupId: string, title: string) => void; // 🆕 OBLIGATOIRE
  onRemoveInsight: (insightId: string, groupId: string) => void; // 🆕 OBLIGATOIRE
  onDragOver: (e: React.DragEvent, groupId: string) => void; // 🆕 OBLIGATOIRE
  onDragLeave: (e: React.DragEvent) => void; // 🆕 OBLIGATOIRE
  onDrop: (e: React.DragEvent, groupId: string) => void; // 🆕 OBLIGATOIRE
  onInsightDragStart: (e: React.DragEvent, insightId: string) => void; // 🆕 OBLIGATOIRE
  onInsightDragEnd: () => void; // 🆕 OBLIGATOIRE
  selectedGroupsCount?: number;
  onRenameRequest?: (groupId: string) => void;
  onDuplicateGroup?: (groupId: string) => void;
  onCreateConnectionFromGroup?: (groupId: string) => void;
}

function DraggableGroup({
  group,
  insights,
  scale,
  isHovered,
  isDragOver,
  isSelected,
  onHover,
  onMove,
  onDelete,
  onSelect,
  onTitleUpdate,
  onRemoveInsight,
  onDragOver,
  onDragLeave,
  onDrop,
  onInsightDragStart,
  onInsightDragEnd,
  selectedGroupsCount,
  onRenameRequest,
  onDuplicateGroup,
  onCreateConnectionFromGroup,
}: DraggableGroupProps) {

  const [draggedInsightId, setDraggedInsightId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const x = useMotionValue(group.position.x);
  const y = useMotionValue(group.position.y);

  useEffect(() => {
    x.set(group.position.x);
    y.set(group.position.y);
  }, [group.position.x, group.position.y, x, y]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const finalX = group.position.x + info.offset.x;
    const finalY = group.position.y + info.offset.y;
    onMove(group.id, { x: finalX, y: finalY });
  }, [group.position.x, group.position.y, group.id, onMove]);

  const handleRemoveInsightClick = useCallback((insightId: string) => {
    return () => onRemoveInsight(insightId, group.id);
  }, [onRemoveInsight, group.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(group.id as Id<"groupConnections">);
  }, [onDelete, group.id]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRenameRequest?.(group.id);
  }, [onRenameRequest, group.id]);

  const handleGroupClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(group.id, e);
  }, [onSelect, group.id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <GroupContextMenu
      groupId={group.id}
      groupTitle={group.title}
      onRename={() => onRenameRequest?.(group.id)}
      onDelete={onDelete}
      onDuplicate={onDuplicateGroup}
      onCreateConnection={onCreateConnectionFromGroup}
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDoubleClick={handleDoubleClick}
        style={{ 
          x, 
          y,
          zIndex: isDragging ? 100 : 20
        }}
        whileHover={{ scale: 1.02 }}
        whileDrag={{ 
          scale: 1.05,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          zIndex: 50,
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className={clsx(
          "absolute bg-white rounded-xl shadow-lg border-2 min-w-80 max-w-96 pointer-events-auto cursor-grab active:cursor-grabbing",
          isSelected && "ring-2 ring-orange-400 ring-opacity-50",
          isDragOver && "border-blue-500"
        )}
        onMouseEnter={() => onHover(group.id)}
        onMouseLeave={() => onHover(null)}
        onDragOver={(e) => onDragOver(e, group.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, group.id)}
        onClick={handleGroupClick}
      >
        
        {/* Header */}
        <div 
          className="flex items-center gap-2 px-3 py-2 border-b cursor-grab active:cursor-grabbing relative"
          style={{ 
            backgroundColor: `${group.color}15`,
            borderColor: group.color 
          }}
        >
          {isSelected && (
            <div className="absolute -left-2 -top-2 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-sm" />
          )}
          
          <GripVertical size={16} style={{ color: group.color }} className="shrink-0" />

          <h3
            className="flex-1 font-semibold text-sm px-1 min-w-0 select-none"
            style={{ color: group.color }}
            onMouseDown={handleMouseDown}
          >
            {group.title}
          </h3>

          {isSelected && selectedGroupsCount && selectedGroupsCount > 1 && (
            <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
              {selectedGroupsCount}
            </span>
          )}

          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className={`p-1 rounded hover:bg-red-50 text-red-500 transition-all shrink-0 ${
              (isHovered || isSelected) ? 'opacity-100' : 'opacity-0'
            }`}
            title="Delete group"
          >
            <Trash2 size={14} />
          </motion.button>
        </div>

        {/* Insights Container */}
        <div 
          className="group-insights-container p-3 space-y-2 max-h-80 overflow-y-auto overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
        >
          {group.insightIds.map((insightId) => {
            const insight = insights.find(i => i.id === insightId);
            if (!insight) return null;

            return (
              <motion.div
                key={insightId}
                draggable
                onDragStart={(e) => onInsightDragStart(e as unknown as React.DragEvent, insightId)}
                onDragEnd={onInsightDragEnd}
                animate={{
                  scale: draggedInsightId === insightId ? 0.9 : 1,
                  opacity: draggedInsightId === insightId ? 0.5 : 1,
                  rotateZ: draggedInsightId === insightId ? 3 : 0,
                  backgroundColor: draggedInsightId === insightId ? "rgba(253, 230, 138, 0.5)" : "rgb(254, 249, 195)",
                }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="group/insight bg-yellow-50 border-l-4 border-yellow-400 rounded-r p-3 cursor-move hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
                    insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
                    insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {insight.type}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={handleRemoveInsightClick(insightId)}
                    className="opacity-0 group-hover/insight:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </motion.button>
                </div>
                <p className="text-sm text-gray-800 leading-snug line-clamp-3">
                  {insight.text}
                </p>
              </motion.div>
            );
          })}

          {group.insightIds.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <p className={`text-sm ${
                isDragOver ? 'text-blue-600 font-medium' : 'text-gray-400'
              }`}>
                {isDragOver ? '✨ Drop here!' : 'Drag insights here'}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </GroupContextMenu>
  );
}

export default memo(DraggableGroup);