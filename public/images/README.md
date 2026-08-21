# Site Photos

Photos are referenced from `public/landmarks.json` by the `thenImage` and
`nowImage` fields, as paths like `images/hocker-house-then.png`.

A site needs **both** a `thenImage` and a `nowImage` to show the Then & Now
slider. With only one photo it displays that photo alone; with none it falls
back to a decorative gradient.

## Currently in the game

| Site | then | now |
|---|---|---|
| Hotel Hershey | `hotel-hershey-then.png` | `hotel-hershey-now.png` |
| 743 & Cocoa | `cocoa-743-then.png` | `cocoa-743-now.png` |
| State Police Academy | `police-academy-then.png` | `police-academy-now.png` |
| Hocker House | `hocker-house-then.png` | *missing* |

## Staged but not yet in the game

These files are in this folder and referenced by nothing. They are waiting on
the missing pieces listed below.

- `round-barn-then.png` — needs latitude/longitude and a present-day photo.
- `decarlos-then.jpg` — needs latitude/longitude, a present-day photo, and its
  own descriptive text. The `DeCarlos.docx` supplied with it was a byte-for-byte
  duplicate of `Hocker House.docx`, so no DeCarlo's text exists yet.

## Still needed

- **Descriptive text for the Hotel Hershey.** Its entry in `landmarks.json`
  currently reads `TEXT NEEDED`. The two photos were previously mislabelled as
  High Point Mansion; the old mansion description was removed because it
  described a different building.
- **Photo dates.** Every site reads `"year": "Date unknown"`.
- **A present-day photo of the Hocker House.**

## A note on the present-day photos

The `now` images for 743 & Cocoa and the State Police Academy are annotated
screen captures of Google Earth and Google Street View. Two problems:

1. Google's imagery is licensed, and this site is published publicly.
2. The annotations name the answer ("State Police Academy", "Cocoa Avenue",
   "Giant Foods"), which gives the puzzle away — and now that the Then & Now
   slider appears on the clue page too, a player can reveal them *before*
   guessing.

Photographs taken by volunteers standing at each site would solve both at once,
and would match the framing of the historic shots more closely.
