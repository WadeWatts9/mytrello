"use client";

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

import List from './List';
import Card from './Card';

export type CardType = {
  id: string;
  title: string;
};

export type ListType = {
  id: string;
  title: string;
  cards: CardType[];
};

const initialData: ListType[] = [
  {
    id: "list-1",
    title: "To Do",
    cards: [
      { id: "card-1", title: "Research Next.js Trello clones" },
      { id: "card-2", title: "Setup Tailwind CSS" }
    ]
  },
  {
    id: "list-2",
    title: "Doing",
    cards: [
      { id: "card-3", title: "Building the basic UI layout" }
    ]
  },
  {
    id: "list-3",
    title: "Done",
    cards: [
      { id: "card-4", title: "Project initialization" }
    ]
  }
];

export default function Board() {
  const [lists, setLists] = useState<ListType[]>(initialData);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"list" | "card" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const listIds = lists.map((l) => l.id);

  function findValueOfCard(id: string, type: "list" | "card") {
    if (type === "list") {
      return lists.find((l) => l.id === id);
    }
    for (const list of lists) {
      const card = list.cards.find((c) => c.id === id);
      if (card) return card;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const { id } = active;
    setActiveId(id as string);
    const type = active.data.current?.type;
    if (type === "list" || type === "card") {
      setActiveType(type);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveACard = active.data.current?.type === "card";
    const isOverACard = over.data.current?.type === "card";
    const isOverAList = over.data.current?.type === "list";

    if (!isActiveACard) return;

    // Moving a card over another card
    if (isActiveACard && isOverACard) {
      setLists((lists) => {
        const activeListIndex = lists.findIndex((l) => l.cards.some((c) => c.id === activeId));
        const overListIndex = lists.findIndex((l) => l.cards.some((c) => c.id === overId));

        if (activeListIndex === -1 || overListIndex === -1) return lists;

        const activeList = lists[activeListIndex];
        const overList = lists[overListIndex];

        const activeCardIndex = activeList.cards.findIndex((c) => c.id === activeId);
        const overCardIndex = overList.cards.findIndex((c) => c.id === overId);

        if (activeListIndex === overListIndex) {
          // Same list
          const newLists = [...lists];
          newLists[activeListIndex].cards = arrayMove(activeList.cards, activeCardIndex, overCardIndex);
          return newLists;
        } else {
          // Different lists
          const newLists = [...lists];
          const [removedCard] = newLists[activeListIndex].cards.splice(activeCardIndex, 1);
          newLists[overListIndex].cards.splice(overCardIndex, 0, removedCard);
          return newLists;
        }
      });
    }

    // Moving a card over an empty list
    if (isActiveACard && isOverAList) {
      setLists((lists) => {
        const activeListIndex = lists.findIndex((l) => l.cards.some((c) => c.id === activeId));
        const overListIndex = lists.findIndex((l) => l.id === overId);

        if (activeListIndex === -1 || overListIndex === -1) return lists;

        const activeList = lists[activeListIndex];
        const activeCardIndex = activeList.cards.findIndex((c) => c.id === activeId);

        const newLists = [...lists];
        const [removedCard] = newLists[activeListIndex].cards.splice(activeCardIndex, 1);
        newLists[overListIndex].cards.push(removedCard);
        return newLists;
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setActiveType(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveAList = active.data.current?.type === "list";
    if (isActiveAList) {
      setLists((lists) => {
        const activeListIndex = lists.findIndex((l) => l.id === activeId);
        const overListIndex = lists.findIndex((l) => l.id === overId);
        return arrayMove(lists, activeListIndex, overListIndex);
      });
    }
  }

  const activeData = activeId && activeType ? findValueOfCard(activeId, activeType) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex items-start p-4 gap-4 w-max">
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            {lists.map((list) => (
              <List key={list.id} list={list} />
            ))}
          </SortableContext>
          
          {/* Add Another List */}
          <button className="w-72 shrink-0 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-colors h-fit">
            <span className="text-xl leading-none">+</span> Add another list
          </button>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeType === "list" && activeData ? (
          <List list={activeData as ListType} isOverlay />
        ) : null}
        {activeId && activeType === "card" && activeData ? (
          <Card card={activeData as CardType} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
