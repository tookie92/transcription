// lib/errorHandler.ts

import { toast } from "sonner";

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
}

export function handleError(error: unknown, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[Error] ${context.component || 'Unknown'}:${context.action || 'unknown'}`, {
    message: errorMessage,
    stack: errorStack,
    context,
    timestamp: new Date().toISOString(),
  });

  toast.error(context.action ? `Failed to ${context.action}` : "An error occurred", {
    description: errorMessage,
    duration: 4000,
  });
}

export function handleErrorSilently(error: unknown, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
  
  console.warn(`[Warning] ${context.component || 'Unknown'}:${context.action || 'unknown'}`, {
    message: errorMessage,
    context,
    timestamp: new Date().toISOString(),
  });
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: ErrorContext
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return null;
  }
}

export function logInfo(message: string, data?: Record<string, unknown>): void {
  console.log(`[Info] ${message}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

export function logWarning(message: string, data?: Record<string, unknown>): void {
  console.warn(`[Warning] ${message}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}
