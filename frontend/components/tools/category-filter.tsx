'use client';

import { CATEGORY_LABELS, TOOL_CATEGORIES, type ToolCategory } from '@/types/tools';

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const selectedClass = 'bg-primary-bg text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.3)]';
  const unselectedClass = 'bg-muted text-muted-foreground hover:text-foreground';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          selected === null ? selectedClass : unselectedClass
        }`}
      >
        All
      </button>
      {TOOL_CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            selected === category ? selectedClass : unselectedClass
          }`}
        >
          {CATEGORY_LABELS[category as ToolCategory]}
        </button>
      ))}
    </div>
  );
}
