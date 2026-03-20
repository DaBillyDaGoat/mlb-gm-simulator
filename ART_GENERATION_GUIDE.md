# Baseball Franchise Simulator — Art Generation Guide

A working reference of exact AI image generation prompts for every visual asset the game needs. Copy-paste directly into generators.

---

## Recommended Free AI Image Generators

Ranked by usefulness for this project's needs (clean graphic/UI art, silhouettes, logos, transparent backgrounds).

### Tier 1 — Best for This Project

**1. Ideogram (ideogram.ai)**
- **Free tier:** 10 prompts/day (~40 images). Free generations are public.
- **Why it's #1:** Native transparent PNG generation — select the "Auto" model and include "transparent background" in your prompt. Also the best at rendering readable text in images, which helps for scoreboard/logo work.
- **Best for:** Silhouettes, logos, card templates, anything needing transparency.
- **Tip:** Use the free "Remove Background" tool (costs zero credits) on any generation to strip backgrounds after the fact.

**2. Leonardo AI (leonardo.ai)**
- **Free tier:** 150 tokens/day (resets every 24 hours, doesn't roll over).
- **Why it's great:** Excellent for stylized/illustrated art. Strong control over art style. Background removal available on the free plan.
- **Best for:** Stadium illustrations, stylized backgrounds, card art.
- **Tip:** Use "Anime" or "Illustration" presets for consistent stylized output. 150 tokens ≈ 5-10 images depending on settings.

**3. Microsoft Designer / Bing Image Creator (designer.microsoft.com/image-creator)**
- **Free tier:** Unlimited generations (slower after daily "boost" credits run out).
- **Why it's great:** Powered by DALL-E 3. Very good at following detailed prompts. No daily image cap.
- **Best for:** High-volume generation — when you need 30 team logos or 30 stadiums, unlimited gens matter.
- **Tip:** No native transparent background support. Pair with remove.bg or Ideogram's free background remover.

### Tier 2 — Good Alternatives

**4. Google ImageFX (labs.google/fx/tools/image-fx)**
- **Free tier:** Free to use, powered by Imagen 3.
- **Why it's good:** Excellent prompt understanding, photorealistic capability. "Chips" system suggests style variations.
- **Best for:** Stadium backgrounds, realistic-style assets.
- **Limitation:** No transparent background support. No batch generation.

**5. Adobe Firefly (firefly.adobe.com)**
- **Free tier:** 25 generative credits/month.
- **Why it's good:** Commercially safe (trained on licensed content). Clean, professional output.
- **Best for:** If you want the safest IP situation on generated art.
- **Limitation:** Only 25 credits/month is restrictive for 60+ assets. Use sparingly for key pieces.

### Background Removal (Post-Processing)

If your generator doesn't support transparent backgrounds natively:
- **remove.bg** — Free, instant, excellent quality. Best for silhouettes.
- **Ideogram's Remove Background** — Free, no credit cost. Works on any uploaded image.
- **Photoroom** — Free tier available. Good for batch processing.

---

## Asset Prompts by Category

---

### 1. Player Silhouettes (6 total)

**Target dimensions:** 683×1024 (2:3 portrait)
**Best generator:** Ideogram (for native transparency) or Bing Image Creator + remove.bg
**Style goal:** Clean, high-contrast, single-color silhouettes. Think MLB logo style — bold, recognizable at any size.

**General tips:**
- Generate 3-4 variations of each and pick the cleanest one.
- On Ideogram: use the Auto model, include "transparent background" in the prompt.
- On other generators: generate on a solid white or solid green background, then remove it with remove.bg.
- After generation, clean up in any image editor to ensure pure black silhouette with no stray details.
- All 6 should feel like they belong to the same set — consistent line weight, proportions, and level of detail.

#### 1A. Right-Handed Pitcher

```
Clean black silhouette of a right-handed baseball pitcher in full windup delivery, facing left, right arm extended back about to release the ball, left leg kicked high, dynamic athletic pose, solid black figure with no internal detail, on a transparent background, flat graphic design style, vector art quality, high contrast, minimal design, suitable for a sports game UI icon
```

#### 1B. Left-Handed Pitcher

```
Clean black silhouette of a left-handed baseball pitcher in full windup delivery, facing right, left arm extended back about to release the ball, right leg kicked high, dynamic athletic pose, solid black figure with no internal detail, on a transparent background, flat graphic design style, vector art quality, high contrast, minimal design, suitable for a sports game UI icon
```

#### 1C. Right-Handed Hitter

```
Clean black silhouette of a right-handed baseball batter mid-swing, facing left, batting from the left side of home plate, bat extended through the swing zone, athletic follow-through pose, solid black figure with no internal detail, on a transparent background, flat graphic design style, vector art quality, high contrast, minimal design, suitable for a sports game UI icon
```

#### 1D. Left-Handed Hitter

```
Clean black silhouette of a left-handed baseball batter mid-swing, facing right, batting from the right side of home plate, bat extended through the swing zone, athletic follow-through pose, solid black figure with no internal detail, on a transparent background, flat graphic design style, vector art quality, high contrast, minimal design, suitable for a sports game UI icon
```

#### 1E. Right-Handed Fielder

```
Clean black silhouette of a right-handed baseball fielder in a throwing motion, facing left, right arm cocked back ready to throw, left arm extended forward for balance, athletic dynamic pose, solid black figure with no internal detail, on a transparent background, flat graphic design style, vector art quality, high contrast, minimal design, suitable for a sports game UI icon
```

#### 1F. Left-Handed Fielder

```
Clean black silhouette of a left-handed baseball fielder in a throwing motion, facing right, left arm cocked back ready to throw, right arm extended forward for balance, athletic dynamic pose, solid black figure with no internal detail, on a transparent background, flat graphic design style, vector art quality, high contrast, minimal design, suitable for a sports game UI icon
```

---

### 2. Baseball Diamond Graphic

**Target dimensions:** 1024×1024 (1:1 square)
**Best generator:** Ideogram or Bing Image Creator
**Usage:** Top-down base runner display during Quick Manage mode. Bases, runner dots, and fielder positions will be overlaid by game code.

```
Top-down view of a baseball diamond, flat graphic design, clean minimalist style, bright green grass with light brown dirt infield, white base paths forming a perfect diamond shape, white bases at first second and third, home plate at the bottom, pitcher's mound in the center, dark green outfield fading at the edges, simple clean lines, no players, no text, no scoreboard, game UI asset style, vector quality, solid colors, 1:1 square aspect ratio
```

**Tip:** The simpler the better here — the game will overlay base runner indicators and fielder position dots dynamically. Avoid generators adding extra detail like players or stadium elements.

---

### 3. Scoreboard Graphic

**Target dimensions:** 1920×1080 (16:9)
**Best generator:** Bing Image Creator or Leonardo AI
**Usage:** Retro scoreboard template for box score display. All numbers/text will be overlaid by game code — this is just the empty frame.

```
Retro baseball scoreboard template, empty with no numbers or text, classic green chalkboard style, wooden frame border, spaces for 9 innings plus runs hits and errors columns, vintage ballpark aesthetic, warm stadium lighting glow, slightly weathered and worn look, clean grid lines where numbers would go but all slots are blank, 16:9 widescreen aspect ratio, flat illustration style with subtle texture, game UI asset
```

**Tip:** You want the grid structure visible but ALL cells empty. Generators love to add fake scores — regenerate until you get a clean empty template, or pick one where the numbers are easy to paint over in an image editor.

---

### 4. Card Template

**Target dimensions:** 683×1024 (2:3 portrait)
**Best generator:** Ideogram (for transparency) or Leonardo AI
**Usage:** Baseball card border/frame. The center will be filled dynamically by the game with a colored gradient background + player silhouette + stats overlay.

```
Baseball trading card frame template, empty center area, ornate metallic silver border with subtle baseball stitching pattern detail, rounded corners, classic trading card proportions 2:3 portrait, decorative border only with completely blank transparent center, premium sports card feel, clean graphic design, no text no player no photo, just the border frame, on a transparent background, game UI asset
```

**Tips:**
- The game assembles cards dynamically (background gradient → silhouette → stats), so you only need the border/frame.
- Generate a neutral metallic version. The game's CSS will tint/recolor the border per tier (Crown = purple/gold, Diamond = bright blue, Platinum = ice white, Gold = gold, Silver = silver, Bronze = copper, Common = simple).
- Alternatively, generate 7 separate card frames — one per tier — with the matching color scheme baked in. This gives more visual punch but requires more generation work.

#### Optional: Per-Tier Card Frames

If you want distinct frames per tier, use these modifier prompts appended to the base card template prompt above:

**Crown (99+ OVR):**
```
...deep purple and black gradient metallic border with gold lightning bolt accents, animated shimmer feel, royal premium luxury design, the most elite and prestigious card tier...
```

**Diamond (95-98 OVR):**
```
...dark background border with bright diamond-pattern geometric overlay, cool blue and white crystalline accents, premium prestige card tier...
```

**Platinum (90-94 OVR):**
```
...sleek platinum and white chrome gradient border, ice-blue accent highlights, clean premium modern feel, high-end card tier...
```

**Gold (80-89 OVR):**
```
...rich gold gradient metallic border with subtle geometric pattern, warm golden tones, classic premium card tier...
```

**Silver (70-79 OVR):**
```
...metallic silver gradient border with clean minimal lines, cool grey tones, solid respectable card tier...
```

**Bronze (55-69 OVR):**
```
...warm bronze and copper toned metallic border, slightly simpler design, rustic warmth, mid-level card tier...
```

**Common (Below 55 OVR):**
```
...simple solid colored border, minimal decoration, flat clean design, basic entry-level card tier...
```

---

### 5. Team Logos (30 total)

**Target dimensions:** 1024×1024 (1:1 square)
**Best generator:** Ideogram (transparency + text handling) or Bing Image Creator (volume)
**Usage:** Team identity across all screens. SVG conversion recommended after generation (use vectorizer.io or similar).

**Important:** These must be ORIGINAL designs — not copies of real MLB logos. Inspired by the city/team identity, but legally distinct.

#### Base Prompt Template

```
Professional baseball team logo, [TEAM_MODIFIER], clean vector graphic design, circular or shield emblem shape, bold typography, sports logo style, flat colors, suitable for a mobile game, on a transparent background, high contrast, crisp edges, no photorealism
```

Replace `[TEAM_MODIFIER]` with the team-specific description below.

#### Team Modifiers (All 30 Teams)

| Team | ID | Modifier |
|---|---|---|
| Arizona Diamondbacks | ARI | `desert rattlesnake coiled around a baseball, teal and red-brick color scheme, Southwestern desert motifs, aggressive angular design` |
| Atlanta Braves | ATL | `tomahawk crossed with a baseball bat, navy blue and scarlet red, bold Native-inspired geometric patterns, strong serif lettering` |
| Baltimore Orioles | BAL | `stylized oriole bird perched on a baseball, orange and black color scheme, classic East Coast sports crest, clean bold design` |
| Boston Red Sox | BOS | `pair of red stockings crossed over a baseball, navy blue and deep red, classic New England heritage style, vintage Americana feel` |
| Chicago Cubs | CHC | `bear cub holding a baseball bat, royal blue and red, classic round emblem, vintage Chicago sports style, friendly but bold` |
| Chicago White Sox | CWS | `gothic "Sox" lettering with a baseball, black and silver color scheme, sleek modern South Side Chicago edge, aggressive design` |
| Cincinnati Reds | CIN | `wishbone "C" letterform wrapped around a baseball, red and white, classic Midwest baseball heritage, clean retro design` |
| Cleveland Guardians | CLE | `art deco guardian wings or bridge motif, navy and red, inspired by Cleveland bridge architecture, bold geometric design` |
| Colorado Rockies | COL | `mountain range silhouette with a baseball emerging from the peaks, purple and silver and black, Rocky Mountain majesty, bold angular lines` |
| Detroit Tigers | DET | `fierce tiger face roaring, orange and navy blue, classic old English lettering influence, Detroit motor city grit, bold intimidating` |
| Houston Astros | HOU | `star orbiting around a baseball like a planet, orange and navy blue, space and aerospace theme, retro-futuristic design` |
| Kansas City Royals | KCR | `royal crown sitting atop a baseball, royal blue and gold, regal elegant design, clean serif typography, majestic feel` |
| Los Angeles Angels | LAA | `angel wing forming the letter A, red and white and silver, West Coast clean modern design, halo accent above` |
| Los Angeles Dodgers | LAD | `baseball with script lettering, Dodger blue and white, classic Hollywood glamour sports style, clean vintage script, iconic West Coast feel` |
| Miami Marlins | MIA | `leaping marlin fish with a baseball, vibrant Miami teal and pink and red, tropical art deco influence, dynamic motion` |
| Milwaukee Brewers | MIL | `baseball forming the shape of a grain kernel or hop, navy blue and gold, craft brewery heritage, clever negative space design` |
| Minnesota Twins | MIN | `two baseball players shaking hands over a river, navy and red, Twin Cities bridge motif, Midwest warmth and rivalry` |
| New York Mets | NYM | `stylized skyline silhouette with a baseball rising like a sun, orange and royal blue, New York City energy, bold metropolitan design` |
| New York Yankees | NYY | `interlocking NY monogram with a baseball, navy blue and white, pinstripe accent pattern, classic elegant timeless prestige, the most iconic style` |
| Athletics | OAK | `elephant stomping on a baseball, green and gold, classic Oakland athletics heritage, bold retro design, strong and playful` |
| Philadelphia Phillies | PHI | `liberty bell with a baseball as the clapper, red and white and blue, Philadelphia colonial heritage, bold patriotic design` |
| Pittsburgh Pirates | PIT | `skull and crossbones with crossed baseball bats, black and gold, steel city toughness, bold aggressive pirate theme` |
| San Diego Padres | SDP | `mission bell tower silhouette with a baseball, brown and gold and sand tones, Southern California mission style, warm classic design` |
| San Francisco Giants | SFG | `Golden Gate Bridge silhouette with a giant baseball, orange and black and cream, Bay Area landmark, bold West Coast design` |
| Seattle Mariners | SEA | `compass rose with a trident and baseball, teal and navy blue and silver, Pacific Northwest nautical theme, maritime heritage` |
| St. Louis Cardinals | STL | `cardinal bird perched on a baseball bat, bright red and white, classic St. Louis arch subtle background, timeless clean Midwest design` |
| Tampa Bay Rays | TBR | `stingray wrapped around a baseball with sunburst rays, navy blue and light blue and gold, tropical bay energy, dynamic modern design` |
| Texas Rangers | TEX | `lone star badge with a baseball at center, red white and blue, Texas ranger sheriff star motif, bold Lone Star state pride` |
| Toronto Blue Jays | TOR | `blue jay bird in flight carrying a baseball, royal blue and navy and red, maple leaf accent, Canadian sports pride, dynamic flight pose` |
| Washington Nationals | WSN | `capitol dome silhouette with a curly W and baseball, red and navy blue, Washington DC patriotic government heritage, clean bold design` |

**Tips:**
- Generate 3-5 per team and pick the cleanest, most recognizable one.
- Ideogram handles the text/lettering in logos far better than other generators.
- After picking winners, run through remove.bg for clean transparent PNGs.
- Consider vectorizing final logos with vectorizer.io for crisp SVG rendering at any game size.

---

### 6. Stadium Backgrounds (30 total)

**Target dimensions:** 1920×1080 (16:9 widescreen)
**Best generator:** Leonardo AI (best stylized illustration quality) or Bing Image Creator (volume)
**Usage:** Background images for team hub and game-day screens. Stylized/illustrated aesthetic, NOT photorealistic.

#### Base Prompt Template

```
Stylized illustrated baseball stadium, [STADIUM_MODIFIER], wide 16:9 panoramic view from behind home plate looking out toward the outfield, warm golden hour lighting, lush green grass, packed crowd in the stands, illustrated art style with painterly brushstrokes, vibrant saturated colors, slightly stylized not photorealistic, beautiful sky, suitable as a game background, high detail, widescreen cinematic composition
```

Replace `[STADIUM_MODIFIER]` with the stadium-specific description below.

#### Stadium Modifiers (All 30 Teams)

| Team | ID | Modifier |
|---|---|---|
| Arizona Diamondbacks | ARI | `retractable roof desert stadium, red rock desert landscape visible beyond the outfield, swimming pool area in right field, teal and red-brick accents, hot arid Arizona sunset sky` |
| Atlanta Braves | ATL | `modern suburban ballpark, red brick exterior, large battery entertainment district visible beyond outfield, Southern charm, warm Georgia evening sky with peach sunset tones` |
| Baltimore Orioles | BAL | `classic brick warehouse building beyond right field, old-school urban ballpark feel, orange and black seat accents, Inner Harbor of Baltimore visible, warm evening sky` |
| Boston Red Sox | BOS | `iconic tall green left field wall, manually operated scoreboard on the wall, cozy intimate old-school ballpark, red brick, Fenway neighborhood charm, New England autumn sky` |
| Chicago Cubs | CHC | `ivy-covered outfield walls, old red brick neighborhood buildings visible beyond outfield, vintage rooftop bleachers across the street, classic Wrigleyville charm, summer afternoon sky` |
| Chicago White Sox | CWS | `modern urban ballpark, exploding fireworks scoreboard in center field, black and silver industrial design accents, South Side Chicago skyline in background, dramatic night game lighting` |
| Cincinnati Reds | CIN | `riverfront ballpark with Ohio River visible beyond outfield, steamboat smokestacks in the distance, red accents throughout, historic Midwest baseball charm, warm sunset reflecting on river` |
| Cleveland Guardians | CLE | `downtown urban ballpark, art deco light fixtures and guardian statues, Cleveland cityscape beyond outfield, navy and red accents, dramatic Lake Erie sky, industrial heritage feel` |
| Colorado Rockies | COL | `mountain vista ballpark with snow-capped Rocky Mountains visible beyond the outfield wall, purple seats, mile-high thin air atmosphere, stunning mountain sunset, pine trees framing the scene` |
| Detroit Tigers | DET | `classic downtown ballpark, Detroit skyline with Renaissance Center visible, ornate tiger statues at the entrance, vintage Americana feel, autumn evening Motor City sky` |
| Houston Astros | HOU | `retractable roof stadium, modern space-age design elements, Houston skyline visible, train running along left field, orange and navy accents, dramatic Texas sunset sky through open roof` |
| Kansas City Royals | KCR | `brand new modern ballpark, iconic water fountains in the outfield, royal blue seats, crown-shaped scoreboard, Kansas City skyline, wide open Midwest sky with golden sunset` |
| Los Angeles Angels | LAA | `large rock formation waterfall in center field, mountain views of Anaheim Hills beyond outfield, red and silver accents, palm trees, perfect Southern California blue sky with warm light` |
| Los Angeles Dodgers | LAD | `hillside stadium with San Gabriel Mountains visible, palm trees swaying, Dodger blue seats, classic mid-century modern design, iconic ravine setting, perfect LA golden sunset sky` |
| Miami Marlins | MIA | `retractable roof tropical stadium, Miami skyline visible, art deco design elements, teal and coral color accents, vibrant tropical atmosphere, sculpted fish fountain in center field` |
| Milwaukee Brewers | MIL | `retractable fan-shaped roof stadium, tailgate area visible in parking lot, Midwestern charm, navy and gold accents, giant slide in left field, Wisconsin summer evening sky` |
| Minnesota Twins | MIN | `modern downtown ballpark, Minneapolis skyline with IDS tower visible, covered cantilevered canopy, large limestone facade, winter-ready design, dramatic Midwest sky, Target Plaza overlay` |
| New York Mets | NYM | `modern ballpark with large apple sculpture in center field, New York City skyline in the distance, orange and blue accents, Queens neighborhood feel, dramatic East Coast sunset` |
| New York Yankees | NYY | `grand cathedral-like stadium, ornate white frieze decorations along the upper deck, Monument Park beyond center field, navy and white pinstripe elegance, Bronx twilight sky, ultimate prestige` |
| Athletics | OAK | `brand new waterfront ballpark, Oakland/Sacramento urban skyline, green and gold accents, modern minimalist design, Bay Area fog rolling in, Pacific Coast sunset glow` |
| Philadelphia Phillies | PHI | `urban ballpark with Philadelphia skyline visible, Liberty Bell replica, red brick and steel construction, South Philly neighborhood energy, bold red accents, dramatic East Coast sky` |
| Pittsburgh Pirates | PIT | `riverfront ballpark with iconic yellow bridge visible beyond center field, Pittsburgh three rivers converging, dramatic cliffs, black and gold accents, steel city sunset reflecting on water` |
| San Diego Padres | SDP | `open-air downtown ballpark, San Diego Bay and harbor visible beyond outfield, palm trees, Western metal building facade, brown and gold sand tones, perfect Pacific sunset sky` |
| San Francisco Giants | SFG | `waterfront ballpark with San Francisco Bay beyond right field, kayakers in McCovey Cove, fog rolling over hills, orange and cream accents, iconic Bay Area atmosphere, bridge in distance` |
| Seattle Mariners | SEA | `retractable roof stadium, Mount Rainier visible in the distance, Pacific Northwest evergreen trees, teal and navy accents, crane and harbor visible, moody beautiful Seattle sky with clearing clouds` |
| St. Louis Cardinals | STL | `classic downtown ballpark with the Gateway Arch prominently visible beyond center field, red seats and brick accents, Mississippi River in the background, warm Midwest sunset sky` |
| Tampa Bay Rays | TBR | `modern open-air stadium with Tampa Bay waterfront visible, palm trees, tropical sunset, navy and light blue and gold accents, catwalks and modern angular design, Florida evening sky` |
| Texas Rangers | TEX | `retractable roof modern mega-stadium, Texas-sized everything, red white and blue accents, lone star motifs, Arlington skyline, massive video board, dramatic Texas thunderstorm sky clearing at sunset` |
| Toronto Blue Jays | TOR | `retractable roof stadium with CN Tower prominently visible beyond the outfield, Toronto skyline, royal blue seats, Canadian flag flying, dramatic Lake Ontario sky, urban Canadian energy` |
| Washington Nationals | WSN | `classic ballpark with US Capitol dome visible beyond center field, cherry blossom trees along the concourse, red and navy patriotic color accents, presidential monuments in distance, DC sunset sky` |

**Tips:**
- Leonardo AI's "Illustration" or "Creative" presets give the best stylized look for these.
- Generate in landscape/widescreen mode (16:9 if the generator supports aspect ratio selection).
- Consistency matters — try to use the same generator and similar settings for all 30 so they feel like a cohesive set.
- The "warm golden hour lighting" in the base prompt helps unify the set. Swap to "dramatic night game lighting with stadium floodlights" for a night variant if desired.

---

## Quick Reference: Generator × Asset Type Matrix

| Asset | Best Generator | Backup | Transparency? | Volume |
|---|---|---|---|---|
| Player Silhouettes | Ideogram | Bing + remove.bg | Yes (critical) | 6 images |
| Baseball Diamond | Ideogram | Bing | Nice to have | 1 image |
| Scoreboard | Bing Image Creator | Leonardo AI | No | 1 image |
| Card Template | Ideogram | Leonardo AI | Yes (critical) | 1-7 images |
| Team Logos | Ideogram | Bing | Yes (critical) | 30 images |
| Stadium Backgrounds | Leonardo AI | Bing | No | 30 images |
| **Total** | | | | **~69-75 images** |

## Workflow Recommendation

1. **Start with silhouettes** (Ideogram) — these are the most important and hardest to get right. Budget a full day.
2. **Then logos** (Ideogram) — do all 30 in batches. This will eat through several days of free Ideogram credits (10 prompts/day × ~3-5 prompts per team to get a good one).
3. **Then stadiums** (Leonardo AI or Bing) — straightforward with the base prompt. Bing's unlimited generations help here.
4. **Then scoreboard + diamond + card template** — one-offs, quick to knock out.
5. **Post-processing pass** — run all assets through remove.bg as needed, resize to target dimensions, organize into the game's asset folders.

**Estimated total generation time:** 5-10 days using free tiers (limited by daily credit caps). Can be done in 1-2 days if you use Bing Image Creator for volume alongside Ideogram for transparency-critical assets.

---

## File Naming Convention

Save final assets using these names to match the game's expected file structure:

```
assets/
├── silhouettes/
│   ├── pitcher-right.png
│   ├── pitcher-left.png
│   ├── hitter-right.png
│   ├── hitter-left.png
│   ├── fielder-right.png
│   └── fielder-left.png
├── ui/
│   ├── diamond.png
│   ├── scoreboard.png
│   └── card-template.png          (or card-template-crown.png, etc.)
├── logos/
│   ├── ARI.png (or .svg)
│   ├── ATL.png
│   ├── BAL.png
│   └── ... (all 30 team IDs)
└── stadiums/
    ├── ARI.png
    ├── ATL.png
    ├── BAL.png
    └── ... (all 30 team IDs)
```
