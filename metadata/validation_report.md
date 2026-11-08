# Adobe Stock Metadata Validation Report

Generated on: 2026-11-08T04:15:56.072Z

## Overall Status: ✅ PASSED (All checks clean)

### Validation Summary
- **Total Assets Validated:** 7
- **CSV Header:** `Filename,Title,Keywords,Category,Releases`
- **Official Specification Constraints Checked:**
  - Title Length: Max 70 characters (Adobe Stock strict limit for CSV)
  - Title Punctuation: No commas permitted in titles
  - Keyword Count: Exactly 49 keywords (official contributor ceiling)
  - Duplicate Check: Zero duplicate keywords per asset, zero duplicate titles across files
  - Forbidden Terms Filter: Zero occurrences of "alpha", "transparent", "green screen"
  - Mandatory Field Integrity: Filename, Title, Keywords, Category populated; Releases blank
  - Core Series Coverage: 10/10 shared Ramadan/Eid core keywords present in all rows

---

## Detailed Row Validation Table

| Filename | Title (Char Count) | Keywords Count | Category | Status |
| :--- | :--- | :---: | :---: | :---: |
| `asset5.mp4` | "Rotating gold Islamic star mandala loop on black background" (59 / 70 chars) | 49 / 49 | 15 | ✅ PASS |
| `asset6.mp4` | "Swinging ornate gold ketupat decoration loop on black background" (64 / 70 chars) | 49 / 49 | 15 | ✅ PASS |
| `asset7.mp4` | "Rhythmic beating bedug mosque drum loop on black background" (59 / 70 chars) | 49 / 49 | 15 | ✅ PASS |
| `gemini-code-1794108171091.mp4` | "Glowing golden crescent moon and star loop on black background" (62 / 70 chars) | 49 / 49 | 15 | ✅ PASS |
| `gemini-code-1794108757516.mp4` | "Swinging ornate Ramadan fanous lantern loop on black background" (63 / 70 chars) | 49 / 49 | 15 | ✅ PASS |
| `gemini-code-1794109048766.mp4` | "Twinkling hanging Ramadan lantern garland loop on black background" (66 / 70 chars) | 49 / 49 | 15 | ✅ PASS |
| `gemini-code-1794109347790.mp4` | "Floating golden stars and crescent moons loop on black background" (65 / 70 chars) | 49 / 49 | 15 | ✅ PASS |

---

## Top 10 High-Priority Keywords per Asset (Algorithm Weighting)

### `asset5.mp4`
- **Title:** Rotating gold Islamic star mandala loop on black background
- **First 10 Keywords:** islamic mandala, geometric star, arabic pattern, ramadan, gold ornament, rotating, black background, loop, overlay, eid mubarak

### `asset6.mp4`
- **Title:** Swinging ornate gold ketupat decoration loop on black background
- **First 10 Keywords:** ketupat, eid mubarak, ramadan, hari raya, islamic decoration, swinging, black background, loop, overlay, gold ornament

### `asset7.mp4`
- **Title:** Rhythmic beating bedug mosque drum loop on black background
- **First 10 Keywords:** bedug, ramadan drum, mosque drum, ramadan, eid mubarak, rhythmic beat, black background, loop, overlay, islamic tradition

### `gemini-code-1794108171091.mp4`
- **Title:** Glowing golden crescent moon and star loop on black background
- **First 10 Keywords:** crescent moon, hilal, ramadan moon, islamic star, ramadan, glowing, black background, loop, overlay, eid mubarak

### `gemini-code-1794108757516.mp4`
- **Title:** Swinging ornate Ramadan fanous lantern loop on black background
- **First 10 Keywords:** ramadan lantern, fanous, fanoos, islamic lantern, ramadan, swinging, black background, loop, overlay, eid mubarak

### `gemini-code-1794109048766.mp4`
- **Title:** Twinkling hanging Ramadan lantern garland loop on black background
- **First 10 Keywords:** ramadan garland, hanging lanterns, ramadan bunting, crescent stars, ramadan, twinkling, black background, loop, overlay, eid mubarak

### `gemini-code-1794109347790.mp4`
- **Title:** Floating golden stars and crescent moons loop on black background
- **First 10 Keywords:** floating stars, crescent moons, islamic stars, ramadan particles, ramadan, rising stream, black background, loop, overlay, eid mubarak

## Verification Checklist
- [x] No title exceeds 70 characters.
- [x] No title contains commas.
- [x] No title or keyword contains "alpha", "transparent", or "green screen".
- [x] Every asset has exactly 49 unique keywords.
- [x] No duplicate keywords exist within any asset.
- [x] No duplicate titles exist across the series.
- [x] Category 15 (Culture and Religion) applied consistently.
- [x] Releases column is properly empty.
- [x] Full RFC 4180 CSV compliance with UTF-8 encoding.
