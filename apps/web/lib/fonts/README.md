# CV fonts

Embedded in the CV PDFs so names and text print correctly. The built-in PDF fonts (Helvetica, Times) cannot draw
letters such as the Yoruba dot-below forms (Ọ, ẹ, ṣ) or the Naira sign (₦), and print them as the wrong characters.

| Files         | Family | Stands in for | Source                     |
| ------------- | ------ | ------------- | -------------------------- |
| `Arimo-*.ttf` | Arimo  | Helvetica     | `@expo-google-fonts/arimo` |
| `Tinos-*.ttf` | Tinos  | Times         | `@expo-google-fonts/tinos` |

Both are metric-compatible with the fonts they replace, so layouts match the standard PDF fonts line for line.
Licence: SIL Open Font License 1.1 (Arimo and Tinos, Copyright Google LLC / Steve Matteson).

They are subset to the characters in `CV_GLYPH_RANGES` (`content/cv.ts`) to keep the repo small: Basic Latin, Latin-1,
Latin Extended-A and B, combining marks, Latin Extended Additional (all Yoruba and Vietnamese letters), general
punctuation, currency symbols (including ₦) and a few maths signs. `cvModel` removes anything outside that set (emoji,
CJK) so it never prints as junk. To change the set, update both the constant and the fonts.
