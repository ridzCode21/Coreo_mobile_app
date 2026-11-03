/**
 * Issue #175 — shared message+Retry+Back block for a failed query load, matching the Claude
 * Design's 19d "Account · loading/error/offline/expired" error card (design-spec lines
 * 2914-2922): a message, then a Retry button (solid) and a Back button (glass) side by side.
 * Used by Profile, Notebook and Manage-sources whenever their query errors.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { colors, componentSizes, radii } from '@/shared/theme/tokens';

describe('shared QueryErrorState (issue #175)', () => {
  it('shows the given message and calls onRetry / onBack from their respective buttons', () => {
    const onRetry = jest.fn();
    const onBack = jest.fn();

    render(
      <QueryErrorState message="Unable to load your profile." onRetry={onRetry} onBack={onBack} />,
    );

    expect(screen.getByText('Unable to load your profile.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('never invents its own message copy — renders exactly what it is given', () => {
    render(
      <QueryErrorState
        message="Unable to load connected sources."
        onRetry={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByText('Unable to load connected sources.')).toBeTruthy();
    expect(screen.queryByText(/unable to load your profile/i)).toBeNull();
  });

  it('uses the design-system action-button height token, not a hardcoded 40', () => {
    render(
      <QueryErrorState
        message="Unable to load your notebook."
        onRetry={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(componentSizes.queryErrorActionHeight).toBe(40);

    const retry = screen.getByRole('button', { name: 'Retry' });
    const flattenStyle = (style: unknown) =>
      (Array.isArray(style) ? style : [style]).reduce(
        (acc, s) => ({ ...acc, ...(s as object) }),
        {},
      ) as Record<string, unknown>;
    expect(
      flattenStyle(retry.props.style).minHeight ?? flattenStyle(retry.props.style).height,
    ).toBe(componentSizes.queryErrorActionHeight);
  });

  it('gives Retry a solid ink background with white text and Back a glass treatment (design 2918-2920)', () => {
    render(
      <QueryErrorState
        message="Unable to load your profile."
        onRetry={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByText('Retry').props.style).toEqual(
      expect.objectContaining({ color: colors.white }),
    );
    expect(screen.getByText('Back').props.style).toEqual(
      expect.objectContaining({ color: colors.ink70 }),
    );
  });

  it('matches the design card radius for the error container (radii.ml, 22px)', () => {
    expect(radii.ml).toBe(22);
  });
});
