// // components/DraggableDot.tsx - VERSION COMPLÈTEMENT TYPÉE

// "use client";

// import { useMotionValue, useDragControls, motion, PanInfo } from "framer-motion";
// import { useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { useState, useRef, useEffect } from "react";
// import { Vote } from "@/types";
// import { Id } from "@/convex/_generated/dataModel";

// interface DraggableDotProps {
//   vote: Vote;
//   groupId: string;
//   isMyDot: boolean;
//   onDragStart?: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
//   onDragEnd?: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
// }

// export function DraggableDot({ vote, groupId, isMyDot, onDragStart, onDragEnd }: DraggableDotProps) {
//   const [isDragging, setIsDragging] = useState(false);
//   const [position, setPosition] = useState({ x: vote.position?.x || 0, y: vote.position?.y || 0 });
//   const dragControls = useDragControls();
//   const dotRef = useRef<HTMLDivElement>(null);

//   const updateDotPosition = useMutation(api.dotVoting.updateDotPosition);
//   const moveDot = useMutation(api.dotVoting.moveDot);
//   const removeDot = useMutation(api.dotVoting.removeDot);

//   // 🎯 METTRE À JOUR LA POSITION QUAND LE VOTE CHANGE
//   useEffect(() => {
//     if (vote.position && !isDragging) {
//       setPosition(vote.position);
//     }
//   }, [vote.position, isDragging]);

//   // 🎯 GESTIONNAIRE DE DÉBUT DE DRAG - TYPES CORRECTS
//   const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
//     if (!isMyDot) return;
    
//     setIsDragging(true);
//     onDragStart?.(event, info);
    
//     // 🎯 METTRE À JOUR L'ÉTAT DE DRAG
//     updateDotPosition({
//       voteId: vote._id,
//       position,
//       isDragging: true,
//     }).catch(console.error);
//   };

//   // 🎯 GESTIONNAIRE DE FIN DE DRAG - TYPES CORRECTS
//   const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): Promise<void> => {
//     if (!isMyDot) return;
    
//     setIsDragging(false);
//     onDragEnd?.(event, info);

//     // 🎯 CALCULER LA NOUVELLE POSITION
//     const newPosition = {
//       x: position.x + info.offset.x,
//       y: position.y + info.offset.y,
//     };

//     // 🎯 DÉTECTER LE GROUPE CIBLE
//     const elements = document.elementsFromPoint(
//       window.innerWidth / 2 + newPosition.x, 
//       window.innerHeight / 2 + newPosition.y
//     );
    
//     const targetGroup = elements.find(el => el.getAttribute('data-group-id'));
    
//     if (targetGroup && targetGroup.getAttribute('data-group-id') !== groupId) {
//       // 🎯 CHANGER DE GROUPE
//       try {
//         await moveDot({
//           voteId: vote._id,
//           newGroupId: targetGroup.getAttribute('data-group-id')!,
//           newPosition: newPosition,
//         });
//         // 🎯 METTRE À JOUR LA POSITION LOCALE
//         setPosition(newPosition);
//       } catch (error) {
//         console.error("Failed to move dot to new group:", error);
//         // 🎯 REVERT POSITION EN CAS D'ERREUR
//         setPosition(vote.position || { x: 0, y: 0 });
//       }
//     } else {
//       // 🎯 METTRE À JOUR LA POSITION DANS LE MÊME GROUPE
//       try {
//         await updateDotPosition({
//           voteId: vote._id,
//           position: newPosition,
//           isDragging: false,
//         });
//         // 🎯 METTRE À JOUR LA POSITION LOCALE
//         setPosition(newPosition);
//       } catch (error) {
//         console.error("Failed to update dot position:", error);
//       }
//     }
//   };

//   // 🎯 GESTIONNAIRE PENDANT LE DRAG - TYPES CORRECTS
//   const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
//     if (!isMyDot) return;
    
//     const newPosition = {
//       x: position.x + info.delta.x,
//       y: position.y + info.delta.y,
//     };
    
//     setPosition(newPosition);
//   };

//   const handleDoubleClick = async (): Promise<void> => {
//     if (!isMyDot) return;
    
//     try {
//       await removeDot({ voteId: vote._id });
//     } catch (error) {
//       console.error("Failed to remove dot:", error);
//     }
//   };

//   if (!isMyDot && !vote.isVisible) {
//     return null;
//   }

//   return (
//     <motion.div
//       ref={dotRef}
//       drag={isMyDot}
//       dragControls={dragControls}
//       dragMomentum={false}
//       dragElastic={0}
//       onDragStart={handleDragStart}
//       onDragEnd={handleDragEnd}
//       onDrag={handleDrag}
//       dragConstraints={{
//         left: 0,
//         right: 200,
//         top: 0,
//         bottom: 80,
//       }}
//       style={{
//         x: position.x,
//         y: position.y,
//         zIndex: isDragging ? 1000 : (vote.zIndex || 1),
//       }}
//       className={`absolute cursor-grab active:cursor-grabbing ${
//         isDragging ? 'scale-110 z-50 shadow-lg' : 'hover:scale-105'
//       } transition-transform duration-200`}
//       whileDrag={{
//         scale: 1.2,
//         zIndex: 1000,
//         cursor: "grabbing",
//       }}
//       onDoubleClick={handleDoubleClick}
//     >
//       <div
//         className={`
//           rounded-full border-2 border-white shadow-md
//           ${isMyDot ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
//           ${isDragging ? 'ring-2 ring-blue-400' : ''}
//         `}
//         style={{
//           width: vote.dotSize || 24,
//           height: vote.dotSize || 24,
//           backgroundColor: vote.color,
//         }}
//         title={isMyDot ? "Drag to move • Double-click to remove" : `${vote.votes} vote(s)`}
//       />
//     </motion.div>
//   );
// }