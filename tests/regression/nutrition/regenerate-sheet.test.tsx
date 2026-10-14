/**
 * Issue #36 — design screens 30c/30d/30e (design-spec.md). Today's `RegenerateSheet` (currently a
 * private function inside `MealPlanScreen.tsx`) closes only on a successful regenerate — a 429
 * daily-limit error leaves the sheet open with nothing visible changing
 * (`MealPlanScreen.tsx:83-86`, `:174` draws the banner behind the open modal at `:270`). It also
 * has the wrong 30d layout (note above the chips, "I like cooking" instead of "I actually like
 * cooking", an undesigned budget question folded into the same step). This protects the new
 * standalone `RegenerateSheet` component: 30c unchanged, 30d's fixed copy/order, and the new 30e
 * quota-reached branch that must win over any other step and never show invented numbers or tier
 * wording.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { RegenerateSheet } from '@/features/nutrition/components/RegenerateSheet';
import type { QuotaExceededError } from '@/shared/types/mealPlan';

function renderSheet(overrides: Partial<React.ComponentProps<typeof RegenerateSheet>> = {}) {
  const props: React.ComponentProps<typeof RegenerateSheet> = {
    visible: true,
    reason: 'too_boring',
    contextAsk: null,
    budget: 'moderate',
    cooking: 'once_daily',
    saving: false,
    quotaError: null,
    onReason: jest.fn(),
    onBudget: jest.fn(),
    onCooking: jest.fn(),
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    ...overrides,
  };
  render(<RegenerateSheet {...props} />);
  return props;
}

const REASON_CHIPS_IN_ORDER = [
  'Too boring',
  'Too expensive',
  'Too much cooking',
  "Don't like these foods",
  'Need more protein',
  'Make it lighter',
  'Different cuisine',
  'Surprise me',
];

describe('nutrition: RegenerateSheet (issue #36, design 30c/30d/30e)', () => {
  describe('30c — reason picker (unchanged)', () => {
    it('shows the title, subtitle and all 8 chips in order', () => {
      renderSheet();
      expect(screen.getByText("What's not working today?")).toBeTruthy();
      expect(screen.getByText("Pick one — I'll rebuild around it.")).toBeTruthy();
      const texts = REASON_CHIPS_IN_ORDER.map((label) => screen.getByText(label));
      expect(texts).toHaveLength(8);
    });

    it('tapping a chip calls onReason with that reason', () => {
      const props = renderSheet();
      fireEvent.press(screen.getByText('Need more protein'));
      expect(props.onReason).toHaveBeenCalledWith('need_more_protein');
    });

    it('pressing "Regenerate plan" calls onSubmit', () => {
      const props = renderSheet();
      fireEvent.press(screen.getByText('Regenerate plan'));
      expect(props.onSubmit).toHaveBeenCalled();
    });
  });

  describe('30d — contextual ask (fixed layout/copy)', () => {
    it('shows the "Just one quick thing" eyebrow', () => {
      renderSheet({ contextAsk: 'cooking' });
      expect(screen.getByText('Just one quick thing')).toBeTruthy();
    });

    it('shows the exact chip copy "I actually like cooking" (not "I like cooking")', () => {
      renderSheet({ contextAsk: 'cooking' });
      expect(screen.getByText('I actually like cooking')).toBeTruthy();
      expect(screen.queryByText('I like cooking')).toBeNull();
    });

    it('renders the note after the three chips, not before them', () => {
      renderSheet({ contextAsk: 'cooking' });
      const flattened = JSON.stringify(screen.toJSON());
      const lastChipIndex = flattened.indexOf('I actually like cooking');
      const noteIndex = flattened.indexOf('This makes future plans fit better');
      expect(lastChipIndex).toBeGreaterThan(-1);
      expect(noteIndex).toBeGreaterThan(lastChipIndex);
    });

    it('shows "Continue" as the button label', () => {
      renderSheet({ contextAsk: 'cooking' });
      expect(screen.getByText('Continue')).toBeTruthy();
    });
  });

  describe('30e — quota reached', () => {
    const QUOTA_ERROR: QuotaExceededError = {
      error: 'quota_exceeded',
      action: 'plan_regenerate',
      message: "You've used all your regenerates for today.",
      limit: 2,
      tier: 'free',
      quota_resets_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    };

    it('shows a dimmed title and exactly the two chips the design shows, nothing else', () => {
      renderSheet({ quotaError: QUOTA_ERROR });
      expect(screen.getByText("What's not working today?")).toBeTruthy();
      expect(screen.getByText('Too boring')).toBeTruthy();
      expect(screen.getByText('Too expensive')).toBeTruthy();
      expect(screen.queryByText('Too much cooking')).toBeNull();
      expect(screen.queryByText('Surprise me')).toBeNull();
    });

    it('shows the "Today\'s regenerates are spent" eyebrow and "Keep today\'s plan" button', () => {
      renderSheet({ quotaError: QUOTA_ERROR });
      expect(screen.getByText("Today's regenerates are spent")).toBeTruthy();
      expect(screen.getByText("Keep today's plan")).toBeTruthy();
    });

    it('builds the body copy from the real limit and reset time, not a hardcoded "3"/"14 hours"', () => {
      renderSheet({ quotaError: QUOTA_ERROR });
      expect(
        screen.getByText(
          /You've used all 2 for today\. More unlock in .+ — today's plan still stands, and it's a good one\./,
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/all 3 for today/)).toBeNull();
      expect(screen.queryByText(/14 hours/)).toBeNull();
    });

    it('reflects a different limit/reset value from the error, proving the copy is derived', () => {
      renderSheet({
        quotaError: {
          ...QUOTA_ERROR,
          limit: 5,
          quota_resets_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        },
      });
      expect(screen.getByText(/You've used all 5 for today\./)).toBeTruthy();
    });

    it('never shows tier or "/day" wording', () => {
      renderSheet({ quotaError: QUOTA_ERROR });
      expect(screen.queryByText(/free/i)).toBeNull();
      expect(screen.queryByText(/premium/i)).toBeNull();
      expect(screen.queryByText(/\/day/)).toBeNull();
    });

    it('pressing "Keep today\'s plan" calls onClose', () => {
      const props = renderSheet({ quotaError: QUOTA_ERROR });
      fireEvent.press(screen.getByText("Keep today's plan"));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('wins over an in-progress contextAsk step', () => {
      renderSheet({ contextAsk: 'cooking', quotaError: QUOTA_ERROR });
      expect(screen.getByText("Today's regenerates are spent")).toBeTruthy();
      expect(screen.queryByText('Just one quick thing')).toBeNull();
      expect(screen.queryByText('I actually like cooking')).toBeNull();
    });
  });
});
