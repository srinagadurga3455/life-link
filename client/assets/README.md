# LifeLink App Assets

## Required Files

Place the following image files in this directory:

### 1. icon.png
- **Size:** 1024x1024 pixels
- **Format:** PNG
- **Purpose:** Main app icon (iOS & Android)
- **Design:** White heart-pulse icon on #1963eb blue background

### 2. adaptive-icon.png
- **Size:** 1024x1024 pixels
- **Format:** PNG with transparency
- **Purpose:** Android adaptive icon foreground layer
- **Design:** White heart-pulse icon (centered with padding)

### 3. splash.png
- **Size:** 1284x2778 pixels (or similar ratio)
- **Format:** PNG
- **Purpose:** Splash screen image
- **Design:** Heart-pulse icon with "LifeLink" branding

## Quick Generation

### Using Icon Kitchen (Recommended)
1. Visit: https://icon.kitchen/
2. Upload or create a heart-pulse icon
3. Set background to #1963eb
4. Download all sizes
5. Place in this folder

### Using Canva
1. Create new design (1024x1024)
2. Background: #1963eb
3. Add heart-pulse icon (white)
4. Export as PNG

## Color Palette
- Primary Blue: `#1963eb`
- Icon/Text: `#FFFFFF` (white)

## After Adding Icons
Run: `npx expo prebuild --clean`

See `ICON_SETUP_GUIDE.md` for detailed instructions.
