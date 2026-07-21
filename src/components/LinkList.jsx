import { useEffect, useRef, useState } from "react";
import { Reorder, useReducedMotion } from "motion/react";
import LinkCard from "./LinkCard.jsx";

function moveItem(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function LinkList({
  links,
  editMode,
  activeTargetId,
  hoverTargetId,
  onEdit,
  onHoverTarget,
  onReorder,
}) {
  const incomingOrder = links.map(({ link }) => link.id);
  const incomingOrderKey = incomingOrder.join("|");
  const [previewOrder, setPreviewOrder] = useState(incomingOrder);
  const [draggedLinkId, setDraggedLinkId] = useState(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");
  const previewOrderRef = useRef(previewOrder);
  const dragStartOrderRef = useRef(previewOrder);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (draggedLinkId) {
      return;
    }

    previewOrderRef.current = incomingOrder;
    setPreviewOrder(incomingOrder);
  }, [incomingOrderKey, draggedLinkId]);

  const linksById = new Map(
    links.map((renderableLink) => [renderableLink.link.id, renderableLink]),
  );
  const orderedLinks = previewOrder
    .map((linkId) => linksById.get(linkId))
    .filter(Boolean);

  function updatePreviewOrder(nextOrder) {
    previewOrderRef.current = nextOrder;
    setPreviewOrder(nextOrder);
  }

  function handleDragStart(linkId) {
    if (!editMode) {
      return;
    }

    setDraggedLinkId(linkId);
    dragStartOrderRef.current = previewOrderRef.current;
    onHoverTarget?.(null);
  }

  function handleDragEnd(linkId) {
    const finalOrder = previewOrderRef.current;
    const finalIndex = finalOrder.indexOf(linkId);
    const movedTitle = linksById.get(linkId)?.title ?? "Link";

    onReorder?.(finalOrder);
    setDraggedLinkId(null);
    onHoverTarget?.(null);

    if (finalIndex >= 0) {
      setReorderAnnouncement(
        `${movedTitle} moved to position ${finalIndex + 1} of ${finalOrder.length}.`,
      );
    }
  }

  function handleDragCancel(linkId) {
    const restoredOrder = dragStartOrderRef.current;
    const movedTitle = linksById.get(linkId)?.title ?? "Link";

    updatePreviewOrder(restoredOrder);
    setDraggedLinkId(null);
    onHoverTarget?.(null);
    setReorderAnnouncement(`${movedTitle} move cancelled.`);
  }

  function handleMoveBy(linkId, direction) {
    const currentOrder = previewOrderRef.current;
    const currentIndex = currentOrder.indexOf(linkId);
    const nextIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= currentOrder.length
    ) {
      return;
    }

    const nextOrder = moveItem(currentOrder, currentIndex, nextIndex);
    const currentTitle = linksById.get(linkId)?.title ?? "Link";

    updatePreviewOrder(nextOrder);
    onReorder?.(nextOrder);
    setReorderAnnouncement(
      `${currentTitle} moved to position ${nextIndex + 1} of ${nextOrder.length}.`,
    );
  }

  return (
    <Reorder.Group
      as="nav"
      axis="y"
      className="link-list"
      values={previewOrder}
      onReorder={editMode ? updatePreviewOrder : () => {}}
      aria-label="Jason Tello links"
      data-dragging={draggedLinkId ? "true" : undefined}
      data-reduced-motion={prefersReducedMotion || undefined}
    >
      {orderedLinks.map(({ link, title, cardTheme }, index) => (
        <LinkCard
          key={link.id}
          link={link}
          title={title}
          cardTheme={cardTheme}
          editMode={editMode}
          activeTargetId={activeTargetId}
          hoverTargetId={hoverTargetId}
          onEdit={(type, origin) => onEdit(type, link.id, origin)}
          onHoverTarget={onHoverTarget}
          reorderable
          isDragging={draggedLinkId === link.id}
          isAnyDragging={Boolean(draggedLinkId)}
          prefersReducedMotion={prefersReducedMotion}
          canMoveUp={index > 0}
          canMoveDown={index < orderedLinks.length - 1}
          onDragStart={() => handleDragStart(link.id)}
          onDragEnd={() => handleDragEnd(link.id)}
          onDragCancel={() => handleDragCancel(link.id)}
          onMoveBy={(direction) => handleMoveBy(link.id, direction)}
        />
      ))}
      <span className="visually-hidden" aria-live="polite">
        {reorderAnnouncement}
      </span>
    </Reorder.Group>
  );
}

export default LinkList;
