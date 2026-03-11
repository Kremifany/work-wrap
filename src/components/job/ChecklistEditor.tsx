"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ChecklistItem } from "@/types";

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

// eslint-disable-next-line react-compiler/react-compiler
export default function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const [newItem, setNewItem] = useState("");

  const toggle = (index: number) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, { item: trimmed, checked: false }]);
    setNewItem("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-2">
      <ul className="check-list">
        {items.map((it, i) => (
          <li key={i} className="checklist-item group">
            <input
              type="checkbox"
              id={`cl-${i}`}
              checked={it.checked}
              onChange={() => toggle(i)}
              className="mt-0.5 shrink-0 accent-brand-600 w-4 h-4"
            />
            <label
              htmlFor={`cl-${i}`}
              className={`flex-1 text-sm cursor-pointer ${
                it.checked ? "line-through text-neutral-400" : "text-neutral-800"
              }`}
            >
              {it.item}
            </label>
            <button
              type="button"
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded text-neutral-400 hover:text-error-600 transition-colors"
              aria-label={`Remove "${it.item}"`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Add item */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add checklist item…"
          className="fp-input flex-1 text-sm"
          maxLength={200}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!newItem.trim()}
          className="btn btn-outline px-3 py-2 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span className="sr-only">Add</span>
        </button>
      </div>
    </div>
  );
}
