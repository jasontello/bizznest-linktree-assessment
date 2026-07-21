import { useEffect, useRef } from "react";
import { Reorder, useDragControls } from "motion/react";
import HoverCheckerOutline from "./HoverCheckerOutline.jsx";

const reorderSpring = {
  type: "spring",
  stiffness: 700,
  damping: 48,
  mass: 0.55,
};

const hoverTransition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

export function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="link-arrow"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkIcon({
  link,
  className = "link-icon",
  imageClassName = `${className}__image`,
}) {
  return (
    <span className={className} aria-hidden="true">
      <img
        className={imageClassName}
        src={link.iconImage}
        alt=""
        draggable="false"
      />
    </span>
  );
}

function LinkCard({
  link,
  title,
  cardTheme,
  editMode,
  activeTargetId,
  hoverTargetId,
  onEdit,
  onHoverTarget,
  reorderable = false,
  isDragging = false,
  isAnyDragging = false,
  prefersReducedMotion = false,
  canMoveUp = false,
  canMoveDown = false,
  onDragStart,
  onDragEnd,
  onDragCancel,
  onMoveBy,
}) {
  const cardRef = useRef(null);
  const dragClickGuardRef = useRef(false);
  const dragControls = useDragControls();
  const isExternal = link.url.startsWith("http");
  const cardInk = cardTheme.text;
  const buttonTargetId = `link-button-${link.id}`;
  const isEditingButton = activeTargetId === buttonTargetId;
  const isHoveringButton =
    !isAnyDragging && hoverTargetId === buttonTargetId;
  const Shell = reorderable ? Reorder.Item : "div";
  const reorderProps = reorderable
    ? {
        as: "div",
        value: link.id,
        drag: editMode,
        dragListener: editMode,
        dragControls,
        dragMomentum: false,
        initial: false,
        transition: prefersReducedMotion ? { duration: 0 } : reorderSpring,
        whileHover:
          prefersReducedMotion || isAnyDragging || editMode
            ? undefined
            : { scale: 0.98, transition: hoverTransition },
        dragTransition: prefersReducedMotion
          ? { bounceStiffness: 10000, bounceDamping: 10000 }
          : { bounceStiffness: 900, bounceDamping: 60 },
        whileDrag: {
          scale: prefersReducedMotion ? 1 : 1.025,
          zIndex: 12,
        },
        onDragStart: handleMotionDragStart,
        onDragEnd: handleMotionDragEnd,
      }
    : {};

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    function cancelDrag(event) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      dragControls.cancel();
      onDragCancel?.();
      window.addEventListener(
        "pointerup",
        () => {
          window.setTimeout(() => {
            dragClickGuardRef.current = false;
          }, 0);
        },
        { once: true },
      );
    }

    window.addEventListener("keydown", cancelDrag);
    return () => window.removeEventListener("keydown", cancelDrag);
  }, [dragControls, isDragging, onDragCancel]);

  function setHoverTarget(targetId) {
    if (editMode && !isAnyDragging && onHoverTarget) {
      onHoverTarget(targetId);
    }
  }

  function clearHoverTarget() {
    if (editMode && onHoverTarget) {
      onHoverTarget(null);
    }
  }

  function openLinkEditor(event, type, element) {
    if (dragClickGuardRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!editMode || !onEdit || !element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onEdit(type, {
      cardElement: element,
      triggerElement: event.currentTarget,
      rect: element.getBoundingClientRect(),
      borderRadius: window.getComputedStyle(element).borderRadius,
      cardKind: type,
    });
  }

  function handleMotionDragStart(...args) {
    dragClickGuardRef.current = true;
    onDragStart?.(...args);
  }

  function handleMotionDragEnd(...args) {
    onDragEnd?.(...args);
    window.setTimeout(() => {
      dragClickGuardRef.current = false;
    }, 0);
  }

  function handleMoveKeyDown(event) {
    if (event.key === "ArrowUp" && canMoveUp) {
      event.preventDefault();
      onMoveBy?.(-1);
    }

    if (event.key === "ArrowDown" && canMoveDown) {
      event.preventDefault();
      onMoveBy?.(1);
    }
  }

  return (
    <Shell
      {...reorderProps}
      className={`link-card-shell${isEditingButton ? " is-editing" : ""}${isHoveringButton ? " has-hovered-target" : ""}${isDragging ? " is-dragging" : ""}`}
      data-edit-mode={editMode || undefined}
      data-link-id={link.id}
      style={{
        "--link-accent": cardTheme.background,
        "--link-ink": cardInk,
        "--link-icon-filter":
          cardInk === "#FFFFFF"
            ? "brightness(0) invert(1)"
            : "brightness(0)",
      }}
    >
      <a
        className={`link-card editable-target${isEditingButton ? " is-editing" : ""}${isHoveringButton ? " is-hovering" : ""}`}
        ref={cardRef}
        href={link.url}
        draggable={false}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
        download={link.download}
        aria-label={`${title}: ${link.description}`}
        onClick={(event) =>
          openLinkEditor(event, "link-button", cardRef.current)
        }
        onMouseEnter={() => setHoverTarget(buttonTargetId)}
        onMouseLeave={clearHoverTarget}
      >
        <LinkIcon link={link} />

        <span
          className="link-content"
        >
          <span className="link-title">{title}</span>
          <span className="link-description">{link.description}</span>
        </span>

        {editMode ? <HoverCheckerOutline /> : null}
      </a>

      {editMode ? (
        <button
          className="link-drag-handle"
          type="button"
          aria-label={`Move ${title}`}
          title="Drag to reorder. Use the up and down arrow keys when focused."
          onPointerDown={(event) => {
            event.stopPropagation();
            dragControls.start(event);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onKeyDown={handleMoveKeyDown}
        >
          <svg viewBox="0 0 12 20" aria-hidden="true">
            <circle cx="3" cy="4" r="1.25" />
            <circle cx="9" cy="4" r="1.25" />
            <circle cx="3" cy="10" r="1.25" />
            <circle cx="9" cy="10" r="1.25" />
            <circle cx="3" cy="16" r="1.25" />
            <circle cx="9" cy="16" r="1.25" />
          </svg>
        </button>
      ) : null}
    </Shell>
  );
}

export default LinkCard;
