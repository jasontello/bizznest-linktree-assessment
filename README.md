# BizzNEST Linktree Assessment

A polished Linktree-style personal landing page for Jason Tello, built for the BizzNEST Senior Associate technical assessment.

Live site: https://jasontello.github.io/bizznest-linktree-assessment/

## Project Overview

This project is a responsive personal links page built with Vite, React, and plain CSS. It includes a profile section, portfolio/social links, a downloadable resume, editable link/profile styling, and responsive list/grid layouts for desktop and mobile.

## Custom Feature

The custom feature is an edit mode for customizing the live links page. Users can change link colors, update link text, change the page background, edit profile copy, and replace the profile picture. Changes save locally in the browser, and the layout toggle switches between a classic vertical Linktree list and an editorial bento-grid layout using the same link data.

## Customization Persistence

Edit-mode changes are saved with `localStorage`, so they persist in the same browser but are not synced to a backend or shared across devices. The Reset button restores the default link, profile, and background settings.

## Links Included

- Portfolio: https://jasontello.com
- LinkedIn: https://www.linkedin.com/in/jason-tello-123888235/
- Resume: included as `JASONTELLO_RESUME_2026.pdf`
- GitHub: https://github.com/jasontello

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

This project is deployed with GitHub Pages using the `gh-pages` package.

Deploy command:

```bash
npm run deploy
```

## Write-Up

The final assessment write-up is included in this repo:

[BizzNEST_Linktree_Writeup.pdf](./BizzNEST_Linktree_Writeup.pdf)
