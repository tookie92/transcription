"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { Undo2, Trash2, AlertTriangle, GitMerge, Layers } from "lucide-react";

export interface UndoableAction {
  id: string;
  type: "delete" | "merge" | "split" | "move";
  description: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  timestamp: number;
}

interface UseConfirmationToastOptions {
  undoStackSize?: number;
}

interface UseConfirmationToastReturn {
  confirmDelete: (
    itemName: string,
    itemCount: number,
    undoAction: () => Promise<void> | void
  ) => void;
  confirmMerge: (
    groupNames: string[],
    undoAction: () => Promise<void> | void
  ) => void;
  confirmSplit: (
    groupName: string,
    undoAction: () => Promise<void> | void
  ) => void;
  showUndoToast: (
    message: string,
    action: UndoableAction
  ) => void;
  undoLastAction: () => Promise<void>;
}

export function useConfirmationToast(
  options: UseConfirmationToastOptions = {}
): UseConfirmationToastReturn {
  const { undoStackSize = 20 } = options;
  const undoStackRef = useRef<UndoableAction[]>([]);

  const pushToUndoStack = useCallback((action: UndoableAction) => {
    undoStackRef.current.unshift(action);
    if (undoStackRef.current.length > undoStackSize) {
      undoStackRef.current.pop();
    }
  }, [undoStackSize]);

  const showUndoToast = useCallback((
    message: string,
    action: UndoableAction
  ) => {
    pushToUndoStack(action);

    toast.success(message, {
      duration: 5000,
      action: {
        label: "Annuler",
        onClick: async () => {
          const currentAction = undoStackRef.current.find(a => a.id === action.id);
          if (currentAction?.undo) {
            try {
              await currentAction.undo();
              toast.info("Action annulée", {
                duration: 2000,
              });
            } catch (error) {
              console.error("Failed to undo:", error);
              toast.error("Impossible d'annuler l'action");
            }
          }
        },
      },
      icon: <Undo2 className="w-4 h-4" />,
    });
  }, [pushToUndoStack]);

  const confirmDelete = useCallback((
    itemName: string,
    itemCount: number,
    undoAction: () => Promise<void> | void
  ) => {
    const actionId = `delete-${Date.now()}`;
    
    if (itemCount === 1) {
      showUndoToast(`"${itemName}" supprimé`, {
        id: actionId,
        type: "delete",
        description: `Suppression de "${itemName}"`,
        undo: undoAction,
        timestamp: Date.now(),
      });
    } else {
      toast.warning(
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-orange-500" />
          <div>
            <p className="font-medium">{itemCount} éléments vont être supprimés</p>
            <p className="text-xs opacity-80">Cette action est irréversible</p>
          </div>
        </div>,
        {
          duration: Infinity,
          action: {
            label: "Supprimer",
            onClick: async () => {
              try {
                await undoAction();
                toast.success(`${itemCount} éléments supprimés`);
              } catch (error) {
                toast.error("Erreur lors de la suppression");
              }
            },
          },
          cancel: {
            label: "Annuler",
            onClick: () => toast.dismiss(),
          },
        }
      );
    }
  }, [showUndoToast]);

  const confirmMerge = useCallback((
    groupNames: string[],
    undoAction: () => Promise<void> | void
  ) => {
    const actionId = `merge-${Date.now()}`;
    
    toast.warning(
      <div className="flex items-center gap-3">
        <GitMerge className="w-5 h-5 text-purple-500" />
        <div>
          <p className="font-medium">Fusionner {groupNames.length} groupes ?</p>
          <p className="text-xs opacity-80">
            {groupNames.slice(0, 2).join(", ")}
            {groupNames.length > 2 ? ` et ${groupNames.length - 2} autres` : ""}
          </p>
        </div>
      </div>,
      {
        duration: Infinity,
        action: {
          label: "Fusionner",
          onClick: async () => {
            try {
              await undoAction();
              showUndoToast(`${groupNames.length} groupes fusionnés`, {
                id: actionId,
                type: "merge",
                description: `Fusion de ${groupNames.join(", ")}`,
                undo: undoAction,
                timestamp: Date.now(),
              });
            } catch (error) {
              toast.error("Erreur lors de la fusion");
            }
          },
        },
        cancel: {
          label: "Annuler",
          onClick: () => toast.dismiss(),
        },
      }
    );
  }, [showUndoToast]);

  const confirmSplit = useCallback((
    groupName: string,
    undoAction: () => Promise<void> | void
  ) => {
    const actionId = `split-${Date.now()}`;
    
    toast.warning(
      <div className="flex items-center gap-3">
        <Layers className="w-5 h-5 text-blue-500" />
        <div>
          <p className="font-medium">Diviser "{groupName}" ?</p>
          <p className="text-xs opacity-80">Le groupe sera séparé en 2</p>
        </div>
      </div>,
      {
        duration: Infinity,
        action: {
          label: "Diviser",
          onClick: async () => {
            try {
              await undoAction();
              showUndoToast(`"${groupName}" divisé en 2`, {
                id: actionId,
                type: "split",
                description: `Division de "${groupName}"`,
                undo: undoAction,
                timestamp: Date.now(),
              });
            } catch (error) {
              toast.error("Erreur lors de la division");
            }
          },
        },
        cancel: {
          label: "Annuler",
          onClick: () => toast.dismiss(),
        },
      }
    );
  }, [showUndoToast]);

  const undoLastAction = useCallback(async () => {
    const lastAction = undoStackRef.current[0];
    if (lastAction?.undo) {
      try {
        await lastAction.undo();
        toast.info("Dernière action annulée");
      } catch (error) {
        toast.error("Impossible d'annuler");
      }
    }
  }, []);

  return {
    confirmDelete,
    confirmMerge,
    confirmSplit,
    showUndoToast,
    undoLastAction,
  };
}

export function useDestructiveActionConfirm() {
  const confirmDestructive = useCallback((
    title: string,
    description: string,
    confirmLabel: string,
    onConfirm: () => Promise<void> | void
  ) => {
    toast(
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm opacity-80">{description}</p>
        </div>
      </div>,
      {
        duration: Infinity,
        action: {
          label: confirmLabel,
          onClick: async () => {
            try {
              await onConfirm();
            } catch (error) {
              toast.error("Action échouée");
            }
          },
        },
        cancel: {
          label: "Annuler",
          onClick: () => toast.dismiss(),
        },
      }
    );
  }, []);

  return { confirmDestructive };
}
