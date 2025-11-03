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
  
  // 🎯 Configuration des couleurs par type
  const getConnectionColor = (type: GroupConnection['type']) => {
    switch (type) {
      case 'hierarchy': return '#3B82F6'; // Blue
      case 'dependency': return '#10B981'; // Green
      case 'contradiction': return '#EF4444'; // Red
      case 'related': 
      default: return '#8B5CF6'; // Purple
    }
  };

  // 🎯 Trouver un groupe par ID
  const findGroup = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  return (
    // 🎯 SVG avec pointer-events-none global
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        zIndex: 10, // 🎯 En-dessous des groupes
      }}
    >
      {connections.map(connection => {
        const sourceGroup = findGroup(connection.sourceGroupId);
        const targetGroup = findGroup(connection.targetGroupId);
        
        // 🎯 Ignorer si groupes non trouvés
        if (!sourceGroup || !targetGroup) return null;

        // 🎯 Calcul des positions
        const startX = sourceGroup.position.x + 150;
        const startY = sourceGroup.position.y + 50;
        const endX = targetGroup.position.x + 150;
        const endY = targetGroup.position.y + 50;

        const color = getConnectionColor(connection.type);
        
        // 🎯 Épaisseur basée sur la force
        const baseWidth = 4;
        const strengthWidth = connection.strength ? connection.strength : 0;
        const strokeWidth = Math.max(baseWidth, baseWidth + strengthWidth);

        return (
          <g key={connection.id}>
            {/* 🎯 Ligne de connection CLICKABLE */}
            <motion.path
              d={`M ${startX} ${startY} L ${endX} ${endY}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round" // 🎯 Bouts arrondis
              fill="none"
              className="pointer-events-auto cursor-pointer transition-all hover:stroke-width-8" // 🎯 Seul élément interactif
              onClick={(e) => {
                e.stopPropagation();
                console.log("🔗 Connection clicked");
                onConnectionClick?.(connection);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const shouldDelete = window.confirm(
                  `Delete "${connection.label || connection.type}" connection?\n\n` +
                  `From: ${sourceGroup.title}\nTo: ${targetGroup.title}`
                );
                if (shouldDelete) {
                  // 🎯 TODO: Implémenter la suppression
                  console.log("🗑️ Delete connection:", connection.id);
                }
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}