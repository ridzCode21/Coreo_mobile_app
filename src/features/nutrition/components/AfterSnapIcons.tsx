import Svg, { Path } from 'react-native-svg';

import { colors, componentSizes } from '@/shared/theme/tokens';

export function AfterSnapBackIcon() {
  return (
    <Svg
      width={componentSizes.mealReviewBackIcon}
      height={componentSizes.mealReviewBackIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.ink80}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AfterSnapCheckIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={colors.white}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
