"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface InfiniteCanvasState {
  x: number;
  y: number;
  scale: number;
}

interface InfiniteCanvasOptions {
  minScale?: number;
  maxScale?: number;
  zoomSensitivity?: number;
  initialState?: Partial<InfiniteCanvasState>;
}

interface InfiniteCanvasReturn {
  x: number;
  y: number;
  scale: number;
  isPanning: boolean;
  isZooming: boolean;
  canvasState: InfiniteCanvasState;
  setPosition: (pos: { x: number; y: number }) => void;
  setScale: (scale: number) => void;
  zoomToPoint: (clientX: number, clientY: number, delta: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: (bounds: { minX: number; minY: number; maxX: number; maxY: number }, viewportWidth: number, viewportHeight: number, padding?: number) => void;
  resetView: () => void;
  centerOnPoint: (worldX: number, worldY: number, viewportWidth: number, viewportHeight: number) => void;
  startPanning: () => void;
  stopPanning: () => void;
  screenToWorld: (screenX: number, screenY: number, canvasRect: DOMRect) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number, canvasRect: DOMRect) => { x: number; y: number };
  containerProps: {
    style: React.CSSProperties;
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void;
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  };
}

const ZOOM_STEP = 0.1;
const DEFAULT_MIN_SCALE = 0.1;
const DEFAULT_MAX_SCALE = 3;

export function useInfiniteCanvas(options: InfiniteCanvasOptions = {}): InfiniteCanvasReturn {
  const {
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    zoomSensitivity = 0.001,
    initialState = {},
  } = options;

  const [state, setState] = useState<InfiniteCanvasState>({
    x: initialState.x ?? 0,
    y: initialState.y ?? 0,
    scale: initialState.scale ?? 1,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSpacePressed = useRef(false);
  const isInputFocused = useRef(false);

  const setPosition = useCallback((pos: { x: number; y: number }) => {
    setState(s => ({ ...s, x: pos.x, y: pos.y }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setState(s => ({ ...s, scale: Math.max(minScale, Math.min(maxScale, scale)) }));
  }, [minScale, maxScale]);

  const zoomToPoint = useCallback((clientX: number, clientY: number, delta: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    setState(current => {
      const worldX = (mouseX - current.x) / current.scale;
      const worldY = (mouseY - current.y) / current.scale;
      
      const newScale = Math.max(minScale, Math.min(maxScale, current.scale * (1 - delta * zoomSensitivity)));
      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;
      
      return { x: newX, y: newY, scale: newScale };
    });
  }, [minScale, maxScale, zoomSensitivity]);

  const zoomIn = useCallback(() => {
    setState(current => ({ 
      ...current, 
      scale: Math.min(maxScale, current.scale + ZOOM_STEP) 
    }));
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setState(current => ({ 
      ...current, 
      scale: Math.max(minScale, current.scale - ZOOM_STEP) 
    }));
  }, [minScale]);

  const zoomToFit = useCallback((
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    viewportWidth: number,
    viewportHeight: number,
    padding = 50
  ) => {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    
    if (contentWidth === 0 || contentHeight === 0) {
      setState({ x: viewportWidth / 2, y: viewportHeight / 2, scale: 1 });
      return;
    }
    
    const scaleX = (viewportWidth - padding * 2) / contentWidth;
    const scaleY = (viewportHeight - padding * 2) / contentHeight;
    const newScale = Math.max(minScale, Math.min(maxScale, Math.min(scaleX, scaleY)));
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    setState({
      x: viewportWidth / 2 - centerX * newScale,
      y: viewportHeight / 2 - centerY * newScale,
      scale: newScale,
    });
  }, [minScale, maxScale]);

  const resetView = useCallback(() => {
    setState({ x: 0, y: 0, scale: 1 });
  }, []);

  const centerOnPoint = useCallback((
    worldX: number, 
    worldY: number, 
    viewportWidth: number, 
    viewportHeight: number
  ) => {
    setState(current => ({
      ...current,
      x: viewportWidth / 2 - worldX * current.scale,
      y: viewportHeight / 2 - worldY * current.scale,
    }));
  }, []);

  const startPanning = useCallback(() => setIsPanning(true), []);
  const stopPanning = useCallback(() => {
    setIsPanning(false);
    lastMousePos.current = null;
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number, canvasRect: DOMRect) => {
    const localX = screenX - canvasRect.left;
    const localY = screenY - canvasRect.top;
    return {
      x: (localX - state.x) / state.scale,
      y: (localY - state.y) / state.scale,
    };
  }, [state]);

  const worldToScreen = useCallback((worldX: number, worldY: number, canvasRect: DOMRect) => {
    return {
      x: worldX * state.scale + state.x + canvasRect.left,
      y: worldY * state.scale + state.y + canvasRect.top,
    };
  }, [state]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      setIsZooming(true);
      zoomToPoint(e.clientX, e.clientY, e.deltaY);
      setTimeout(() => setIsZooming(false), 100);
    } else {
      setState(current => ({
        ...current,
        x: current.x - e.deltaX,
        y: current.y - e.deltaY,
      }));
    }
  }, [zoomToPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed.current)) {
      e.preventDefault();
      startPanning();
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [startPanning]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && lastMousePos.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setState(current => ({
        ...current,
        x: current.x + dx,
        y: current.y + dy,
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isPanning]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      stopPanning();
    }
  }, [isPanning, stopPanning]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      stopPanning();
    }
  }, [isPanning, stopPanning]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // This will be handled by the parent component
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isInputFocused.current) {
        e.preventDefault();
        isSpacePressed.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressed.current = false;
        if (isPanning) {
          stopPanning();
        }
      }
    };

    const handleFocusChange = () => {
      const active = document.activeElement;
      isInputFocused.current = 
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("focusin", handleFocusChange);
    document.addEventListener("focusout", handleFocusChange);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("focusin", handleFocusChange);
      document.removeEventListener("focusout", handleFocusChange);
    };
  }, [isPanning, stopPanning]);

  const containerProps: {
    style: React.CSSProperties;
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void;
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  } = {
    style: {
      cursor: isSpacePressed.current 
        ? (isPanning ? "grabbing" : "grab") 
        : isPanning 
          ? "grabbing" 
          : "default",
    },
    onWheel: handleWheel,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onDoubleClick: handleDoubleClick,
    onContextMenu: handleContextMenu,
  };

  return {
    x: state.x,
    y: state.y,
    scale: state.scale,
    isPanning,
    isZooming,
    canvasState: state,
    setPosition,
    setScale,
    zoomToPoint,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetView,
    centerOnPoint,
    startPanning,
    stopPanning,
    screenToWorld,
    worldToScreen,
    containerProps,
  };
}
