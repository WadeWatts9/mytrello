"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardType } from "./Board";

interface CardProps {
  card: CardType;
  isOverlay?: boolean;
}

export default function Card({ card, isOverlay }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white/50 p-3 rounded-lg shadow-sm border-2 border-blue-500 opacity-30 h-[46px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:bg-gray-50 border border-gray-200 group ${
        isOverlay ? "rotate-3 scale-105 shadow-xl ring-2 ring-blue-500 cursor-grabbing" : ""
      }`}
    >
      <div className="text-[#172b4d]">{card.title}</div>
    </div>
  );
}
