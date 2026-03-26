"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type InsightType = "pain-point" | "quote" | "insight" | "follow-up";

interface InsightTypeOption {
  type: InsightType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const INSIGHT_TYPES: InsightTypeOption[] = [
  {
    type: "pain-point",
    label: "Pain Point",
    description: "User frustrations & problems",
    color: "#E53935",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        <path d="M12 2L2 22h20L12 2z" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    type: "quote",
    label: "Quote",
    description: "Notable user quotes",
    color: "#8E24AA",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
      </svg>
    ),
  },
  {
    type: "insight",
    label: "Insight",
    description: "Key observations",
    color: "#43A047",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
      </svg>
    ),
  },
  {
    type: "follow-up",
    label: "Follow-up",
    description: "Questions to explore",
    color: "#1976D2",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
      </svg>
    ),
  },
];

interface InsightTypeSelectorProps {
  selectedType?: InsightType;
  onSelect: (type: InsightType) => void;
}

export function InsightTypeSelector({ selectedType, onSelect }: InsightTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = INSIGHT_TYPES.find((t) => t.type === selectedType);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
        style={{
          borderColor: selectedOption?.color || "#e5e7eb",
          backgroundColor: selectedOption?.color ? `${selectedOption.color}15` : "white",
        }}
      >
        {selectedOption ? (
          <>
            <span style={{ color: selectedOption.color }}>{selectedOption.icon}</span>
            <span className="text-sm font-medium text-gray-700">{selectedOption.label}</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span className="text-sm text-gray-500">Insight Type</span>
          </>
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[220px]"
            >
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase tracking-wider">
                  Select Insight Type
                </p>
                {INSIGHT_TYPES.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      onSelect(option.type);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${option.color}20` }}
                    >
                      <span style={{ color: option.color }}>{option.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                    {selectedType === option.type && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={option.color}
                        strokeWidth="3"
                        className="ml-auto"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Color-coded insights help organize your research
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export { INSIGHT_TYPES };
export type { InsightTypeOption };
