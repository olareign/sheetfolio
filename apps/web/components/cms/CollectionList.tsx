"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { reorderAction } from "@/app/(admin)/dashboard/actions";
import type { ListRow } from "@/content/cms";
import type { CollectionName } from "@/content/schemas";
import { Button } from "@/components/sp/Button";

type Props = {
  collection: CollectionName;
  label: string;
  singular: string;
  rows: ListRow[];
};

function Row({ row, href, selected, sortable }: { row: ListRow; href: string; selected: boolean; sortable: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !sortable,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const tone = row.status?.tone === "done" ? " sp-tag--done" : row.status?.tone === "ongoing" ? " sp-tag--ongoing" : "";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`cms-row${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}
    >
      {sortable ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="cms-drag"
          aria-label={`Reorder ${row.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ) : (
        <span className="cms-drag-spacer" />
      )}
      <Link href={href} className="cms-row-link" aria-current={selected ? "page" : undefined}>
        <span className="cms-row-no">{row.no}</span>
        <span className="cms-row-title">
          <b>{row.title}</b>
          {row.subtitle && <span>{row.subtitle}</span>}
        </span>
        <span className="cms-row-status">
          {row.status && <span className={`sp-tag${tone}`}>{row.status.label}</span>}
        </span>
      </Link>
    </li>
  );
}

export function CollectionList({ collection, label, singular, rows }: Props) {
  const pathname = usePathname();
  const selectedId = pathname.split("/")[3];
  const dndId = useId(); // stable across SSR and hydration (dnd-kit's own counter is not)
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState(rows);
  const [prevRows, setPrevRows] = useState(rows);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Server data changed (save, delete, reorder elsewhere): adopt it.
  if (rows !== prevRows) {
    setPrevRows(rows);
    setOrder(rows);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const count = (n: number) => `${n} ${singular}${n === 1 ? "" : "s"}`;
  const q = query.trim().toLowerCase();
  const visible = q ? order.filter((r) => `${r.no} ${r.title} ${r.subtitle ?? ""}`.toLowerCase().includes(q)) : order;
  const sortable = !q && order.length > 1; // reordering a filtered list would be ambiguous

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const before = order;
    const next = arrayMove(
      order,
      order.findIndex((r) => r.id === active.id),
      order.findIndex((r) => r.id === over.id),
    );
    setOrder(next);
    setError(null);
    startTransition(async () => {
      const result = await reorderAction(
        collection,
        next.map((r) => r.id),
      );
      if (!result.ok) {
        setOrder(before);
        setError(result.formError ?? "Couldn't save the new order.");
      }
    });
  }

  return (
    <section className="cms-list" aria-label={label}>
      <div className="cms-list-head">
        <label htmlFor="cms-search" className="sp-visually-hidden">
          Search {label.toLowerCase()}
        </label>
        <input
          id="cms-search"
          type="search"
          className="sp-input"
          placeholder={`Search ${label.toLowerCase()}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          href={`/dashboard/${collection}/new`}
          variant="cta"
          icon={<Plus size={18} strokeWidth={1.5} aria-hidden="true" />}
        >
          New
        </Button>
      </div>
      <p className="sp-label" aria-live="polite">
        {q ? `${visible.length} of ${count(order.length)}` : count(order.length)}
        {sortable && " · drag to reorder"}
      </p>
      {error && (
        <p className="sp-field-error" role="alert">
          {error}
        </p>
      )}
      {order.length === 0 ? (
        <p className="sp-annot">No {singular}s yet.</p>
      ) : (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="cms-rows">
              {visible.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  href={`/dashboard/${collection}/${row.id}`}
                  selected={row.id === selectedId}
                  sortable={sortable}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
