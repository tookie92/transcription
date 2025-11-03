"use client";

import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import { GroupConnection, AffinityGroup } from "@/types";
import { CONNECTION_TYPES } from "./AffinityCanvas";

interface ConnectionsLayerProps {
  groups: AffinityGroup[];
  connections: GroupConnection[];
  scale: number;
  // 🗑️ SUPPRIMER position - plus besoin
  connectionMode?: GroupConnection['type'] | null;
  connectionStart?: string | null;
  mousePosition?: { x: number; y: number } | null;
  onConnectionClick?: (connection: GroupConnection) => void;
  onConnectionDelete?: (connectionId: Id<"groupConnections">) => void;
}

export default function ConnectionsLayer({ 
  groups, 
  connections, 
  scale,
  connectionMode,
  connectionStart,
  mousePosition,
  onConnectionClick,
  onConnectionDelete
}: ConnectionsLayerProps) {
  
  // 🎨 COULEURS PAR TYPE DE CONNECTION
 const getConnectionConfig = (type: GroupConnection['type']) => {
  const config = CONNECTION_TYPES.find(t => t.value === type);
  return config || CONNECTION_TYPES[0]; // Fallback to 'related'
};

  // 🎨 STYLE DES LIGNES
  const getConnectionStyle = (type: GroupConnection['type'], strength?: number) => {
    const config = getConnectionConfig(type);
    const strokeWidth = strength ? Math.max(2, strength * 1.5) : 2;
    
    return {
      stroke: config.color,
      strokeWidth: strokeWidth / scale,
      strokeDasharray: type === 'dependency' ? '5,5' : 'none',
      opacity: strength ? 0.6 + (strength * 0.1) : 0.8
    };
  };

  // 📐 CALCUL DU CHEMIN ENTRE DEUX GROUPES (SIMPLE)
  const calculateConnectionPath = (source: AffinityGroup, target: AffinityGroup) => {
    const startX = source.position.x + 150;
    const startY = source.position.y + 50;
    const endX = target.position.x + 150;
    const endY = target.position.y + 50;
    
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  };

  // 🎯 TROUVER UN GROUPE PAR SON ID
  const findGroup = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  // 🎯 CONNECTION TEMPORAIRE
  const renderTemporaryConnection = () => {
    if (!connectionMode || !connectionStart || !mousePosition) return null;

    const startGroup = findGroup(connectionStart);
    if (!startGroup) return null;

    const startX = startGroup.position.x + 150;
    const startY = startGroup.position.y + 50;
    
    const config = getConnectionConfig(connectionMode);
    const tempPath = `M ${startX} ${startY} L ${mousePosition.x} ${mousePosition.y}`;

    return (
      <g>
        {/* LIGNE TEMPORAIRE */}
        <motion.path
          d={tempPath}
          {...getConnectionStyle(connectionMode)}
          strokeDasharray="4,4"
          opacity={0.6}
          fill="none"
        />
        
        {/* POINTS VISUELS */}
        <circle cx={startX} cy={startY} r={6 / scale} fill={config.color} opacity={0.8} />
        <circle cx={mousePosition.x} cy={mousePosition.y} r={4 / scale} fill={config.color} opacity={0.6} />
      </g>
    );
  };

  // 🎪 DEBUG: Afficher les informations de débogage
  console.log("🔗 ConnectionsLayer Debug:", {
    connectionsCount: connections.length,
    groupsCount: groups.length,
    connectionMode,
    connectionStart,
    mousePosition
  });

  // 🎪 RENDU DES CONNECTIONS
  return (
    <svg 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: 5,
        width: '100%',
        height: '100%'
      }}
    >
      {/* ==================== LIGNES DE CONNECTION ==================== */}
      {connections.map(connection => {
        const sourceGroup = findGroup(connection.sourceGroupId);
        const targetGroup = findGroup(connection.targetGroupId);
        
        if (!sourceGroup || !targetGroup) {
          console.log("❌ Connection invalide:", connection);
          return null;
        }

        console.log("✅ Rendering connection:", {
          source: sourceGroup.title,
          target: targetGroup.title,
          type: connection.type
        });

        const config = getConnectionConfig(connection.type);
        const pathData = calculateConnectionPath(sourceGroup, targetGroup);

        return (
          <g key={connection.id}>
            {/* LIGNE PRINCIPALE */}
            <motion.path
              d={pathData}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              {...getConnectionStyle(connection.type, connection.strength)}
              fill="none"
              className="cursor-pointer pointer-events-auto hover:stroke-opacity-100 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onConnectionClick?.(connection);
              }}
            />
            
            {/* POINT DE DÉPART */}
            <circle
              cx={sourceGroup.position.x + 150}
              cy={sourceGroup.position.y + 50}
              r={4 / scale}
              fill={config.color}
            />
            
            {/* POINT D'ARRIVÉE */}
            <circle
              cx={targetGroup.position.x + 150}
              cy={targetGroup.position.y + 50}
              r={4 / scale}
              fill={config.color}
            />
          </g>
        );
      })}

      {/* ==================== CONNECTION TEMPORAIRE ==================== */}
      {renderTemporaryConnection()}
    </svg>
  );
}