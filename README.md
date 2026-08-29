# Preserving Parkchester
Website to show landmarks preservations commission handles landmarking in parkchester and beyond in NYC.

## Folder layout

- `photos/icons/` — shared icons used across all four sequences: `survey-icon.png`,
  `calendar-arrow-icon.png` (the calendar with its arrow baked into the same image),
  `x-icon.png`, `check-icon.png`.
- `photos/manhattan-path-1/`, `photos/parkchester-path-1/`, `-2/`, `-3/` — each sequence's own
  content photos/scans, referenced by its own `sequences/*.json` file.

## Opening screen (all four sequences)

Every sequence opens with the Survey icon on the left and the Calendar+arrow icon on the
right, pulled from the shared `photos/icons/` folder — see the `"folder": "icons"` entries in
`sequences/manhattan.json` and the three `parkchester-*.json` files.

After that first click, each Parkchester sequence layers `x-icon.png` on top, roughly over the
calendar — Manhattan layers `check-icon.png` in the same spot instead. From there, each
Parkchester sequence keeps layering in its own real photos one at a time (see below);

These are all currently positioned with reasonable starting `top` / `left` / `width` values

## Adding more layers to a Parkchester sequence

Each Parkchester sequence already layers in every photo from its own `photos/parkchester-path-*/`
folder, one per step, in `sequences/parkchester-1.json` (and the same shape in `-2.json` /
`-3.json`). To add another one — a new photo dropped into that folder — copy this block, paste
it as a new entry at the end of that file's array, and change the filename:

```json
{
  "mode": "layer",
  "images": [
    { "src": "PHOTO_FILENAME.jpg", "top": "30%", "left": "45%", "width": "300px" }
  ]
}
```

- Save the actual photo into that sequence's own photo folder (e.g. `photos/parkchester-path-1/`)
  using the same filename you typed above. To pull from the shared `photos/icons/` folder
  instead, add `"folder": "icons"` to the entry, like the Survey/Calendar/X icons do.
- `top` / `left` are roughly "how far down / across the screen" as a percentage — start with
  any numbers, you'll adjust them visually next.
- `width` is optional; leave it out for a default size, or set something like `"260px"` for a
  smaller photo.

**To position it visually instead of guessing numbers:** open the site locally with `?arrange=1`
added to the URL, e.g. `index.html?arrange=1`. Every freeform image (anything positioned with
`top`/`left` instead of `slot`, which includes Survey/Calendar/X now) becomes draggable — click
and drag it wherever looks right. Once things are placed, click the purple **Copy Layout**
button in the bottom-left corner. It shows a box with the exact `top` / `left` values for
everything currently on screen — copy that and paste it over the matching `"images": [...]`
list in the sequence's JSON file. `?arrange=1` only changes how the page behaves for you
locally; regular visitors never see the button or the dragging.

## How it works (for future editing)

Plain static HTML/CSS/JS, deployable straight to GitHub Pages.

- `index.html` / `style.css` / `script.js` — the whole engine. Sequences always play in the
  fixed order listed in `sequences.json` (Parkchester I → II → III → Manhattan). Each click
  advances one step; when a sequence's steps run out it moves to the next one. After the last
  sequence, it shows "How many sculptures did you spot?" and the next click restarts from the
  top, rather than ending for good.
- `sequences.json` — manifest listing the four sequences (ids `manhattan-path-1`,
  `parkchester-path-1`, `parkchester-path-2`, `parkchester-path-3` — these match the `photos/`
  folder names) and where their step data lives.
- `sequences/*.json` — one file per sequence. Each is an array of "steps". A step looks like:

  ```json
  {
    "mode": "replace",
    "background": "#F4F1EC",
    "images": [
      { "src": "survey-icon.png", "folder": "icons", "top": "32%", "left": "8%", "width": "200px" }
    ],
    "text": { "content": "Optional caption", "top": "80%", "left": "10%" }
  }
  ```

  - `"mode": "replace"` clears the screen before drawing this step's images (Manhattan's clean look).
  - `"mode": "layer"` draws on top of what's already there without clearing (Parkchester's
    accumulating, disorganized look).
  - `src` is a filename. By default the engine looks for it inside the sequence's own photo
    folder (`photos/<sequence-id>/`); add `"folder": "icons"` (or any other folder name under
    `photos/`) to pull from a shared folder instead.
  - `top` / `left` / `width` position the image freely — see the drag tool above. `left`/`top`
    can also be `"center"` to center the image based on its real rendered size (stays centered
    at any viewport width, unlike a fixed percentage). `slot` is still supported as an
    alternative for a fixed, non-draggable position defined once in `style.css` (search for
    `.slot-`), currently unused but available for a future screen.
  - `"id": "calendar"` names an image so another one can lock onto it with `"anchor":
    "calendar"` plus `anchorLeftPercent` / `anchorTopPercent` — offsets as a percentage of the
    anchor's own rendered width/height (not the stage), so the locked-on image (the X/checkmark
    on the calendar) always lands in the same relative spot no matter how big or small the
    anchor itself is rendering.
  - `"mobile": { "top": ..., "left": ..., "width": ... }` overrides any of those three at or
    below 700px-wide screens. Used for the Survey/Calendar intro, which is stacked vertically
    on phones instead of side by side — most images don't need this; they just shrink to fit
    (see `max-width: 92vw` in `style.css`) without needing a different layout.
  - `text` is optional, for sequences (like Manhattan) that pair images with captions.

To add or edit a screen: edit the relevant `sequences/*.json` file — no HTML or JS changes needed.
