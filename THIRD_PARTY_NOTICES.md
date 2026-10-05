# Third-party notices

BlockGamut’s original code, build support, documentation and original component
contributions distributed in this repository are licensed under GPL-3.0-or-later;
see the root `LICENSE`. This grant applies to BlockGamut and retains the
third-party terms and attributions below. Minecraft assets are excluded from the
GPL grant. Minecraft textures, models and related assets © Mojang / Microsoft.

- Oklab forward conversion: adapted from MineAgent's `palette/Oklab.java`,
  itself adapted from MoreScript OklabColor. Copyright (c) 2026 Tang;
  GPL-3.0-or-later. Attribution remains in `src/color.mjs` and the license
  text is included in `licenses/GPL-3.0.txt`.
- Oklab inverse conversion: Björn Ottosson,
  https://bottosson.github.io/posts/oklab/ (public domain / MIT).
- Glass material files adapted from urbanfabric/app's Semantic Map frontend:
  Apache-2.0. See `licenses/URBANFABRIC-APACHE-2.0.txt` and the preserved notice
  in the component archive. Original component contributions and BlockGamut
  modifications use GPL-3.0-or-later as part of this project; the Apache terms
  still apply to the upstream material portions. The archive includes editable
  component source, API declarations and `build.mjs`. Private development
  documentation, source maps and examples are omitted.
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
