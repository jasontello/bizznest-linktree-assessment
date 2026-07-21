export function getRenderableLinks(links, customizations, themes) {
  return links.map((link) => {
    const customization = customizations[link.id] ?? {};
    const cardTheme =
      themes.find((theme) => theme.id === customization.theme) ?? themes[0];

    return {
      link,
      title: customization.title ?? link.title,
      cardTheme,
    };
  });
}
