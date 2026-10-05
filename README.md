# BlockGamut

English · [简体中文](README.zh-CN.md)

[Open the explorer](https://ticoch1.github.io/BlockGamut/) · [Source](https://github.com/TicoCh1/BlockGamut)

BlockGamut is an interactive Minecraft Java block colour and material atlas. It places textured, native-size block models in three-dimensional colour spaces so builders can compare palettes, find neighbouring materials, inspect texture variation and explore how block appearances changed between releases.

It runs entirely in the browser. No Minecraft installation, account, backend or uploaded world is needed. English is the default; Simplified Chinese is also available.

Created by [TicoCh1](https://github.com/TicoCh1). Minecraft textures © Mojang / Microsoft.

![BlockGamut overview with the complete control panel and block inspector](media/screenshots/01-overview.jpg)

## Explore eight colour spaces

Choose **Coordinate space** to compare perceptual lightness, RGB channels or hue-based relationships. Every view uses the same selected release's materials and preserves the numerical colour values shown in the inspector.

| Oklab | sRGB |
| --- | --- |
| ![Oklab](media/screenshots/01-overview.jpg) | ![sRGB](media/screenshots/02-srgb.jpg) |
| **Linear RGB** | **HSV** |
| ![Linear RGB](media/screenshots/03-linear-rgb.jpg) | ![HSV](media/screenshots/04-hsv.jpg) |
| **HSL cylinder** | **HSL bicone** |
| ![HSL cylinder](media/screenshots/05-hsl.jpg) | ![HSL bicone](media/screenshots/06-hsl-bicone.jpg) |
| **CIE XYZ · D65** | **CIELAB · D65** |
| ![CIE XYZ D65](media/screenshots/07-xyz.jpg) | ![CIELAB D65](media/screenshots/08-cielab.jpg) |

### Material variance

Enable **Material variance** in any colour space to compare texture variation instead of average colour. Statistics use original unlit texture pixels, weighted by visible face area and alpha. The axes use fixed logarithmic scales, including a finite floor for zero; inspector values remain the original, unscaled population variances. Hue variance uses shortest-arc distances and excludes achromatic pixels.

![Material variance arranged on logarithmic axes](media/screenshots/11-variance.jpg)

## Choose a block arrangement

- **Spaced** leaves at least one block of clearance between native models.
- **Packed** places models on a lattice while reserving their actual footprint.
- **Dense fill** reserves a cell for each displayed material and fills other in-gamut cells with the nearest material. Repeated instances share selection.

Changes use simultaneous Manhattan movement. Dense transitions move representative blocks and fade the repeated fill. Reduced-motion preferences disable movement and start the turntable paused.

| Spaced | Packed | Dense fill |
| --- | --- | --- |
| ![Spaced native models](media/screenshots/09-spaced.jpg) | ![Packed native models](media/screenshots/01-overview.jpg) | ![Dense material fill](media/screenshots/10-dense.jpg) |

Collision handling can move blocks away from their exact mathematical colour coordinates. Use the inspector for precise numerical comparisons.

## Open a voxel section

In Packed or Dense fill, **Voxel section** opens a movable window with a textured two-dimensional cross-section. Choose an axis and position, keep a cutaway volume or a single voxel layer, and reverse the retained side. Hue-angle and radius sections are available in hue-based colour spaces when variance is off.

Drag the window by its header, or focus the drag handle and use arrow keys; Shift makes one-pixel adjustments. The position slider updates the slice and 3D section while dragging. Clicking a slice tile selects every instance of that block.

| Cutaway volume | Reversed side |
| --- | --- |
| ![Cutaway volume and textured slice](media/screenshots/12-cutaway.jpg) | ![Reversed cutaway volume](media/screenshots/12b-reversed.jpg) |
| **Single voxel layer** | **Hue-angle section** |
| ![Single voxel layer](media/screenshots/13-layer.jpg) | ![Hue-angle section](media/screenshots/14-hue-section.jpg) |

![Radius section](media/screenshots/15-radius-section.jpg)

## Filter materials and historical releases

The **Filters** area combines Minecraft version, search, geometry class, colour source, material grouping, opacity and biome-tint inclusion.

The bundled dataset covers **84 Java release entries from 1.7.2 to 26.3** in Mojang's official version manifest; snapshot entries are excluded. Releases without changes to the represented materials share **31 groups**, labelled with the earliest release and a `+` when applicable. For example, **1.7.2+** covers 1.7.2–1.7.10; the filter shows the full range. The latest bundled release is selected initially. Future releases require a dataset update.

Switching a release changes its available blocks, original textures, models, colours and animations together. Old versions use their old materials. The large default [Texture Update arrived in Java 1.14](https://www.minecraft.net/en-us/article/village---pillage-out-java-).

![The earliest material group with original textures](media/screenshots/16-old-release.jpg)

**Group materials** merges identical resolved texture sets and tints, preferring a full cube when available. Similar colours alone do not merge blocks. Disable grouping to include individual variants. Geometry filters cover full cubes, flat planes, entity/oversized previews and other models. **Colour source** can use the model average or any of its six faces.

![Combined geometry, top-face and opacity filters with grouping disabled](media/screenshots/17-filters.jpg)

### Search, selection and empty results

Search accepts English or Chinese block names, namespaced IDs and legacy numeric IDs such as `5:1`. Click a block in the scene to select it. A filter combination with no results, or a state with no selected block, displays **minecraft:air** in the inspector. **Reset filters** is available when the result is empty.

| Legacy ID search and selected result | Empty result |
| --- | --- |
| ![Legacy ID search for spruce planks](media/screenshots/20-search.jpg) | ![Empty result with minecraft air](media/screenshots/21-air.jpg) |

The controls stay visible. The separate block-library entry and its former top-right controls are intentionally hidden.

### Variance range

The **Variance range** filter uses total Oklab population variance, `Var(L) + Var(a) + Var(b)`, from the original whole-model texture pixels. It works in average-colour and material-variance views, independently of the current colour space and face selector. Both endpoints are inclusive.

The two `‹│` / `│›` handles share one logarithmic track. The endpoint readouts show actual variance values. Drag and release to apply; arrow keys adjust a handle immediately, Shift uses larger steps, Page Up/Down move farther, and Home/End move to a limit. The handles cannot cross and remain separately reachable when they meet. The reset arrow restores the complete range.

![Dual-handle variance range filter](media/screenshots/29-variance-range.jpg)

## Inspect native models and build a collection

The inspector contains a rotating model preview, block ID, source files and variants, sampled colour, coordinates or variances, and a five-colour surface summary. Pause or resume the turntable, and choose **Inspect in 3D** to move the camera close to the selected block.

Models retain their native dimensions and alpha. Previews include non-cubes, crossed plant planes, multipart models, tall plants and static representations of special block renderers. Vanilla texture frame sequences, timing and interpolation are retained; end portals use an animated layered preview.

| Asset files and surface statistics | Native chest preview |
| --- | --- |
| ![Inspector with asset files expanded](media/screenshots/18-inspector.jpg) | ![Native chest model and turntable](media/screenshots/25-native-models.jpg) |

![Camera focused on a selected block among neighbouring native models](media/screenshots/24-focus-camera.jpg)

Use **Collect block** in the inspector, then select **My collection** in the geometry filter to view your chosen palette. Collections last for the current page session and reset on reload.

![A block saved in the current collection](media/screenshots/19-collection.jpg)

### Blacklist

Choose **Blacklist block** in the inspector to hide a block from the normal atlas and from **My collection**. With material grouping enabled, the action includes all variants of the displayed material, so another equivalent variant does not immediately replace it. Entries are excluded before material grouping and combine with the other filters.

Select **My blacklist** in the geometry filter to view excluded blocks. Select one and choose **Remove from blacklist** to restore it. Search and variance filters still apply in this view; use **Reset filters** if the current combination hides an entry. Resetting filters does not clear the blacklist. Like the collection, the blacklist lasts for the current page session and resets on reload.

![Blacklisted material with its restore action](media/screenshots/28-blacklist.jpg)

## Camera, language and layout

Drag the scene to orbit, scroll to zoom, enable automatic **Orbit**, or use **Reset camera** to return to the overview. The language selector switches between English and Simplified Chinese and remembers the selection on that browser.

Panels adapt to the viewport. Longer content scrolls inside its panel; the glass shell and its decorative edges do not act as the content scrollport. The information button opens the built-in explanation of the data and methods.

| Simplified Chinese | Data and method notes |
| --- | --- |
| ![Simplified Chinese interface](media/screenshots/22-chinese.jpg) | ![Built-in data and method notes](media/screenshots/23-about.jpg) |

<img src="media/screenshots/26-mobile.jpg" alt="Compact layout with bounded controls and inspector" width="360">

## Data and limitations

Release assets are incremental: original texture pixels are stored once in a shared atlas, and each material group records changed catalog entries, models and animation metadata against its predecessor. The bundled version assets occupy approximately **12.7 MiB**, with 3,569 unique texture tiles in seven atlas pages. Unchanged releases do not carry a complete copy of the textures. The runtime caches reconstructed release data.

Colour and variance statistics describe the source texture pixels rather than in-game lighting. The five-colour summary is only a visual summary, not the input to variance calculations. One representative placed state is shown per block. Special renderers use closed/rest poses, default skins and plain banners or pots. World lighting, particles, moving block entities and custom block data are not reproduced. Invisible blocks remain in the catalog without invented surface colours; air types and item frames are excluded from the placed-block atlas.

A modern browser with WebGL is required for the 3D scene. Dense fill can be substantially more expensive than Packed, especially in large RGB gamuts.

## Run locally

Use **Node.js 22 or later** and npm:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5190/`. For a production build and local preview:

```sh
npm run build
npm run preview
```

The preview runs at `http://127.0.0.1:4190/`. The build writes the static website to `dist/`.

## Static deployment

Vite uses relative asset paths, so the generated site can be served from a repository subdirectory. No server API is required. The [GitHub Pages workflow](.github/workflows/pages.yml) installs the locked dependencies, builds the website and publishes `dist/` when changes reach `main`.

For a fork, select **GitHub Actions** as the repository's Pages source. Other static hosts can serve the contents of `dist/` unchanged.

The public repository contains application code, runtime assets, build support, licenses and this illustrated README. Local development notes, private configuration, credentials, caches and generated build output are excluded.

## Licensing

BlockGamut's original application code and documentation are licensed under **GPL-3.0-or-later**, a copyleft license; see [LICENSE](LICENSE). Third-party components retain their supplied terms and notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [licenses/](licenses/).

Minecraft textures, models and related assets © Mojang / Microsoft. See [Minecraft asset copyright](licenses/MINECRAFT-ASSETS.md).

Oklab conversion and legacy-ID source attributions are retained in their source files and third-party notices. ShapeOfColour inspired the interaction and layout.
