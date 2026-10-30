import { formatMultiplier } from './portionEstimate';

type LabelPerServing = {
  est_calories: number;
  est_protein_g: number;
  est_carbs_g: number;
  est_fat_g: number;
};

export type ScaledLabelServing = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function roundGram(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scaleLabelServing(
  perServing: LabelPerServing,
  multiplier: number,
): ScaledLabelServing {
  return {
    calories: Math.round(perServing.est_calories * multiplier),
    protein_g: roundGram(perServing.est_protein_g * multiplier),
    carbs_g: roundGram(perServing.est_carbs_g * multiplier),
    fat_g: roundGram(perServing.est_fat_g * multiplier),
  };
}

export function clampServingsMultiplier(value: number, servingsPerContainer: number): number {
  return Math.min(Math.max(value, 1), servingsPerContainer);
}

export function formatServingsLabel(multiplier: number): string {
  const amount = Number(multiplier.toFixed(2));
  return `${amount} ${amount === 1 ? 'serving' : 'servings'}`;
}

type LabelPortionLine = {
  servingSizeText: string | null;
  portionGrams: number;
  servingsPerContainer: number | null;
};

export function formatLabelPortionLine({
  servingSizeText,
  portionGrams,
  servingsPerContainer,
}: LabelPortionLine): string {
  const primary = servingSizeText ?? `${formatMultiplier(portionGrams)}g`;
  const servings =
    servingsPerContainer === null
      ? null
      : `${formatServingsLabel(servingsPerContainer)} per container`;

  return servings ? `${primary} · ${servings}` : primary;
}
