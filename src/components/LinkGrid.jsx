import { useRef } from "react";
import HoverCheckerOutline from "./HoverCheckerOutline.jsx";
import { LinkIcon } from "./LinkCard.jsx";

function GridArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="grid-card__arrow"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 17L17 7M17 7H9M17 7V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridCard({
  link,
  title,
  cardTheme,
  cardSize,
  editMode,
  isEditing,
  isHovering,
  onEdit,
  onHoverTarget,
}) {
  const cardRef = useRef(null);
  const isExternal = link.url.startsWith("http");
  const cardInk = cardTheme.text;
  const buttonTargetId = `link-button-${link.id}`;

  function setHoverTarget() {
    if (editMode && onHoverTarget) {
      onHoverTarget(buttonTargetId);
    }
  }

  function clearHoverTarget() {
    if (editMode && onHoverTarget) {
      onHoverTarget(null);
    }
  }

  function openLinkEditor(event) {
    if (!editMode || !onEdit || !cardRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const cardElement = cardRef.current;

    onEdit("link-button", {
      cardElement,
      triggerElement: event.currentTarget,
      rect: cardElement.getBoundingClientRect(),
      borderRadius: window.getComputedStyle(cardElement).borderRadius,
      cardKind: "grid",
    });
  }

  return (
    <div
      className={`grid-card-shell grid-card-shell--${cardSize}${isEditing ? " is-editing" : ""}${isHovering ? " has-hovered-target" : ""}`}
      data-edit-mode={editMode || undefined}
      data-link-id={link.id}
      style={{
        "--grid-accent": cardTheme.background,
        "--grid-ink": cardInk,
        "--grid-icon-filter":
          cardInk === "#FFFFFF"
            ? "brightness(0) invert(1)"
            : "brightness(0)",
      }}
    >
      <a
        className={`grid-card grid-card--${cardSize} editable-target${isEditing ? " is-editing" : ""}${isHovering ? " is-hovering" : ""}`}
        ref={cardRef}
        href={link.url}
        rel={isExternal ? "noreferrer" : undefined}
        target={isExternal ? "_blank" : undefined}
        download={link.download}
        aria-label={`${title}: ${link.description}`}
        aria-haspopup={editMode ? "dialog" : undefined}
        aria-expanded={editMode ? isEditing : undefined}
        onClick={openLinkEditor}
        onMouseEnter={setHoverTarget}
        onMouseLeave={clearHoverTarget}
      >
        <LinkIcon
          link={link}
          className="grid-card__visual"
          imageClassName="grid-card__image"
        />

        <span className="grid-card__copy">
          <span className="grid-card__label">{link.description}</span>
          <span className="grid-card__title">{title}</span>
        </span>

        <GridArrowIcon />

        {editMode ? <HoverCheckerOutline /> : null}
      </a>
    </div>
  );
}

function LinkGrid({
  links,
  editMode,
  activeTargetId,
  hoverTargetId,
  onEdit,
  onHoverTarget,
}) {
  return (
    <nav className="link-grid" aria-label="Jason Tello links grid">
      {links.map(({ link, title, cardTheme }, index) => {
        const cardSize =
          index === 0 ? "featured" : index === 1 ? "wide" : "small";

        return (
          <GridCard
            key={link.id}
            link={link}
            title={title}
            cardTheme={cardTheme}
            cardSize={cardSize}
            editMode={editMode}
            isEditing={activeTargetId === `link-button-${link.id}`}
            isHovering={hoverTargetId === `link-button-${link.id}`}
            onEdit={(type, origin) => onEdit(type, link.id, origin)}
            onHoverTarget={onHoverTarget}
          />
        );
      })}
    </nav>
  );
}

export default LinkGrid;
