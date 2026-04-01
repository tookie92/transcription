"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Group, 
  Trash2, 
  Copy, 
  MessageSquare, 
  Tag, 
  ArrowRight,
  ZoomIn,
  AlignLeft,
  MoreHorizontal,
  Edit3,
  Maximize2,
  Minimize2,
  Move,
  Palette
} from "lucide-react";

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
  submenu?: ContextMenuAction[];
  onClick?: () => void;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  actions: ContextMenuAction[];
  title?: string;
}

export function ContextMenu({ isOpen, position, onClose, actions, title }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuId, setSubmenuId] = React.useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
        setSubmenuId(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        setSubmenuId(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const renderAction = useCallback((action: ContextMenuAction, hasSubmenu: boolean) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (action.submenu) {
        setSubmenuId(action.id);
      } else if (!action.disabled) {
        action.onClick?.();
        onClose();
        setSubmenuId(null);
      }
    };

    const variantClasses = {
      default: "hover:bg-accent",
      danger: "hover:bg-red-500/10 text-red-500",
      primary: "hover:bg-primary/10 text-primary",
    };

    return (
      <button
        key={action.id}
        onClick={handleClick}
        disabled={action.disabled}
        className={`
          w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors
          ${variantClasses[action.variant || "default"]}
          ${action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <span className="w-4 h-4 flex-shrink-0">{action.icon}</span>
        <span className="flex-1 text-left">{action.label}</span>
        {action.shortcut && (
          <span className="text-xs text-muted-foreground">{action.shortcut}</span>
        )}
        {action.submenu && (
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    );
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[100] bg-card rounded-lg shadow-xl border border-border overflow-hidden min-w-[180px]"
          style={{
            left: Math.min(position.x, window.innerWidth - 200),
            top: Math.min(position.y, window.innerHeight - 300),
          }}
        >
          {title && (
            <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground">
              {title}
            </div>
          )}
          
          <div className="p-1">
            {actions.map((action) => renderAction(action, !!action.submenu))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface LassoContextMenuProps {
  selectedIds: string[];
  position: { x: number; y: number };
  onClose: () => void;
  onGroup: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComment: () => void;
  onLabel: () => void;
  onMoveToCluster: () => void;
  isOpen: boolean;
}

export function LassoContextMenu({
  selectedIds,
  position,
  onClose,
  onGroup,
  onDelete,
  onDuplicate,
  onComment,
  onLabel,
  onMoveToCluster,
  isOpen,
}: LassoContextMenuProps) {
  const actions: ContextMenuAction[] = [
    {
      id: "group",
      label: "Grouper en cluster",
      icon: <Group className="w-4 h-4" />,
      shortcut: "Ctrl+G",
      onClick: onGroup,
    },
    {
      id: "label",
      label: "Ajouter une étiquette",
      icon: <Tag className="w-4 h-4" />,
      onClick: onLabel,
    },
    {
      id: "cluster",
      label: "Déplacer vers cluster",
      icon: <AlignLeft className="w-4 h-4" />,
      onClick: onMoveToCluster,
    },
    {
      id: "comment",
      label: "Ajouter un commentaire",
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: onComment,
    },
    {
      id: "duplicate",
      label: "Dupliquer",
      icon: <Copy className="w-4 h-4" />,
      shortcut: "Ctrl+D",
      onClick: onDuplicate,
    },
    {
      id: "delete",
      label: "Supprimer",
      icon: <Trash2 className="w-4 h-4" />,
      shortcut: "Del",
      variant: "danger",
      onClick: onDelete,
    },
  ];

  return (
    <ContextMenu
      isOpen={isOpen}
      position={position}
      onClose={onClose}
      actions={actions}
      title={`${selectedIds.length} élément${selectedIds.length > 1 ? "s" : ""} sélectionné${selectedIds.length > 1 ? "s" : ""}`}
    />
  );
}

interface StickyContextMenuProps {
  stickyId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onChangeColor: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToCluster: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  isOpen: boolean;
}

export function StickyContextMenu({
  stickyId,
  position,
  onClose,
  onEdit,
  onChangeColor,
  onDuplicate,
  onDelete,
  onMoveToCluster,
  onBringToFront,
  onSendToBack,
  isOpen,
}: StickyContextMenuProps) {
  const actions: ContextMenuAction[] = [
    {
      id: "edit",
      label: "Modifier le texte",
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: onEdit,
    },
    {
      id: "color",
      label: "Changer la couleur",
      icon: <div className="w-4 h-4 rounded border-2 border-current" />,
      onClick: onChangeColor,
    },
    {
      id: "more",
      label: "Plus d'options",
      icon: <MoreHorizontal className="w-4 h-4" />,
      submenu: [
        {
          id: "front",
          label: "Mettre au premier plan",
          icon: <ZoomIn className="w-4 h-4" />,
          onClick: onBringToFront,
        },
        {
          id: "back",
          label: "Mettre à l'arrière",
          icon: <ZoomIn className="w-4 h-4" />,
          onClick: onSendToBack,
        },
        {
          id: "cluster-move",
          label: "Déplacer vers cluster",
          icon: <AlignLeft className="w-4 h-4" />,
          onClick: onMoveToCluster,
        },
      ],
    },
    {
      id: "duplicate",
      label: "Dupliquer",
      icon: <Copy className="w-4 h-4" />,
      shortcut: "Ctrl+D",
      onClick: onDuplicate,
    },
    {
      id: "delete",
      label: "Supprimer",
      icon: <Trash2 className="w-4 h-4" />,
      shortcut: "Del",
      variant: "danger",
      onClick: onDelete,
    },
  ];

  return (
    <ContextMenu
      isOpen={isOpen}
      position={position}
      onClose={onClose}
      actions={actions}
    />
  );
}

interface ClusterContextMenuProps {
  clusterId: string;
  clusterTitle: string;
  position: { x: number; y: number };
  onClose: () => void;
  onRename: () => void;
  onAutoFit: () => void;
  onDelete: () => void;
  onChangeColor: () => void;
  onDuplicate: () => void;
  onComment: () => void;
  isOpen: boolean;
}

export function ClusterContextMenu({
  clusterId,
  clusterTitle,
  position,
  onClose,
  onRename,
  onAutoFit,
  onDelete,
  onChangeColor,
  onDuplicate,
  onComment,
  isOpen,
}: ClusterContextMenuProps) {
  const actions: ContextMenuAction[] = [
    {
      id: "rename",
      label: "Renommer",
      icon: <Edit3 className="w-4 h-4" />,
      shortcut: "F2",
      onClick: onRename,
    },
    {
      id: "color",
      label: "Changer la couleur",
      icon: <Palette className="w-4 h-4" />,
      onClick: onChangeColor,
    },
    {
      id: "autofit",
      label: "Ajuster à la taille",
      icon: <Maximize2 className="w-4 h-4" />,
      shortcut: "Ctrl+Shift+F",
      onClick: onAutoFit,
    },
    {
      id: "move",
      label: "Déplacer les notes ici",
      icon: <Move className="w-4 h-4" />,
      onClick: () => {},
    },
    {
      id: "comment",
      label: "Ajouter un commentaire",
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: onComment,
    },
    {
      id: "duplicate",
      label: "Dupliquer",
      icon: <Copy className="w-4 h-4" />,
      shortcut: "Ctrl+D",
      onClick: onDuplicate,
    },
    {
      id: "delete",
      label: "Supprimer le cluster",
      icon: <Trash2 className="w-4 h-4" />,
      shortcut: "Del",
      variant: "danger",
      onClick: onDelete,
    },
  ];

  return (
    <ContextMenu
      isOpen={isOpen}
      position={position}
      onClose={onClose}
      actions={actions}
      title={clusterTitle}
    />
  );
}
