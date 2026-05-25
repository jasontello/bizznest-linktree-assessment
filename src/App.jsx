import { useEffect, useRef, useState } from "react";
import ProfileHeader from "./components/ProfileHeader.jsx";
import LayoutToggle from "./components/LayoutToggle.jsx";
import LinkGrid from "./components/LinkGrid.jsx";
import LinkList from "./components/LinkList.jsx";
import { links } from "./data/links.js";

function PageContent({ layoutMode, preview = false }) {
  return (
    <section
      className="profile-page"
      aria-label={preview ? undefined : "Jason Tello personal links"}
    >
      <ProfileHeader />
      {layoutMode === "grid" && (
        <p className="page-footer">BizzNEST · Rio Vista, CA</p>
      )}
      <div className="layout-stage" data-layout={layoutMode} key={layoutMode}>
        {layoutMode === "grid" ? (
          <LinkGrid links={links} />
        ) : (
          <LinkList links={links} />
        )}
      </div>
      {layoutMode === "list" && (
        <p className="page-footer">BizzNEST · Rio Vista, CA</p>
      )}
    </section>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return window.localStorage.getItem("theme") || "light";
  });
  const [layoutMode, setLayoutMode] = useState("list");
  const [inkTransition, setInkTransition] = useState(null);
  const transitionTimers = useRef([]);
  const toggleRef = useRef(null);

  const isDark = theme === "dark";
  const toggleTheme = inkTransition?.targetTheme || theme;
  const isToggleDark = toggleTheme === "dark";
  const isTransitioning = Boolean(inkTransition);
  const themeIconSrc = `${import.meta.env.BASE_URL}${isToggleDark ? "sun.png" : "moon.png"}`;

  useEffect(() => {
    window.localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    return () => {
      transitionTimers.current.forEach(window.clearTimeout);
    };
  }, []);

  function handleThemeToggle() {
    if (isTransitioning) {
      return;
    }

    const nextTheme = isDark ? "light" : "dark";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    const buttonRect = toggleRef.current.getBoundingClientRect();
    const origin = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top + buttonRect.height / 2,
    };

    setInkTransition({
      ...origin,
      phase: "spread",
      targetTheme: nextTheme,
    });

    transitionTimers.current.forEach(window.clearTimeout);
    transitionTimers.current = [
      window.setTimeout(() => {
        setTheme(nextTheme);
        setInkTransition(null);
        transitionTimers.current = [];
      }, 920),
    ];
  }

  return (
    <main
      className="app-shell"
      data-layout={layoutMode}
      data-theme={theme}
      data-ink-target={inkTransition?.targetTheme || undefined}
    >
      <button
        ref={toggleRef}
        className="theme-toggle"
        data-icon-theme={toggleTheme}
        type="button"
        disabled={isTransitioning}
        aria-label={`Switch to ${isToggleDark ? "light" : "dark"} mode`}
        onClick={handleThemeToggle}
      >
        <img
          src={themeIconSrc}
          alt=""
          aria-hidden="true"
        />
      </button>

      <LayoutToggle
        mode={layoutMode}
        onModeChange={setLayoutMode}
      />

      <PageContent layoutMode={layoutMode} />

      {inkTransition && (
        <div
          className={`theme-preview theme-preview--${inkTransition.phase}`}
          data-layout={layoutMode}
          data-theme={inkTransition.targetTheme}
          style={{
            "--ink-x": `${inkTransition.x}px`,
            "--ink-y": `${inkTransition.y}px`,
          }}
          aria-hidden="true"
          inert=""
        >
          <PageContent layoutMode={layoutMode} preview />
        </div>
      )}
    </main>
  );
}

export default App;
