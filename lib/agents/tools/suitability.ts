import type { WeatherState, UserProfile } from '@/lib/types';
import type { CatalogProduct } from './productCatalog';

export interface ActivesDecision {
  recommended: string[];
  blocked: string[];
  notes: string[];
}

function uniqueLower(list: string[]): string[] {
  return Array.from(new Set(list.map(s => s.toLowerCase().trim()))).filter(Boolean);
}

export function computeActivesForCondition(
  condition: string,
  user: Pick<UserProfile, 'skinType' | 'fitzpatrickScale'>,
  weather: WeatherState
): ActivesDecision {
  const c = (condition || '').toLowerCase();
  const isDark = (user.fitzpatrickScale ?? 3) >= 4;
  const isSensitive = user.skinType === 'sensitive';
  const isDry = user.skinType === 'dry';
  const isOily = user.skinType === 'oily';
  const isCombo = user.skinType === 'combination';

  const rec: string[] = [];
  const block: string[] = [];
  const notes: string[] = [];

  if (c.includes('acne')) {
    rec.push('niacinamide');
    if (isOily || isCombo || weather.isHighHumidity) rec.push('salicylic acid');
    if (isDry || isSensitive || weather.isDryWeather) rec.push('azelaic acid');
    // Equity: dark skin → avoid BP, prefer azelaic/mandelic
    if (isDark) {
      block.push('benzoyl peroxide');
      rec.push('azelaic acid', 'mandelic acid');
      notes.push('Avoid BP on dark skin to reduce PIH risk; prefer azelaic/mandelic.');
    } else {
      // Light-to-medium tones can use BP if not sensitive
      if (!isSensitive) rec.push('benzoyl peroxide');
    }
  } else if (c.includes('hyperpigmentation') || c.includes('pih')) {
    rec.push('azelaic acid', 'niacinamide', 'vitamin c');
    if (isDark) block.push('hydroquinone'); // conservative
  } else if (c.includes('dark_circles') || c.includes('dark circles')) {
    rec.push('niacinamide', 'vitamin c', 'caffeine');
  } else {
    // default cosmetic maintenance
    rec.push('niacinamide', 'hyaluronic acid', 'ceramides');
  }

  // Environment overlays
  if (weather.isHighUV) {
    block.push('retinol', 'retinoid');
    notes.push('High UV: avoid retinoids; ensure daily sunscreen.');
    rec.push('zinc oxide', 'titanium dioxide');
  }
  if (weather.isHighHumidity) {
    notes.push('High humidity: prefer lightweight gel textures.');
  }
  if (weather.isDryWeather) {
    rec.push('ceramides', 'shea butter', 'squalane', 'urea');
    notes.push('Dry weather: emphasize barrier support.');
    if (isSensitive) {
      notes.push('Sensitive + dry: keep acids mild and localized.');
    }
  }

  return {
    recommended: uniqueLower(rec),
    blocked: uniqueLower(block),
    notes,
  };
}

export interface ProductScore {
  product: CatalogProduct;
  score: number; // matches - penalties
  matches: string[];
  conflicts: string[];
}

export function scoreProductsBySuitability(
  products: CatalogProduct[],
  decision: ActivesDecision
): ProductScore[] {
  const recSet = new Set(decision.recommended);
  const blockSet = new Set(decision.blocked);
  return products.map((p) => {
    const ingredients = p.ingredients;
    const matches = decision.recommended.filter(a =>
      ingredients.some(ing => ing.includes(a))
    );
    const conflicts = decision.blocked.filter(a =>
      ingredients.some(ing => ing.includes(a))
    );
    const score = matches.length - conflicts.length * 2; // penalize conflicts more
    return { product: p, score, matches, conflicts };
  }).sort((a, b) => b.score - a.score);
}

export function filterSuitableProducts(
  products: CatalogProduct[],
  decision: ActivesDecision,
  limit: number = 5
) {
  const scored = scoreProductsBySuitability(products, decision);
  return scored.filter(s => s.score > 0).slice(0, limit);
}


