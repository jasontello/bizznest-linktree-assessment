import { links } from "../data/links.js";
import {
  defaultLinkThemes,
  legacyThemeIdsByBackground,
  legacyThemeIdsById,
  linkThemes,
} from "../data/linkThemes.js";

const storageKey = "bizznest-linktree-customizer-v1";
const legacyStorageKey = "bizznest-senior-link-customizer-v1";
const defaultProfileImageSrc = `${import.meta.env.BASE_URL}face.png`;
const defaultProfileFontScales = {
  name: 1,
  bio: 1,
  location: 1,
  role: 1,
  footer: 1,
};
const defaultProfileVisibility = {
  bio: true,
  location: true,
  role: true,
  footer: true,
};

function normalizeFontScale(value) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Number(Math.min(Math.max(value, 0.75), 1.35).toFixed(2));
}

function getTheme(themeId) {
  return linkThemes.find((theme) => theme.id === themeId);
}

function normalizePageBackground(background, fallback) {
  if (typeof background !== "string" || !background.trim()) {
    return fallback;
  }

  const normalizedBackground = background.trim().toLowerCase();
  const currentTheme = linkThemes.find(
    (theme) => theme.background.toLowerCase() === normalizedBackground,
  );

  if (currentTheme) {
    return currentTheme.background;
  }

  return (
    getTheme(legacyThemeIdsByBackground[normalizedBackground])?.background ??
    fallback
  );
}

export function createDefaultLinkCustomizations() {
  return Object.fromEntries(
    links.map((link) => [
      link.id,
      {
        title: link.title,
        theme: defaultLinkThemes[link.id] ?? linkThemes[0].id,
      },
    ]),
  );
}

export function createDefaultListOrder() {
  return links.map((link) => link.id);
}

export function createDefaultProfileCustomization() {
  return {
    name: "Jason Tello",
    bio: "Design-oriented frontend developer focused on UI, interaction design, and creative web tools.",
    location: "Rio Vista / Bay Area, CA",
    role: "Frontend • UI/UX • Creative Technology",
    footer: "BizzNEST · Rio Vista, CA",
    imageSrc: defaultProfileImageSrc,
    fontScales: { ...defaultProfileFontScales },
    visibility: { ...defaultProfileVisibility },
  };
}

export function createDefaultPageCustomization() {
  return {
    background: getTheme("pink")?.background ?? linkThemes[0].background,
  };
}

function readStoredPayload() {
  try {
    const rawPayload =
      window.localStorage.getItem(storageKey) ??
      window.localStorage.getItem(legacyStorageKey);

    return rawPayload ? JSON.parse(rawPayload) : null;
  } catch {
    return null;
  }
}

export function readSavedCustomizations() {
  const defaultLinks = createDefaultLinkCustomizations();
  const defaultListOrder = createDefaultListOrder();
  const defaultProfile = createDefaultProfileCustomization();
  const defaultPage = createDefaultPageCustomization();
  const saved = readStoredPayload();
  const savedProfile = saved?.profile ?? {};
  const savedPage = saved?.page ?? {};
  const savedListOrder = Array.isArray(saved?.listOrder)
    ? saved.listOrder.filter(
        (linkId, index, order) =>
          defaultListOrder.includes(linkId) && order.indexOf(linkId) === index,
      )
    : [];

  const customizations = {
    layoutMode: saved?.layoutMode === "grid" ? "grid" : "list",
    listOrder: [
      ...savedListOrder,
      ...defaultListOrder.filter((linkId) => !savedListOrder.includes(linkId)),
    ],
    links: Object.fromEntries(
      links.map((link) => {
        const savedLink = saved?.links?.[link.id];
        const savedTheme =
          getTheme(savedLink?.theme)?.id ??
          getTheme(legacyThemeIdsById[savedLink?.theme])?.id ??
          defaultLinks[link.id].theme;

        const savedTitle =
          typeof savedLink?.title === "string" && savedLink.title.trim()
            ? savedLink.title.slice(0, 28)
            : defaultLinks[link.id].title;

        return [link.id, { title: savedTitle, theme: savedTheme }];
      }),
    ),
    profile: {
      ...defaultProfile,
      name:
        typeof savedProfile.name === "string" && savedProfile.name.trim()
          ? savedProfile.name.slice(0, 32)
          : defaultProfile.name,
      bio:
        typeof savedProfile.bio === "string" && savedProfile.bio.trim()
          ? savedProfile.bio.slice(0, 150)
          : defaultProfile.bio,
      location:
        typeof savedProfile.location === "string" &&
        savedProfile.location.trim()
          ? savedProfile.location.slice(0, 60)
          : defaultProfile.location,
      role:
        typeof savedProfile.role === "string" && savedProfile.role.trim()
          ? savedProfile.role.slice(0, 80)
          : defaultProfile.role,
      footer:
        typeof savedProfile.footer === "string" && savedProfile.footer.trim()
          ? savedProfile.footer.slice(0, 80)
          : defaultProfile.footer,
      imageSrc:
        typeof savedProfile.imageSrc === "string" &&
        savedProfile.imageSrc.trim()
          ? savedProfile.imageSrc
          : defaultProfile.imageSrc,
      fontScales: Object.fromEntries(
        Object.keys(defaultProfileFontScales).map((field) => [
          field,
          normalizeFontScale(savedProfile.fontScales?.[field]),
        ]),
      ),
      visibility: Object.fromEntries(
        Object.keys(defaultProfileVisibility).map((field) => [
          field,
          savedProfile.visibility?.[field] !== false,
        ]),
      ),
    },
    page: {
      ...defaultPage,
      background: normalizePageBackground(
        savedPage.background,
        defaultPage.background,
      ),
    },
  };

  return customizations;
}

export function saveCustomizations(payload) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
