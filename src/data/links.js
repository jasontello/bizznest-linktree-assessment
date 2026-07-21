const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

export const links = [
  {
    id: "portfolio",
    title: "Portfolio",
    description: "jasontello.com",
    url: "https://jasontello.com",
    iconImage: publicAsset("portfolio-icon.png"),
  },
  {
    id: "linkedin",
    title: "LinkedIn",
    description: "linkedin.com/in/jason-tello-123888235",
    url: "https://www.linkedin.com/in/jason-tello-123888235/",
    iconImage: publicAsset("linkedin-icon.png"),
  },
  {
    id: "resume",
    title: "Résumé",
    description: "One-page resume",
    url: publicAsset("JASONTELLO_RESUME_2026.pdf"),
    download: "JASONTELLO_RESUME_2026.pdf",
    iconImage: publicAsset("cv-icon.png"),
  },
  {
    id: "github",
    title: "GitHub",
    description: "github.com/jasontello",
    url: "https://github.com/jasontello",
    iconImage: publicAsset("github-icon.png"),
  },
];
