// utils/colorFormatter.ts

// Types pour les couleurs supportées
export type SupportedColorFormat = 'hex' | 'rgb' | 'hsl';

export interface ColorConversionResult {
  success: boolean;
  color?: string;
  error?: string;
}

// Couples de couleurs de fallback pour les couleurs non supportées
const colorFallbacks: Record<string, string> = {
  'oklch': '#6b7280', // Gris pour oklch
  'lab': '#6b7280',   // Gris pour lab
  'lch': '#6b7280',   // Gris pour lch
  'color': '#6b7280', // Gris pour color() function
};

/**
 * Convertit une couleur CSS en format hexadécimal supporté par PDF
 */
export const normalizeColorForPdf = (cssColor: string): ColorConversionResult => {
  if (!cssColor || typeof cssColor !== 'string') {
    return { 
      success: false, 
      error: 'Invalid color input' 
    };
  }

  const trimmedColor = cssColor.trim().toLowerCase();

  // Déjà en hexadécimal valide
  if (/^#([a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/.test(trimmedColor)) {
    return { 
      success: true, 
      color: trimmedColor 
    };
  }

  // Couleur nommée CSS
  const namedColor = convertNamedColor(trimmedColor);
  if (namedColor) {
    return { 
      success: true, 
      color: namedColor 
    };
  }

  // Fonction RGB/RGBA
  if (trimmedColor.startsWith('rgb')) {
    return convertRgbToHex(trimmedColor);
  }

  // Fonction HSL/HSLA
  if (trimmedColor.startsWith('hsl')) {
    return convertHslToHex(trimmedColor);
  }

  // Fonctions CSS modernes non supportées - utiliser fallback
  if (trimmedColor.startsWith('oklch') || 
      trimmedColor.startsWith('lab') || 
      trimmedColor.startsWith('lch') ||
      trimmedColor.startsWith('color(')) {
    console.warn(`Unsupported color function: ${trimmedColor}, using fallback`);
    return { 
      success: true, 
      color: colorFallbacks[trimmedColor.split('(')[0]] || '#6b7280' 
    };
  }

  return { 
    success: false, 
    error: `Unsupported color format: ${trimmedColor}` 
  };
};

/**
 * Convertit les couleurs nommées CSS en hexadécimal
 */
const convertNamedColor = (colorName: string): string | null => {
  const namedColors: Record<string, string> = {
    // Couleurs de base
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'green': '#008000',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'silver': '#c0c0c0',
    'gray': '#808080',
    'grey': '#808080',
    'maroon': '#800000',
    'olive': '#808000',
    'lime': '#00ff00',
    'aqua': '#00ffff',
    'teal': '#008080',
    'navy': '#000080',
    'fuchsia': '#ff00ff',
    'purple': '#800080',
    
    // Couleurs étendues
    'orange': '#ffa500',
    'pink': '#ffc0cb',
    'brown': '#a52a2a',
    'coral': '#ff7f50',
    'gold': '#ffd700',
    'indigo': '#4b0082',
    'violet': '#ee82ee',
    'turquoise': '#40e0d0',
    
    // Nuances de gris
    'darkgray': '#a9a9a9',
    'darkgrey': '#a9a9a9',
    'darkslategray': '#2f4f4f',
    'darkslategrey': '#2f4f4f',
    'dimgray': '#696969',
    'dimgrey': '#696969',
    'lightgray': '#d3d3d3',
    'lightgrey': '#d3d3d3',
    'lightslategray': '#778899',
    'lightslategrey': '#778899',
    'slategray': '#708090',
    'slategrey': '#708090',
  };

  return namedColors[colorName] || null;
};

/**
 * Convertit RGB/RGBA en hexadécimal
 */
const convertRgbToHex = (rgbString: string): ColorConversionResult => {
  try {
    // Extraire les valeurs numériques
    const values = rgbString.match(/(\d+\.?\d*)/g);
    if (!values || values.length < 3) {
      return { 
        success: false, 
        error: 'Invalid RGB format' 
      };
    }

    const r = Math.max(0, Math.min(255, parseInt(values[0])));
    const g = Math.max(0, Math.min(255, parseInt(values[1])));
    const b = Math.max(0, Math.min(255, parseInt(values[2])));

    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    
    return { 
      success: true, 
      color: hex 
    };
  } catch (error) {
    return { 
      success: false, 
      error: `RGB conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Convertit HSL/HSLA en hexadécimal
 */
const convertHslToHex = (hslString: string): ColorConversionResult => {
  try {
    // Extraire les valeurs
    const values = hslString.match(/(\d+\.?\d*)/g);
    if (!values || values.length < 3) {
      return { 
        success: false, 
        error: 'Invalid HSL format' 
      };
    }

    const h = parseFloat(values[0]) / 360;
    const s = parseFloat(values[1]) / 100;
    const l = parseFloat(values[2]) / 100;

    // Conversion HSL vers RGB
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    // RGB vers hexadécimal
    const toHex = (x: number): string => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    
    return { 
      success: true, 
      color: hex 
    };
  } catch (error) {
    return { 
      success: false, 
      error: `HSL conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Normalise toutes les couleurs d'un groupe pour le PDF
 */
export const normalizeGroupColorsForPdf = (groups: Array<{ color: string }>): Array<{ color: string; originalColor: string }> => {
  return groups.map(group => {
    const normalized = normalizeColorForPdf(group.color);
    
    if (normalized.success && normalized.color) {
      return {
        color: normalized.color,
        originalColor: group.color
      };
    } else {
      console.warn(`Failed to normalize color "${group.color}": ${normalized.error}, using fallback`);
      return {
        color: '#6b7280', // Gris de fallback
        originalColor: group.color
      };
    }
  });
};

/**
 * Valide si une couleur est supportée pour le PDF
 */
export const isColorSupportedForPdf = (cssColor: string): boolean => {
  const result = normalizeColorForPdf(cssColor);
  return result.success;
};