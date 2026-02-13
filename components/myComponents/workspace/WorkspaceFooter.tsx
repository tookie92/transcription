"use client";

interface WorkspaceFooterProps {
  groupCount?: number;
  insightCount?: number;
  hasMap: boolean;
}

export function WorkspaceFooter({
  groupCount,
  insightCount,
  hasMap,
}: WorkspaceFooterProps) {
  return (
    <footer className="px-4 py-2 bg-white border-t text-sm text-gray-600 flex justify-between">
      <div>
        {hasMap ? (
          <span>
            {groupCount} groups, {insightCount} insights
          </span>
        ) : (
          <span>Creating affinity map...</span>
        )}
      </div>
      <div>Drag insights to groups to organize patterns</div>
    </footer>
  );
}
