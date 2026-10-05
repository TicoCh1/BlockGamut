# Third-party notices

BlockGamut's original application source, build support and README are licensed
under GPL-3.0-or-later; see the root `LICENSE`. Existing third-party notices and
licenses remain applicable. Minecraft textures, models and related assets © Mojang / Microsoft.

- Oklab forward conversion: adapted from MineAgent's `palette/Oklab.java`,
  itself adapted from MoreScript OklabColor. Copyright (c) 2026 Tang;
  GPL-3.0-or-later. Attribution remains in `src/color.mjs` and the license
  text is included in `licenses/GPL-3.0.txt`.
- Oklab inverse conversion: Björn Ottosson,
  https://bottosson.github.io/posts/oklab/ (public domain / MIT).
- Glass material files adapted from urbanfabric/app's Semantic Map frontend:
  Apache-2.0. The upstream notice and license remain in the component archive
  under `licenses/urbanfabric-Apache-2.0.txt`. The component archive retains its
  original licensing; the application's GPL grant does not change those terms.
  Development documentation, source maps and examples are omitted.
- React and ReactDOM: MIT; Three.js: MIT; Lucide: ISC. License texts are
  included in `licenses/` and retained by their installed npm packages.
- Fuse.js 7.1.0 by Kiro Risk: Apache-2.0. See `licenses/FUSE.txt` and
  https://github.com/krisk/Fuse.
- Minecraft names, model definitions, dimensions, texture data and animation
  frames: © Mojang / Microsoft, from official Java releases 1.7.2 through 26.3.
  Identical texture pixels are stored once; release changes use incremental
  catalog, model and animation records. Models show representative
  placed states, including static previews for special renderers.
  The scheme pin badge uses the unchanged Java 26.3 GUI sprite
  `assets/minecraft/textures/gui/sprites/container/cartography_table/locked.png`
  (bundled as `src/assets/minecraft-locked.png`).
  See `licenses/MINECRAFT-ASSETS.md`.
- Palette colours and surface statistics derive from each selected release's
  original Minecraft face texels, weighted by face area and transparency.
- Java legacy block ID aliases: derived from EngineHub WorldEdit's legacy
  registry (GPL-3.0-or-later). Attribution remains in `src/legacyIds.mjs`;
  see `licenses/GPL-3.0.txt` and https://github.com/EngineHub/WorldEdit.
- ShapeOfColour provided the interaction and layout reference.
