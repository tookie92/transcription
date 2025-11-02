"use client";

import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import { GroupConnection, AffinityGroup } from "@/types";

interface ConnectionsLayerProps {
  groups: AffinityGroup[];
  connections: GroupConnection[];
  onConnectionClick?: (connection: GroupConnection) => void;
}

export default function ConnectionsLayer({ 
  groups, 
  connections, 
  onConnectionClick
}: ConnectionsLayerProps) {
  
  // 🎨 Couleurs simples par type
  const getConnectionColor = (type: GroupConnection['type']) => {
    switch (type) {
      case 'hierarchy': return '#3B82F6'; // Blue
      case 'dependency': return '#10B981'; // Green
      case 'contradiction': return '#EF4444'; // Red
      case 'related': 
      default: return '#8B5CF6'; // Purple
    }
  };

  // 🎯 Trouver un groupe par son ID
  const findGroup = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {connections.map(connection => {
        const sourceGroup = findGroup(connection.sourceGroupId);
        const targetGroup = findGroup(connection.targetGroupId);
        
        if (!sourceGroup || !targetGroup) return null;

        // Positions simples des groupes
        const startX = sourceGroup.position.x + 150;
        const startY = sourceGroup.position.y + 50;
        const endX = targetGroup.position.x + 150;
        const endY = targetGroup.position.y + 50;

        const color = getConnectionColor(connection.type);
        const strokeWidth = connection.strength ? Math.max(1, connection.strength) : 2;

        return (
          <g key={connection.id}>
            {/* Ligne de connection simple */}
            <motion.path
              d={`M ${startX} ${startY} L ${endX} ${endY}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              className="cursor-pointer pointer-events-auto hover:stroke-width-4 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onConnectionClick?.(connection);
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}