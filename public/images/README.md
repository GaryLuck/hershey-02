# Site Photos

Photos are referenced from `public/landmarks.json` by the `thenImage` and
`nowImage` fields, as paths like `images/hocker-house-then.jpg`.

A site needs **both** a `thenImage` and a `nowImage` to show the Then & Now
slider. With only one photo it displays that photo alone; with none it falls
back to a decorative gradient.

## Currently in the game

| Site | then | now |
|---|---|---|
| Hotel Hershey | `hotel-hershey-then.jpg` | `hotel-hershey-now.jpg` |
| 743 & Cocoa | `cocoa-743-then.jpg` | `cocoa-743-now.jpg` |
| State Police Academy | `police-academy-then.jpg` | `police-academy-now.jpg` |
| Hocker House | `hocker-house-then.jpg` | *missing* |

## Staged but not yet in the game

These files are in this folder and referenced by nothing. They are waiting on
the missing pieces listed below.

- `round-barn-then.jpg` — needs latitude/longitude and a present-day photo.
- `decarlos-then.jpg` — needs latitude/longitude, a present-day photo, and its
  own descriptive text. The `DeCarlos.docx` supplied with it was a byte-for-byte
  duplicate of `Hocker House.docx`, so no DeCarlo's text exists yet.

## PastPerfect links not yet used

Art supplied search links for two sites that are staged rather than in the game.
Keep them here so they are not lost:

- **Round Barn** — `https://hersheyhistory.pastperfectonline.com/AdvancedSearch?advanceSearchActivated=False&firstTimeSearch=False&search_include_photos=true&search_include_creators=true&search_include_people=true&search_include_containers=true&searchcat_1=&searchcat_2=&searchcat_3=&searchcat_4=%22round+barn%22&searchcat_5=&searchcat_6=&searchcat_7=&searchcat_8=&searchcat_9=&searchcat_10=&searchcat_11=&searchcat_12=&actionType=Search`
- **DeCarlo's** — `https://hersheyhistory.pastperfectonline.com/advancedsearch?utf8=%E2%9C%93&advanceSearchActivated=true&firstTimeSearch=true&search_include_objects=true&search_include_archives=true&search_include_library=true&search_include_photos=true&search_include_creators=true&search_include_people=true&search_include_containers=true&searchcat_1=&searchcat_2=&searchcat_3=&searchcat_4=&searchcat_5=&searchcat_6=&searchcat_7=&searchcat_8=&searchcat_9=&searchcat_10=&searchcat_11=&searchcat_12=%22BUSINESS+%2F+DECARLO%27S+RESTAURANT%22&searchButton=Search`

## Still needed

- **Descriptive text for the Hotel Hershey.** Its `history` is empty, so the
  Historical Insight section shows "No history provided." The two photos were
  previously mislabelled as High Point Mansion; the old mansion description was
  removed because it described a different building.
- **Photo dates.** Every site has `"photoYear": null`, so the year always scores
  full marks and the game cannot demonstrate year scoring. **One real date on any
  one site is enough to show the feature working.**
- **`nowYear`** — the year each present-day photo was taken. Null everywhere, so
  the slider badge reads "NOW • TODAY" instead of a year.
- **A hint and a PastPerfect link for the Hotel Hershey.** The other three sites
  have both; the Hotel has neither, so it shows "No hint for this one." and its
  More Historical Images section is hidden.
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
