import type { MealCategory } from '@shared/types';

/**
 * Kuratierte Schnellauswahl für die Einkaufsliste (keine externe Rezept-API) – ein Klick trägt
 * den Artikel direkt mit sinnvoller Menge und Kategorie ein.
 */
export interface MealSuggestion {
  item: string;
  quantity?: string;
}

export const MEAL_SUGGESTIONS: Record<MealCategory, MealSuggestion[]> = {
  breakfast: [
    { item: 'Brötchen', quantity: '1–2 pro Person' },
    { item: 'Butter' },
    { item: 'Marmelade' },
    { item: 'Eier', quantity: '1 Karton' },
    { item: 'Kaffee' },
    { item: 'Orangensaft' },
  ],
  lunch: [
    { item: 'Nudeln', quantity: '1 kg' },
    { item: 'Tomatensauce' },
    { item: 'Salat' },
    { item: 'Brot' },
    { item: 'Käse' },
  ],
  dinner: [
    { item: 'Grillfleisch', quantity: '0,3 kg pro Person' },
    { item: 'Grillgemüse' },
    { item: 'Käseplatte' },
    { item: 'Wein' },
    { item: 'Bier' },
    { item: 'Chips & Snacks' },
  ],
  other: [
    { item: 'Wasser', quantity: 'still & sprudelnd' },
    { item: 'Kaffee & Tee' },
    { item: 'Spülmittel' },
    { item: 'Müllsäcke' },
  ],
};
