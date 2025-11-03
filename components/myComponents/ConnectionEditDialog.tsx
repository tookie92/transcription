"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GroupConnection } from "@/types";
import { Id } from "@/convex/_generated/dataModel";

interface ConnectionEditDialogProps {
  connection: GroupConnection | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (connectionId: Id<"groupConnections">, updates: Partial<GroupConnection>) => void;
  onDelete: (connectionId: Id<"groupConnections">) => void;
  sourceGroupTitle?: string;
  targetGroupTitle?: string;
}

export function ConnectionEditDialog({
  connection,
  isOpen,
  onClose,
  onSave,
  onDelete,
  sourceGroupTitle,
  targetGroupTitle,
}: ConnectionEditDialogProps) {
  const [type, setType] = useState<GroupConnection['type']>('related');
  const [label, setLabel] = useState('');
  const [strength, setStrength] = useState(3);

  // Réinitialiser le form quand la connection change
  useEffect(() => {
    if (connection) {
      setType(connection.type);
      setLabel(connection.label || '');
      setStrength(connection.strength || 3);
    }
  }, [connection]);

  const handleSave = () => {
    if (!connection) return;
    
    onSave(connection.id, {
      type,
      label: label.trim() || undefined,
      strength: strength || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!connection) return;
    
    if (window.confirm('Are you sure you want to delete this connection?')) {
      onDelete(connection.id);
      onClose();
    }
  };

  if (!connection) return null;

  const connectionTypes = [
    { value: 'related', label: 'Related', icon: '🔗', description: 'Themes are related' },
    { value: 'hierarchy', label: 'Hierarchy', icon: '📊', description: 'Parent-child relationship' },
    { value: 'dependency', label: 'Dependency', icon: '⚡', description: 'One depends on another' },
    { value: 'contradiction', label: 'Contradiction', icon: '⚠️', description: 'Conflicting ideas' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Connection
          </DialogTitle>
          <DialogDescription>
            {sourceGroupTitle} → {targetGroupTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type de Connection */}
          <div className="space-y-3">
            <Label>Connection Type</Label>
            <RadioGroup value={type} onValueChange={(value: GroupConnection['type']) => setType(value)}>
              {connectionTypes.map((connType) => (
                <div key={connType.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={connType.value} id={connType.value} />
                  <Label htmlFor={connType.value} className="flex items-center gap-2 cursor-pointer">
                    <span>{connType.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{connType.label}</span>
                      <span className="text-xs text-gray-500">{connType.description}</span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Label Personnalisé */}
          <div className="space-y-2">
            <Label htmlFor="connection-label">Custom Label (Optional)</Label>
            <Input
              id="connection-label"
              placeholder="e.g., 'leads to', 'blocks', 'supports'"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Force de la Connection */}
          <div className="space-y-3">
            <Label>Connection Strength</Label>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStrength(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= strength ? 'text-yellow-500' : 'text-gray-300'
                    }`}
                  >
                    {star <= strength ? '★' : '☆'}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {strength === 1 && 'Very weak'}
                {strength === 2 && 'Weak'}
                {strength === 3 && 'Moderate'}
                {strength === 4 && 'Strong'}
                {strength === 5 && 'Very strong'}
              </span>
            </div>
          </div>

          {/* Aperçu */}
          <div className="p-3 border rounded-lg bg-gray-50">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>{connectionTypes.find(t => t.value === type)?.icon}</span>
                <span className="capitalize">{type}</span>
                {label && (
                  <>
                    <span>•</span>
                    <span className="font-medium">{`"${label}"`}</span>
                  </>
                )}
                <span>•</span>
                <span>{'★'.repeat(strength)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
          <Button
            onClick={handleSave}
            className="w-full"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}