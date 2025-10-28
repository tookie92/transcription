"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Move, Trash2, Plus, GripVertical } from "lucide-react";
import clsx from "clsx";

interface AffinityGroup {
  id: string;
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: string[];
}

interface Insight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
}

interface AffinityCanvasProps {
  groups: AffinityGroup[];
  insights: Insight[];
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  onGroupCreate: (position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
  onInsightRemoveFromGroup?: (insightId: string, groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onManualInsightCreate: (text: string, type: Insight['type']) => void;
  onGroupTitleUpdate?: (groupId: string, title: string) => void;
}

export default function AffinityCanvas({ 
  groups, 
  insights, 
  onGroupMove, 
  onGroupCreate,
  onInsightDrop,
  onInsightRemoveFromGroup,
  onGroupDelete,
  onManualInsightCreate,
  onGroupTitleUpdate
}: AffinityCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [draggedInsight, setDraggedInsight] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  
  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [isDraggingInsight, setIsDraggingInsight] = useState<string | null>(null);

  const usedInsightIds = new Set(groups.flatMap(group => group.insightIds));
  const availableInsights = insights.filter(insight => !usedInsightIds.has(insight.id));

  // ==================== ZOOM & PAN ====================
  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.group-insights-container')) {
      return;
    }
    
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale(prev => Math.max(0.1, Math.min(3, prev + delta)));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === canvasRef.current) {
      setIsPanning(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning && e.buttons === 1) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // ==================== DRAG INSIGHT ====================
  const handleInsightDragStart = (e: React.DragEvent, insightId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', insightId);
    setDraggedInsight(insightId);
    setIsDraggingInsight(insightId);
  };

  const handleInsightDragEnd = () => {
    setDraggedInsight(null);
    setDragOverGroup(null);
    setIsDraggingInsight(null);
  };

  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroup(groupId);
  };

  const handleGroupDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverGroup(null);
    }
  };

  const handleGroupDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const insightId = e.dataTransfer.getData('text/plain');
    if (insightId) {
      onInsightDrop(insightId, groupId);
    }
    setDragOverGroup(null);
    setDraggedInsight(null);
  };

  // ==================== ACTIONS ====================
  const handleDeleteGroup = (groupId: string) => {
    onGroupDelete?.(groupId);
  };

  const handleRemoveInsight = (insightId: string, groupId: string) => {
    onInsightRemoveFromGroup?.(insightId, groupId);
  };

  const handleAddManualInsight = () => {
    if (newInsightText.trim()) {
      onManualInsightCreate(newInsightText.trim(), newInsightType);
      setNewInsightText("");
      setShowAddInsight(false);
    }
  };

  const handleTitleBlur = (groupId: string, newTitle: string) => {
    if (newTitle.trim() && onGroupTitleUpdate) {
      onGroupTitleUpdate(groupId, newTitle.trim());
    }
  };

  return (
    <div className="h-full relative bg-gray-50 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1">
          <button 
            onClick={() => setScale(s => Math.min(3, s + 0.1))}
            className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold"
          >
            +
          </button>
          <button 
            onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
            className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold"
          >
            −
          </button>
          <div className="w-12 h-8 flex items-center justify-center text-xs text-gray-600 border-l border-gray-200">
            {Math.round(scale * 100)}%
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-96 z-30 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Available:</span>
            <span className="font-semibold text-gray-900">{availableInsights.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">Groups:</span>
            <span className="font-semibold text-gray-900">{groups.length}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={(e) => {
          if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-content')) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const x = (e.clientX - rect.left - position.x) / scale;
            const y = (e.clientY - rect.top - position.y) / scale;
            onGroupCreate({ x, y });
          }
        }}
      >
        <div
          className="canvas-content absolute pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '5000px',
            height: '5000px',
          }}
        >
          {/* Grid background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Groups avec Framer Motion */}
          {groups.map((group) => (
            <DraggableGroup
              key={group.id}
              group={group}
              insights={insights}
              scale={scale}
              isHovered={hoveredGroup === group.id}
              isDragOver={dragOverGroup === group.id}
              onHover={setHoveredGroup}
              onMove={onGroupMove}
              onDelete={handleDeleteGroup}
              onTitleUpdate={handleTitleBlur}
              onRemoveInsight={handleRemoveInsight}
              onDragOver={handleGroupDragOver}
              onDragLeave={handleGroupDragLeave}
              onDrop={handleGroupDrop}
              onInsightDragStart={handleInsightDragStart}
              onInsightDragEnd={handleInsightDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Insights Panel */}
      <div className="absolute right-4 top-4 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Available Insights</h3>
            <span className="text-sm bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              {availableInsights.length}
            </span>
          </div>
          
          <button
            onClick={() => setShowAddInsight(!showAddInsight)}
            className="w-full bg-linear-to-r from-blue-500 to-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Add New Insight
          </button>

          {showAddInsight && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 space-y-2">
              <select
                value={newInsightType}
                onChange={(e) => setNewInsightType(e.target.value as Insight['type'])}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="insight">💡 Insight</option>
                <option value="pain-point">😣 Pain Point</option>
                <option value="quote">💬 Quote</option>
                <option value="follow-up">📋 Follow-up</option>
              </select>
              <textarea
                value={newInsightText}
                onChange={(e) => setNewInsightText(e.target.value)}
                placeholder="Type your insight here..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddManualInsight}
                  disabled={!newInsightText.trim()}
                  className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddInsight(false);
                    setNewInsightText("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 max-h-[500px] overflow-y-auto space-y-2">
          {availableInsights.map(insight => (
            <motion.div
              key={insight.id}
              draggable
              onDragStart={(e) => handleInsightDragStart(e as unknown as React.DragEvent, insight.id)}
              onDragEnd={handleInsightDragEnd}
              whileHover={{ scale: 1.02, y: -2 }}
              animate={{
                opacity: isDraggingInsight === insight.id ? 0.7 : 1,
                scale: isDraggingInsight === insight.id ? 0.95 : 1,
                rotate: isDraggingInsight === insight.id ? 2 : 0
              }}
              className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
                  insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
                  insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {insight.type}
                </span>
                <GripVertical size={14} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-700 leading-snug line-clamp-2">
                {insight.text}
              </p>
            </motion.div>
          ))}

          {availableInsights.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm font-medium text-gray-600">All insights organized!</p>
              <p className="text-xs text-gray-400 mt-1">Great job on your affinity mapping</p>
            </div>
          )}
        </div>
      </div>

      {draggedInsight && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
        >
          <Move size={14} />
          Drag to organize insight
        </motion.div>
      )}
    </div>
  );
}

// ==================== DRAGGABLE GROUP COMPONENT ====================
interface DraggableGroupProps {
  group: AffinityGroup;
  insights: Insight[];
  scale: number;
  isHovered: boolean;
  isDragOver: boolean;
  onHover: (id: string | null) => void;
  onMove: (groupId: string, position: { x: number; y: number }) => void;
  onDelete: (groupId: string) => void;
  onTitleUpdate: (groupId: string, title: string) => void;
  onRemoveInsight: (insightId: string, groupId: string) => void;
  onDragOver: (e: React.DragEvent, groupId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, groupId: string) => void;
  onInsightDragStart: (e: React.DragEvent, insightId: string) => void;
  onInsightDragEnd: () => void;
}

function DraggableGroup({
  group,
  insights,
  scale,
  isHovered,
  isDragOver,
  onHover,
  onMove,
  onDelete,
  onTitleUpdate,
  onRemoveInsight,
  onDragOver,
  onDragLeave,
  onDrop,
  onInsightDragStart,
  onInsightDragEnd
}: DraggableGroupProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(group.position.x);
  const y = useMotionValue(group.position.y);
  
  // Animations subtiles basées sur la vélocité
  const rotateX = useTransform(y, [-100, 0, 100], [2, 0, -2]);
  const rotateY = useTransform(x, [-100, 0, 100], [-2, 0, 2]);

  useEffect(() => {
    x.set(group.position.x);
    y.set(group.position.y);
  }, [group.position.x, group.position.y, x, y]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const finalX = group.position.x + info.offset.x / scale;
    const finalY = group.position.y + info.offset.y / scale;
    
    onMove(group.id, { x: finalX, y: finalY });
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ 
        x, 
        y,
        rotateX: isDragging ? rotateX : 0,
        rotateY: isDragging ? rotateY : 0,
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
      className={clsx("absolute bg-white rounded-xl shadow-lg border-2 min-w-80 max-w-96 pointer-events-auto cursor-grab active:cursor-grabbing", 
        isDragOver ? "border-[#3B82F6]":`border-[${group.color}]`
      )}
      
      onMouseEnter={() => onHover(group.id)}
      onMouseLeave={() => onHover(null)}
      onDragOver={(e) => onDragOver(e, group.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, group.id)}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-3 py-2 border-b cursor-grab active:cursor-grabbing"
        style={{ 
          backgroundColor: `${group.color}15`,
          borderColor: group.color 
        }}
      >
        <GripVertical size={16} style={{ color: group.color }} className="shrink-0" />

        <h3
          className="flex-1 font-semibold text-sm outline-none px-1 rounded min-w-0"
          contentEditable
          suppressContentEditableWarning
          style={{ color: group.color }}
          onBlur={(e) => onTitleUpdate(group.id, e.currentTarget.textContent || '')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {group.title}
        </h3>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(group.id);
          }}
          className={`p-1 rounded hover:bg-red-50 text-red-500 transition-all shrink-0 ${
            isHovered ? 'opacity-100' : 'opacity-0'
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
        onMouseDown={(e) => e.stopPropagation()}
      >
        {group.insightIds.map((insightId) => {
          const insight = insights.find(i => i.id === insightId);
          if (!insight) return null;

          return (
            <motion.div
              key={insightId}
              data-insight={insightId}
              draggable
              onDragStart={(e) => onInsightDragStart(e as unknown as React.DragEvent, insightId)}
              onDragEnd={onInsightDragEnd}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileDrag={{ scale: 0.95, rotate: 3, opacity: 0.7 }}
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
                  onClick={() => onRemoveInsight(insightId, group.id)}
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
  );
}