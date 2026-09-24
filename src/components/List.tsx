"use client";

import React, { useMemo } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Card from "./Card";
import { ListType } from "./Board";

interface ListProps {
  list: ListType;
  isOverlay?: boolean;
}

export default function List({ list, isOverlay }: ListProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: "list",
      list,
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
        className="w-72 bg-[#ebecf0] rounded-xl flex flex-col max-h-full shrink-0 shadow-sm opacity-30 border-2 border-blue-500"
      />
    );
  }

  const cardIds = useMemo(() => list.cards.map((c) => c.id), [list.cards]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-72 bg-[#ebecf0] rounded-xl flex flex-col max-h-full shrink-0 shadow-sm ${
        isOverlay ? "rotate-2 scale-105 shadow-xl cursor-grabbing" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="px-4 py-3 font-semibold text-[#172b4d] flex justify-between items-center cursor-grab active:cursor-grabbing"
      >
        {list.title}
        <button className="hover:bg-black/10 rounded px-2 py-1 text-gray-600">
          ...
        </button>
      </div>

      <div className="px-2 pb-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar flex flex-col gap-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {list.cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      <div className="p-2">
        <button className="w-full text-left px-2 py-1.5 text-gray-600 hover:bg-black/10 rounded flex items-center gap-2 font-medium">
          <span className="text-xl leading-none">+</span> Add a card
        </button>
      </div>
    </div>
  );
}
