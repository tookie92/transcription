"use client";

import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import { GroupConnection, AffinityGroup } from "@/types";
import { CONNECTION_TYPES } from "./AffinityCanvas";

interface ConnectionsLayerProps {
  groups: AffinityGroup[];
  connections: GroupConnection[];
  scale: number;
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
  
  const getConnectionConfig = (type: GroupConnection['type']) => {
    const config = CONNECTION_TYPES.find(t => t.value === type);
    return config || CONNECTION_TYPES[0];
  };

  // 📐 CALCUL EXACT DES POINTS SUR LES BORDS
  const calculateConnectionPath = (source: AffinityGroup, target: AffinityGroup) => {
    const GROUP_WIDTH = 300;
    const GROUP_HEIGHT = 100;
    
    const sourceCenterX = source.position.x + GROUP_WIDTH / 2;
    const sourceCenterY = source.position.y + GROUP_HEIGHT / 2;
    const targetCenterX = target.position.x + GROUP_WIDTH / 2;
    const targetCenterY = target.position.y + GROUP_HEIGHT / 2;
    
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return '';
    
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Fonction pour trouver le point exact sur le bord
    const getBorderPoint = (centerX: number, centerY: number, directionX: number, directionY: number) => {
      const halfWidth = GROUP_WIDTH / 2;
      const halfHeight = GROUP_HEIGHT / 2;
      
      // Calculer les distances jusqu'aux bords dans chaque direction
      const tRight = (halfWidth) / Math.max(directionX, 0.001);
      const tLeft = (-halfWidth) / Math.min(directionX, -0.001);
      const tBottom = (halfHeight) / Math.max(directionY, 0.001);
      const tTop = (-halfHeight) / Math.min(directionY, -0.001);
      
      // Prendre le plus petit t positif
      const t = Math.min(
        directionX > 0 ? tRight : Infinity,
        directionX < 0 ? tLeft : Infinity,
        directionY > 0 ? tBottom : Infinity,
        directionY < 0 ? tTop : Infinity
      );
      
      return {
        x: centerX + directionX * t,
        y: centerY + directionY * t
      };
    };
    
    const sourceBorder = getBorderPoint(sourceCenterX, sourceCenterY, dirX, dirY);
    const targetBorder = getBorderPoint(targetCenterX, targetCenterY, -dirX, -dirY);
    
    return `M ${sourceBorder.x} ${sourceBorder.y} L ${targetBorder.x} ${targetBorder.y}`;
  };

  const findGroup = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  const renderTemporaryConnection = () => {
    if (!connectionMode || !connectionStart || !mousePosition) return null;

    const startGroup = findGroup(connectionStart);
    if (!startGroup) return null;

    const GROUP_WIDTH = 300;
    const GROUP_HEIGHT = 100;
    const startCenterX = startGroup.position.x + GROUP_WIDTH / 2;
    const startCenterY = startGroup.position.y + GROUP_HEIGHT / 2;
    
    const dx = mousePosition.x - startCenterX;
    const dy = mousePosition.y - startCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let startBorderX = startCenterX;
    let startBorderY = startCenterY;
    
    if (distance > 0) {
      const dirX = dx / distance;
      const dirY = dy / distance;
      
      const halfWidth = GROUP_WIDTH / 2;
      const halfHeight = GROUP_HEIGHT / 2;
      
      // Même calcul que pour les connections permanentes
      const tRight = (halfWidth) / Math.max(dirX, 0.001);
      const tLeft = (-halfWidth) / Math.min(dirX, -0.001);
      const tBottom = (halfHeight) / Math.max(dirY, 0.001);
      const tTop = (-halfHeight) / Math.min(dirY, -0.001);
      
      const t = Math.min(
        dirX > 0 ? tRight : Infinity,
        dirX < 0 ? tLeft : Infinity,
        dirY > 0 ? tBottom : Infinity,
        dirY < 0 ? tTop : Infinity
      );
      
      startBorderX = startCenterX + dirX * t;
      startBorderY = startCenterY + dirY * t;
    }

    const config = getConnectionConfig(connectionMode);
    const tempPath = `M ${startBorderX} ${startBorderY} L ${mousePosition.x} ${mousePosition.y}`;

    return (
      <g>
        <path
          d={tempPath}
          stroke={config.color}
          strokeWidth={4 / scale}
          strokeDasharray="4,4"
          opacity={0.6}
          fill="none"
        />
        <circle cx={startBorderX} cy={startBorderY} r={6 / scale} fill={config.color} opacity={0.8} />
        <circle cx={mousePosition.x} cy={mousePosition.y} r={4 / scale} fill={config.color} opacity={0.6} />
      </g>
    );
  };

  return (
    <svg 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: 5,
        width: '100%',
        height: '100%'
      }}
    >
      {connections.map(connection => {
        const sourceGroup = findGroup(connection.sourceGroupId);
        const targetGroup = findGroup(connection.targetGroupId);
        
        if (!sourceGroup || !targetGroup) return null;

        const config = getConnectionConfig(connection.type);
        const pathData = calculateConnectionPath(sourceGroup, targetGroup);

        const strokeWidth = 3 / scale;
        const opacity = 0.7;
        const strokeDasharray = connection.type === 'dependency' ? '5,5' : 'none';

        return (
          <g key={connection.id}>
            {/* Zone cliquable */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={15 / scale}
              className="cursor-pointer pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                onConnectionClick?.(connection);
              }}
            />
            
            {/* Ligne visible */}
            <motion.path
              d={pathData}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              fill="none"
              stroke={config.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              opacity={opacity}
              className="pointer-events-none"
            />
          </g>
        );
      })}

      {renderTemporaryConnection()}
    </svg>
  );
}