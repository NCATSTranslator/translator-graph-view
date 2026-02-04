// Color palette for biolink types
const COLOR_PALETTE = [
  '#4285F4', // Blue
  '#EA4335', // Red
  '#FBBC04', // Yellow
  '#34A853', // Green
  '#FF6D01', // Orange
  '#46BDC6', // Teal
  '#7BAAF7', // Light Blue
  '#F07B72', // Light Red
  '#FCD04F', // Light Yellow
  '#57BB8A', // Light Green
  '#FF994D', // Light Orange
  '#78D9E0', // Light Teal
  '#9C27B0', // Purple
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#8BC34A', // Lime
  '#FF5722', // Deep Orange
  '#607D8B', // Blue Grey
];

// Simple hash function to generate consistent colors from strings
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Cache for type colors
const colorCache = new Map<string, string>();

/**
 * Generate a consistent color for a biolink type
 * @param type - The biolink type (e.g., "biolink:Drug")
 * @returns A hex color string
 */
export function getColorForType(type: string): string {
  if (colorCache.has(type)) {
    return colorCache.get(type)!;
  }

  const hash = hashString(type);
  const color = COLOR_PALETTE[hash % COLOR_PALETTE.length];
  colorCache.set(type, color);
  return color;
}

/**
 * Extract the simple type name from a biolink type
 * @param type - The full biolink type (e.g., "biolink:Drug")
 * @returns The simplified type name (e.g., "Drug")
 */
export function simplifyTypeName(type: string): string {
  if (type.startsWith('biolink:')) {
    return type.replace('biolink:', '');
  }
  // Handle other prefixes
  const colonIndex = type.indexOf(':');
  if (colonIndex !== -1) {
    return type.substring(colonIndex + 1);
  }
  return type;
}

/**
 * Get the primary type from a list of types
 * Uses the first type as the primary one
 */
export function getPrimaryType(types: string[]): string {
  return types[0] || 'Unknown';
}
