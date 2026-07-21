import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import LinkCard, { LinkIcon } from "./LinkCard.jsx";

const motionTiming = {
  duration: 400,
  easing: "cubic-bezier(0.19, 1, 0.22, 1)",
  fill: "both",
};
const maxProfileImageBytes = 750 * 1024;

function waitForPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function LinkEditor({
  targetType = "link-button",
  link,
  customization,
  profileCustomization,
  pageCustomization,
  origin,
  themes,
  onNameChange,
  onThemeChange,
  onProfileChange,
  onPageChange,
  onApplyThemeToAll,
  onReleaseTarget = () => {},
  onClose,
}) {
  const dialogRef = useRef(null);
  const backdropRef = useRef(null);
  const previewRef = useRef(null);
  const controlsRef = useRef(null);
  const nameInputRef = useRef(null);
  const animationsRef = useRef([]);
  const isClosingRef = useRef(false);
  const isLinkTarget = Boolean(link && customization);
  const [profileImageError, setProfileImageError] = useState("");
  const [isEditingName, setIsEditingName] = useState(
    targetType === "link-text",
  );
  const activeTheme = isLinkTarget
    ? themes.find((theme) => theme.id === customization.theme) ?? themes[0]
    : themes[0];
  const editorTitle =
    targetType === "link-text"
      ? `Customize ${customization?.title ?? "button text"}`
      : targetType === "profile-name"
        ? "Customize name"
        : targetType === "profile-bio"
          ? "Customize description"
          : targetType === "profile-photo"
            ? "Customize profile picture"
            : targetType === "page-background"
              ? "Customize background"
              : `Customize ${customization?.title ?? "button"}`;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const defaultProfileImageSrc = `${import.meta.env.BASE_URL}face.png`;
  const showOriginalButtonPreview = targetType === "link-button" && isLinkTarget;

  const cancelAnimations = useCallback(() => {
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
  }, []);

  const getInverseTransform = useCallback(
    (previewRect, sourceRect = origin.rect) => {
      const scaleX = sourceRect.width / previewRect.width;
      const scaleY = sourceRect.height / previewRect.height;
      const translateX = sourceRect.left - previewRect.left;
      const translateY = sourceRect.top - previewRect.top;

      return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    },
    [origin.rect],
  );

  const completeClose = useCallback(async () => {
    const sourceShell = origin.cardElement?.closest(
      ".link-card-shell, .grid-card-shell",
    );

    if (sourceShell) {
      sourceShell.style.visibility = "visible";
    }

    await waitForPaint();

    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }

    onClose();
    window.requestAnimationFrame(() => {
      sourceShell?.style.removeProperty("visibility");
    });
  }, [onClose, origin.cardElement]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    const preview = previewRef.current;
    const controls = controlsRef.current;

    dialog.showModal();

    if (prefersReducedMotion) {
      return () => {
        if (dialog.open) {
          dialog.close();
        }
      };
    }

    const previewRect = preview.getBoundingClientRect();
    const inverseTransform = getInverseTransform(previewRect);
    const previewAnimation = preview.animate(
      [
        { transform: inverseTransform, borderRadius: origin.borderRadius },
        {
          transform: "none",
          borderRadius: window.getComputedStyle(preview).borderRadius,
        },
      ],
      motionTiming,
    );
    const backdropAnimation = backdrop.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 200, easing: "ease-out", fill: "both" },
    );
    const controlsAnimation = controls.animate(
      [
        { opacity: 0, filter: "blur(10px)", transform: "translateY(24px)" },
        { opacity: 1, filter: "blur(0)", transform: "translateY(0)" },
      ],
      {
        duration: 320,
        delay: 100,
        easing: motionTiming.easing,
        fill: "both",
      },
    );

    animationsRef.current = [
      previewAnimation,
      backdropAnimation,
      controlsAnimation,
    ];

    return () => {
      cancelAnimations();
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [
    cancelAnimations,
    getInverseTransform,
    origin.borderRadius,
    prefersReducedMotion,
  ]);

  const requestClose = useCallback(async () => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    if (prefersReducedMotion) {
      onReleaseTarget();
      await completeClose();
      return;
    }

    const backdrop = backdropRef.current;
    const preview = previewRef.current;
    const controls = controlsRef.current;
    const currentBackdropOpacity = window.getComputedStyle(backdrop).opacity;
    const currentControls = window.getComputedStyle(controls);

    cancelAnimations();
    onReleaseTarget();
    await waitForPaint();

    const previewAnimation = preview.animate(
      [
        { opacity: 1, filter: "blur(0)" },
        { opacity: 0, filter: "blur(8px)" },
      ],
      { duration: 120, easing: "ease-in", fill: "both" },
    );
    const backdropAnimation = backdrop.animate(
      [{ opacity: currentBackdropOpacity }, { opacity: 0 }],
      { duration: 200, easing: "ease-in", fill: "both" },
    );
    const controlsAnimation = controls.animate(
      [
        {
          opacity: currentControls.opacity,
          filter: currentControls.filter,
          transform: currentControls.transform,
        },
        { opacity: 0, filter: "blur(10px)", transform: "translateY(24px)" },
      ],
      { duration: 180, easing: "ease-in", fill: "both" },
    );

    animationsRef.current = [
      previewAnimation,
      backdropAnimation,
      controlsAnimation,
    ];

    await Promise.allSettled([
      previewAnimation.finished,
      backdropAnimation.finished,
      controlsAnimation.finished,
    ]);
    await completeClose();
  }, [
    cancelAnimations,
    completeClose,
    onReleaseTarget,
    prefersReducedMotion,
  ]);

  useEffect(() => {
    const dialog = dialogRef.current;

    function handleCancel(event) {
      event.preventDefault();
      requestClose();
    }

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [requestClose]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  return (
    <dialog
      className="link-editor"
      ref={dialogRef}
      aria-labelledby="link-editor-heading"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          requestClose();
        }
      }}
    >
      <div
        className="link-editor__backdrop"
        ref={backdropRef}
        aria-hidden="true"
        onClick={requestClose}
      />

      <div className="link-editor__layout">
        <div className="link-editor__surface">
          <h2 className="visually-hidden" id="link-editor-heading">
            {editorTitle}
          </h2>

          <div
            className={`editor-preview editor-preview--${targetType}`}
            ref={previewRef}
            style={{
              "--editor-card-background":
                targetType === "page-background"
                  ? pageCustomization.background
                  : activeTheme.background,
              "--editor-card-text":
                targetType === "page-background" &&
                pageCustomization.background === "#030303"
                  ? "#ffffff"
                  : activeTheme.text,
              "--editor-icon-filter":
                activeTheme.text === "#FFFFFF"
                  ? "brightness(0) invert(1)"
                  : "brightness(0)",
            }}
          >
            {showOriginalButtonPreview ? (
              <div
                className="editor-preview__button-card"
                aria-hidden="true"
                inert
              >
                <LinkCard
                  link={link}
                  title={customization.title}
                  cardTheme={activeTheme}
                  editMode={false}
                />
              </div>
            ) : isLinkTarget ? (
              <>
                <LinkIcon
                  link={link}
                  className="editor-preview__icon"
                  imageClassName="editor-preview__image"
                />

                <div className="editor-preview__copy">
                  {isEditingName ? (
                    <input
                      className="editor-name-input"
                      ref={nameInputRef}
                      value={customization.title}
                      maxLength="28"
                      aria-label="Link name"
                      onChange={(event) => onNameChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setIsEditingName(false);
                        }
                      }}
                    />
                  ) : (
                    <strong>{customization.title}</strong>
                  )}
                  <span>{link.description}</span>
                </div>

                <button
                  className="editor-name-button"
                  type="button"
                  onClick={() => setIsEditingName((current) => !current)}
                >
                  {isEditingName ? "Done" : "Edit name"}
                </button>
              </>
            ) : targetType === "profile-name" ? (
              <div className="editor-preview__profile-copy">
                <span>Name</span>
                <input
                  className="editor-name-input"
                  ref={nameInputRef}
                  value={profileCustomization.name}
                  maxLength="32"
                  aria-label="Profile name"
                  onChange={(event) =>
                    onProfileChange({ name: event.target.value })
                  }
                />
              </div>
            ) : targetType === "profile-bio" ? (
              <div className="editor-preview__profile-copy">
                <span>Description</span>
                <textarea
                  className="editor-textarea"
                  value={profileCustomization.bio}
                  maxLength="150"
                  aria-label="Profile description"
                  onChange={(event) =>
                    onProfileChange({ bio: event.target.value })
                  }
                />
              </div>
            ) : targetType === "profile-photo" ? (
              <div className="editor-preview__photo">
                <span className="editor-preview__photo-frame">
                  <img
                    src={profileCustomization.imageSrc || defaultProfileImageSrc}
                    alt=""
                    aria-hidden="true"
                  />
                </span>
                <strong>Profile picture</strong>
              </div>
            ) : (
              <div className="editor-preview__background">
                <span>Page background</span>
                <strong>{pageCustomization.background}</strong>
              </div>
            )}
          </div>
          <div className="editor-controls" ref={controlsRef}>
            {isLinkTarget ? (
              <fieldset className="editor-fieldset">
                <legend>Button color</legend>
                <div className="color-options">
                  {themes.map((theme) => (
                    <button
                      className="color-option"
                      type="button"
                      aria-label={`${theme.label} button`}
                      aria-pressed={customization.theme === theme.id}
                      title={theme.label}
                      onClick={() => onThemeChange(theme.id)}
                      key={theme.id}
                    >
                      <span style={{ background: theme.background }} />
                    </button>
                  ))}
                </div>

                <button
                  className="apply-all-button"
                  type="button"
                  onClick={() => onApplyThemeToAll(customization.theme)}
                >
                  Apply this color to every link
                </button>
              </fieldset>
            ) : targetType === "profile-photo" ? (
              <fieldset className="editor-fieldset">
                <label className="editor-file-control editor-file-control--button">
                  <span>Choose picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Choose profile image"
                    onChange={async (event) => {
                      const [file] = event.target.files;

                      if (!file) {
                        return;
                      }

                      if (file.size > maxProfileImageBytes) {
                        setProfileImageError(
                          "Choose an image under 750 KB so it can save locally.",
                        );
                        event.target.value = "";
                        return;
                      }

                      setProfileImageError("");
                      onProfileChange({
                        imageSrc: await readImageFile(file),
                      });
                      event.target.value = "";
                    }}
                  />
                </label>
                {profileImageError ? (
                  <p className="editor-control-note">{profileImageError}</p>
                ) : null}
              </fieldset>
            ) : targetType === "page-background" ? (
              <fieldset className="editor-fieldset">
                <legend>Background color</legend>
                <div className="color-options">
                  {themes.map((theme) => (
                    <button
                      className="color-option"
                      type="button"
                      aria-label={`${theme.label} background`}
                      aria-pressed={
                        pageCustomization.background.toLowerCase() ===
                        theme.background.toLowerCase()
                      }
                      title={theme.label}
                      onClick={() =>
                        onPageChange({ background: theme.background })
                      }
                      key={theme.id}
                    >
                      <span style={{ background: theme.background }} />
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <fieldset className="editor-fieldset">
                <legend>
                  {targetType === "profile-name" ? "Name" : "Description"}
                </legend>
                <p className="editor-control-note">
                  Edit the text directly in the preview above.
                </p>
              </fieldset>
            )}

            <button
              className="editor-save-button"
              type="button"
              style={{
                "--save-background": isLinkTarget
                  ? activeTheme.background
                  : "#ffffff",
                "--save-text": isLinkTarget ? "#ffffff" : "#050505",
              }}
              onClick={requestClose}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default LinkEditor;
