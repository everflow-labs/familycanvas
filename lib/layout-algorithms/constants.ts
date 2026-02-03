// lib/layout-algorithms/constants.ts
// Sane defaults taken from the Auto-Layout Pseudocode constants section. :contentReference[oaicite:1]{index=1}

// Shared (leaf / node)
export const LEAF_WIDTH = 120;          // :contentReference[oaicite:2]{index=2}
export const LEAF_HEIGHT = 80;          // :contentReference[oaicite:3]{index=3}
export const CONNECTOR_PADDING = 20;    // :contentReference[oaicite:4]{index=4}

// Timeline layout
export const TIMELINE_YEAR_HEIGHT = 100;        // pixels per year :contentReference[oaicite:5]{index=5}
export const TIMELINE_MIN_SIBLING_GAP = 140;    // horizontal gap between siblings :contentReference[oaicite:6]{index=6}
export const TIMELINE_PARTNER_GAP = 120;        // gap between partners :contentReference[oaicite:7]{index=7}
export const TIMELINE_GENERATION_BAND = 40;     // vertical tolerance for "same generation" :contentReference[oaicite:8]{index=8}

// Used when deriving Y from parents for unknown birth dates: ~25 years below parents
export const TIMELINE_CHILD_YEARS_OFFSET = 25;  // :contentReference[oaicite:9]{index=9}

// Compact layout
export const COMPACT_ROW_HEIGHT = 100;          // vertical space per row :contentReference[oaicite:10]{index=10}
export const COMPACT_BRANCH_INDENT = 150;       // horizontal indent per generation :contentReference[oaicite:11]{index=11}
export const COMPACT_PARTNER_GAP = 120;         // gap to partners :contentReference[oaicite:12]{index=12}

// Canvas padding / starting offsets (pseudocode uses margins like 50–100px)
export const CANVAS_MARGIN_X = 100; // aligns with timelineLayout globalXOffset=100 :contentReference[oaicite:13]{index=13}
export const CANVAS_MARGIN_Y = 50;  // compact pseudocode uses 50px top margin :contentReference[oaicite:14]{index=14}
