import { fireEvent, render, screen } from '@testing-library/react-native';

import { BackButton } from '@/shared/components/BackButton';

describe('shared BackButton', () => {
  it('exposes the shared accessible back control and calls its handler', () => {
    const onPress = jest.fn();

    render(<BackButton onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
