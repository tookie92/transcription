"use client";

import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import { GroupConnection, AffinityGroup } from "@/types";

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
  
  // 🎨 COULEURS ET ICÔNES PAR TYPE DE CONNECTION
  const getConnectionConfig = (type: GroupConnection['type']) => {
    switch (type) {
      case 'hierarchy': 
        return {
          color: '#3B82F6', // Blue
          icon: '📊',
          description: 'Hierarchy - Parent/child relationship'
        };
      case 'dependency': 
        return {
          color: '#10B981', // Green
          icon: '⚡',
          description: 'Dependency - One depends on another'
        };
      case 'contradiction': 
        return {
          color: '#EF4444', // Red
          icon: '⚠️',
          description: 'Contradiction - Conflicting ideas'
        };
      case 'related': 
      default: 
        return {
          color: '#8B5CF6', // Purple
          icon: '🔗',
          description: 'Related - Connected themes'
        };
    }
  };

  // 🎨 STYLE DES LIGNES SELON LE TYPE ET LA FORCE
  const getConnectionStyle = (type: GroupConnection['type'], strength?: number) => {
    const config = getConnectionConfig(type);
    const strokeWidth = strength ? Math.max(1, strength * 0.8) : 2;
    
    return {
      stroke: config.color,
      strokeWidth: strokeWidth / scale,
      strokeDasharray: type === 'dependency' ? '5,5' : 'none',
      opacity: strength ? 0.5 + (strength * 0.1) : 0.7
    };
  };

  // 📐 CALCUL DU CHEMIN ENTRE DEUX GROUPES (COURBÉ)
  const calculateConnectionPath = (source: AffinityGroup, target: AffinityGroup) => {
    const startX = source.position.x + 150;
    const startY = source.position.y + 50;
    const endX = target.position.x + 150;
    const endY = target.position.y + 50;
    
    // 📍 Courbe de Bézier pour un rendu plus naturel
    const dx = endX - startX;
    const dy = endY - startY;
    const controlX = startX + dx * 0.5;
    const controlY1 = startY + dy * 0.5 - 50;
    const controlY2 = startY + dy * 0.5 + 50;
    
    return `M ${startX} ${startY} C ${controlX} ${controlY1}, ${controlX} ${controlY2}, ${endX} ${endY}`;
  };

  // 🎯 TROUVER UN GROUPE PAR SON ID
  const findGroup = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  // 🎯 CONNECTION TEMPORAIRE PENDANT LA CRÉATION
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
        {/* LIGNE TEMPORAIRE (pointillés animés) */}
        <motion.path
          d={tempPath}
          {...getConnectionStyle(connectionMode)}
          strokeDasharray="4,4"
          opacity={0.6}
          fill="none"
          className="pointer-events-none"
          animate={{
            strokeDashoffset: [0, -8],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* CERCLE DE DÉPART ANIMÉ */}
        <motion.circle
          cx={startX}
          cy={startY}
          r={8 / scale}
          fill={config.color}
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        
        {/* CERCLE À LA POSITION DE LA SOURIS */}
        <circle
          cx={mousePosition.x}
          cy={mousePosition.y}
          r={6 / scale}
          fill={config.color}
          opacity={0.8}
        />
        
        {/* INDICATEUR VISUEL AVEC ICÔNE */}
        {mousePosition && (
          <g>
            <rect
              x={mousePosition.x - 40}
              y={mousePosition.y - 35}
              width={80}
              height={20}
              rx={10}
              fill="white"
              stroke={config.color}
              strokeWidth={1}
              opacity={0.9}
            />
            <text
              x={mousePosition.x}
              y={mousePosition.y - 20}
              className="text-xs font-medium pointer-events-none"
              fill={config.color}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {config.icon} Connect to group
            </text>
          </g>
        )}
      </g>
    );
  };

  // 🎪 RENDU DES CONNECTIONS EXISTANTES
  return (
    <svg 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* ==================== LIGNES DE CONNECTION ==================== */}
      {connections.map(connection => {
        const sourceGroup = findGroup(connection.sourceGroupId);
        const targetGroup = findGroup(connection.targetGroupId);
        
        if (!sourceGroup || !targetGroup) return null;

        const config = getConnectionConfig(connection.type);
        const pathData = calculateConnectionPath(sourceGroup, targetGroup);

        return (
          <g key={connection.id}>
            {/* LIGNE PRINCIPALE INTERACTIVE */}
            <motion.path
              d={pathData}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ 
                duration: 0.5, 
                delay: Math.random() * 0.3,
                ease: "easeOut"
              }}
              {...getConnectionStyle(connection.type, connection.strength)}
              fill="none"
              className="cursor-pointer pointer-events-auto hover:stroke-width-4 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onConnectionClick?.(connection);
              }}
            />
            
            {/* POINT DE DÉPART */}
            <motion.circle
              cx={sourceGroup.position.x + 150}
              cy={sourceGroup.position.y + 50}
              r={6 / scale}
              fill={config.color}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            />
            
            {/* POINT D'ARRIVÉE (FLÈCHE DIRECTIONNELLE) */}
            <motion.polygon
              points={`0,0 -6,12 6,12`}
              fill={config.color}
              transform={`
                translate(${targetGroup.position.x + 150}, ${targetGroup.position.y + 50})
                rotate(${Math.atan2(
                  targetGroup.position.y - sourceGroup.position.y,
                  targetGroup.position.x - sourceGroup.position.x
                ) * 180 / Math.PI})
              `}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            />
            
            {/* LABEL DE CONNECTION (si présent) */}
            {connection.label && (
              <motion.g
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <rect
                  x={(sourceGroup.position.x + targetGroup.position.x) / 2 + 150 - 25}
                  y={(sourceGroup.position.y + targetGroup.position.y) / 2 + 50 - 10}
                  width={50}
                  height={20}
                  rx={10}
                  fill="white"
                  stroke={config.color}
                  strokeWidth={1}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectionClick?.(connection);
                  }}
                />
                <text
                  x={(sourceGroup.position.x + targetGroup.position.x) / 2 + 150}
                  y={(sourceGroup.position.y + targetGroup.position.y) / 2 + 50 + 2}
                  className="text-xs font-medium pointer-events-auto cursor-pointer"
                  fill={config.color}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectionClick?.(connection);
                  }}
                >
                  {connection.label}
                </text>
              </motion.g>
            )}
          </g>
        );
      })}

      {/* ==================== CONNECTION TEMPORAIRE ==================== */}
      {renderTemporaryConnection()}

      {/* ==================== HIGHLIGHT DES GROUPES CONNECTABLES ==================== */}
      {connectionMode && groups.map(group => {
        const isStartGroup = group.id === connectionStart;
        const canConnect = !isStartGroup && connectionStart;
        
        if (!canConnect && !isStartGroup) return null;

        const config = getConnectionConfig(connectionMode);
        
        return (
          <motion.g key={`highlight-${group.id}`}>
            {/* CERCLE EXTERNE PULSANT */}
            <motion.circle
              cx={group.position.x + 150}
              cy={group.position.y + 50}
              r={isStartGroup ? 20 : 15}
              fill={config.color}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: isStartGroup ? 0.3 : 0.2
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="pointer-events-none"
            />
            
            {/* CERCLE INTERNE */}
            <circle
              cx={group.position.x + 150}
              cy={group.position.y + 50}
              r={isStartGroup ? 12 : 8}
              fill={config.color}
              opacity={isStartGroup ? 0.8 : 0.6}
              className="pointer-events-none"
            />
            
            {/* ICÔNE POUR LE GROUPE DE DÉPART */}
            {isStartGroup && (
              <text
                x={group.position.x + 150}
                y={group.position.y + 50}
                className="text-xs font-bold pointer-events-none"
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {config.icon}
              </text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}