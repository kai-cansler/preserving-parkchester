# Preserving Parkchester
Website to show landmarks preservations commission handles landmarking in parkchester and beyond in NYC.

## Adding photos (no coding required)

Every sequence's opening screen shows two photos side by side: **Survey** on the left,
**Calendar** on the right. Save your two photos into the matching sequence folder using
these *exact* filenames:

| Folder | Files to add |
| --- | --- |
| `photos/manhattan/` | `survey.jpg`, `calendar.jpg` |
| `photos/parkchester-1/` | `survey.jpg`, `calendar.jpg` |
| `photos/parkchester-2/` | `survey.jpg`, `calendar.jpg` |
| `photos/parkchester-3/` | `survey.jpg`, `calendar.jpg` |

After that first click:

| Folder | Files to add | What happens |
| --- | --- | --- |
| `photos/parkchester-1/` | `calendar-x.png` | An X mark appears layered on top of the Calendar photo. Use a transparent PNG so Calendar still shows through. |
| `photos/parkchester-2/` | `calendar-x.png` | Same as above. |
| `photos/parkchester-3/` | `calendar-x.png` | Same as above. |
| `photos/manhattan/` | `grid-1.jpg`, `grid-2.jpg`, `grid-3.jpg`, `grid-4.jpg` | The screen clears and these four photos appear as a clean 2x2 grid. |

That's it — just save the files with those exact names in the right folder and refresh the
page. No need to open `script.js`, `style.css`, or any `.json` file for this. If a photo isn't
a `.jpg` (say, a `.png`), either rename the file's extension to match the table above, or ask
to have the matching `sequences/*.json` entry updated to the new extension.

A missing photo shows as a dashed placeholder box instead of a broken-image icon, so it's safe
to preview the site before every photo is in place.

## Adding more layers to a Parkchester sequence

Each Parkchester sequence already has two example "extra layer" screens after the X mark, in
`sequences/parkchester-1.json` (and the same shape in `-2.json` / `-3.json`). To add another
one, copy this block, paste it as a new entry in that file's array, and change the filename:

```json
{
  "mode": "layer",
  "images": [
    { "src": "PHOTO_FILENAME.jpg", "top": "30%", "left": "45%", "width": "300px" }
  ]
}
```

- Save the actual photo into that sequence's `photos/<sequence-id>/` folder using the same
  filename you typed above.
- `top` / `left` are roughly "how far down / across the screen" as a percentage — start with
  any numbers, you'll adjust them visually next.
- `width` is optional; leave it out for a default size, or set something like `"260px"` for a
  smaller photo.

**To position it visually instead of guessing numbers:** open the site locally with `?arrange=1`
added to the URL, e.g. `index.html?arrange=1`. Every layered photo (other than Survey/Calendar)
becomes draggable — click and drag it wherever looks right. Once things are placed, click the
purple **Copy Layout** button in the bottom-left corner. It shows a box with the exact `top` /
`left` values for everything currently on screen — copy that and paste it over the matching
`"images": [...]` list in the sequence's JSON file. `?arrange=1` only changes how the page
behaves for you locally; regular visitors never see the button or the dragging.

## How it works (for future editing)

Plain static HTML/CSS/JS, no build step, deployable straight to GitHub Pages.

- `index.html` / `style.css` / `script.js` — the whole engine. On load it shuffles the four
  sequences and picks one to play first. Each click on the page advances one step. When a
  sequence's steps run out, it moves to the next (randomly ordered) sequence, until all four
  have played.
- `sequences.json` — manifest listing the four sequences and where their step data lives.
- `sequences/*.json` — one file per sequence (`manhattan`, `parkchester-1`, `parkchester-2`,
  `parkchester-3`). Each is an array of "steps". A step looks like:

  ```json
  {
    "mode": "replace",
    "background": "#F4F1EC",
    "images": [
      { "slot": "survey", "src": "survey.jpg" },
      { "slot": "calendar", "src": "calendar.jpg" }
    ],
    "text": { "content": "Optional caption", "top": "80%", "left": "10%" }
  }
  ```

  - `"mode": "replace"` clears the screen before drawing this step's images (Manhattan's clean look).
  - `"mode": "layer"` draws on top of what's already there without clearing (Parkchester's
    accumulating, disorganized look).
  - `slot` picks a fixed position/size defined once in `style.css` (search for `.slot-`). `src`
    is just the filename inside that sequence's `photos/<sequence-id>/` folder — the engine
    prefixes the path automatically.
  - To add a new named position (a new slot), add one CSS rule named `.slot-whatever` in
    `style.css`, then reference `"slot": "whatever"` from any sequence's JSON.
  - Skip `slot` entirely and use `top` / `left` / `width` directly on the image instead for a
    one-off freeform position (used for the Parkchester "extra layer" screens — see the section
    above for the copy-paste template and the `?arrange=1` drag tool).
  - `text` is optional, for sequences (like Manhattan) that pair images with captions.

To add or edit a screen: edit the relevant `sequences/*.json` file — no HTML or JS changes needed.
