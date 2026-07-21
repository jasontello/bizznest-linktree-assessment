import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const POPOVER_WIDTH = 264;
const POPOVER_HEIGHT = 132;
const VIEWPORT_MARGIN = 12;
const EDITOR_TOP_MARGIN = 64;
const ANCHOR_GAP = 4;
const MIN_SCALE = 0.75;
const MAX_SCALE = 1.35;
const SCALE_STEP = 0.05;

const closedBlobPath =
  "M114 18 C114 8 122 0 132 0 C142 0 150 8 150 18 L150 18 C150 28 142 36 132 36 L132 36 C122 36 114 28 114 18 L114 18 C114 18 114 18 114 18 L114 18 C114 18 114 18 114 18 Z";
const openBlobPath =
  "M114 18 C114 8 122 0 132 0 C142 0 150 8 150 18 L236 18 C251 18 264 31 264 46 L264 104 C264 119 251 132 236 132 L28 132 C13 132 0 119 0 104 L0 46 C0 31 13 18 28 18 Z";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeScale(value) {
  return Number(clamp(value, MIN_SCALE, MAX_SCALE).toFixed(2));
}

function getVisualTextRect(element, fallbackRect) {
  if (!element?.isConnected) {
    return fallbackRect;
  }

  const inlineInput = element.querySelector(".profile-inline-input");
  const inlineRect = inlineInput?.getBoundingClientRect();

  if (inlineRect?.width > 0 && inlineRect.height > 0) {
    return inlineRect;
  }

  const textContent = element.querySelector(".profile-text-scale");
  if (textContent) {
    const textRange = document.createRange();
    textRange.selectNodeContents(textContent);
    const textRect = textRange.getBoundingClientRect();

    if (textRect.width > 0 && textRect.height > 0) {
      return textRect;
    }
  }

  return element.getBoundingClientRect();
}

function TextSizePopover({
  label,
  origin,
  value = 1,
  canHide = false,
  isVisible = true,
  onChange,
  onVisibilityChange,
  onClose,
}) {
  const rootRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [position, setPosition] = useState({
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
    placement: "bottom",
    ready: false,
  });

  useLayoutEffect(() => {
    const anchor = origin?.cardElement;
    let settleTimer;

    function updatePosition() {
      const rect = getVisualTextRect(anchor, origin?.rect);

      if (!rect) {
        return;
      }

      const anchorCenter = rect.left + rect.width / 2;
      const shell = anchor?.closest(".app-shell");
      const isEditMode = shell?.dataset.editMode === "true";
      const topBoundary = isEditMode ? EDITOR_TOP_MARGIN : VIEWPORT_MARGIN;
      const left = clamp(
        anchorCenter - POPOVER_WIDTH / 2,
        VIEWPORT_MARGIN,
        window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
      );
      const siblingRects =
        anchor?.matches("[data-profile-field]") &&
        anchor.closest(".profile-header")
          ? Array.from(
              anchor
                .closest(".profile-header")
                .querySelectorAll("[data-profile-field]"),
            )
              .filter(
                (element) =>
                  element !== anchor &&
                  element.dataset.profileVisible !== "false",
              )
              .map((element) => getVisualTextRect(element))
              .filter((fieldRect) => fieldRect?.height > 0)
          : [];
      const maximumTop = window.innerHeight - POPOVER_HEIGHT - VIEWPORT_MARGIN;
      const preferredPlacement =
        rect.top - POPOVER_HEIGHT - ANCHOR_GAP >= topBoundary
          ? "top"
          : "bottom";
      const candidates = ["top", "bottom"].map((placement) => {
        const rawTop =
          placement === "bottom"
            ? rect.bottom + ANCHOR_GAP
            : rect.top - POPOVER_HEIGHT - ANCHOR_GAP;
        const top = clamp(rawTop, topBoundary, maximumTop);
        const popoverRect = {
          left,
          right: left + POPOVER_WIDTH,
          top,
          bottom: top + POPOVER_HEIGHT,
        };
        const overlapArea = siblingRects.reduce((total, siblingRect) => {
          const overlapWidth = Math.max(
            0,
            Math.min(popoverRect.right, siblingRect.right) -
              Math.max(popoverRect.left, siblingRect.left),
          );
          const overlapHeight = Math.max(
            0,
            Math.min(popoverRect.bottom, siblingRect.bottom) -
              Math.max(popoverRect.top, siblingRect.top),
          );

          return total + overlapWidth * overlapHeight;
        }, 0);
        const anchorOverlapHeight = Math.max(
          0,
          Math.min(popoverRect.bottom, rect.bottom) -
            Math.max(popoverRect.top, rect.top),
        );
        const anchorOverlapPenalty = anchorOverlapHeight > 0 ? 1_000_000_000 : 0;
        const viewportShift = Math.abs(top - rawTop);
        const preferencePenalty = placement === preferredPlacement ? 0 : 1;

        return {
          placement,
          top,
          score:
            anchorOverlapPenalty +
            overlapArea * 1000 +
            viewportShift * 100 +
            preferencePenalty,
        };
      });
      const { placement, top } = candidates.reduce((best, candidate) =>
        candidate.score < best.score ? candidate : best,
      );

      setPosition({
        left,
        top,
        placement,
        ready: true,
      });
    }

    function handleOutsidePointer(event) {
      if (!anchor?.classList.contains("is-editing")) {
        return;
      }

      if (
        rootRef.current?.contains(event.target) ||
        anchor?.contains(event.target)
      ) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event) {
      if (
        event.key === "Escape" &&
        anchor?.classList.contains("is-editing")
      ) {
        event.preventDefault();
        onClose();
      }
    }

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    if (anchor) {
      resizeObserver.observe(anchor);
      const inlineInput = anchor.querySelector(".profile-inline-input");
      if (inlineInput) {
        resizeObserver.observe(inlineInput);
      }
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    document.addEventListener("keydown", handleKeyDown);
    settleTimer = window.setTimeout(updatePosition, 520);

    return () => {
      window.clearTimeout(settleTimer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handleOutsidePointer, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, origin]);

  function updateScale(nextValue) {
    onChange(normalizeScale(nextValue));
  }

  const itemMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, filter: "blur(8px)", y: 12 },
        animate: { opacity: 1, filter: "blur(0px)", y: 0 },
        exit: { opacity: 0, filter: "blur(8px)", y: 10 },
      };

  return (
    <motion.div
      className="text-size-popover"
      data-placement={position.placement}
      ref={rootRef}
      role="dialog"
      aria-label={`${label} text controls`}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: position.ready ? 1 : 0 }}
      exit={
        prefersReducedMotion
          ? undefined
          : { opacity: 0, scale: 0.94, pointerEvents: "none" }
      }
      transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
      style={{
        left: position.left,
        top: position.top,
        transformOrigin:
          position.placement === "bottom" ? "50% 0%" : "50% 100%",
      }}
    >
      <svg
        className="text-size-popover__blob"
        viewBox={`0 0 ${POPOVER_WIDTH} ${POPOVER_HEIGHT}`}
        aria-hidden="true"
      >
        <motion.path
          initial={prefersReducedMotion ? false : { d: closedBlobPath }}
          animate={{ d: openBlobPath }}
          exit={prefersReducedMotion ? undefined : { d: closedBlobPath }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.4,
            ease: [0.34, 1.42, 0.64, 1],
          }}
        />
      </svg>

      <div className="text-size-popover__content">
        <motion.div
          className="text-size-popover__heading"
          {...itemMotion}
          transition={{ duration: 0.22, delay: prefersReducedMotion ? 0 : 0.06 }}
        >
          <span>Text size</span>
          <output>{Math.round(value * 100)}%</output>
        </motion.div>

        <motion.div
          className="text-size-popover__control"
          {...itemMotion}
          transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 0.09 }}
        >
          <button
            type="button"
            aria-label={`Decrease ${label} text size`}
            onClick={() => updateScale(value - SCALE_STEP)}
          >
            A−
          </button>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={SCALE_STEP}
            value={value}
            aria-label={`${label} text size`}
            aria-valuetext={`${Math.round(value * 100)} percent`}
            onChange={(event) => updateScale(Number(event.target.value))}
          />
          <button
            type="button"
            aria-label={`Increase ${label} text size`}
            onClick={() => updateScale(value + SCALE_STEP)}
          >
            A+
          </button>
        </motion.div>

        <motion.div
          className="text-size-popover__actions"
          {...itemMotion}
          transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : 0.12 }}
        >
          <button
            className="text-size-popover__reset"
            type="button"
            onClick={() => updateScale(1)}
          >
            Reset size
          </button>
          {canHide ? (
            <button
              className="text-size-popover__visibility"
              type="button"
              aria-pressed={!isVisible}
              onClick={() => onVisibilityChange?.(!isVisible)}
            >
              {isVisible ? "Hide from page" : "Show on page"}
            </button>
          ) : null}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default TextSizePopover;
