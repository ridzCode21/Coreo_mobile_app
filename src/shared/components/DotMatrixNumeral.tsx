import Svg, { Circle } from 'react-native-svg';

const FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '010', '010', '111'],
  '2': ['111', '001', '001', '111', '100', '100', '111'],
  '3': ['111', '001', '001', '111', '001', '001', '111'],
  '4': ['101', '101', '101', '111', '001', '001', '001'],
  '5': ['111', '100', '100', '111', '001', '001', '111'],
  '6': ['111', '100', '100', '111', '101', '101', '111'],
  '7': ['111', '001', '001', '010', '010', '010', '010'],
  '8': ['111', '101', '101', '111', '101', '101', '111'],
  '9': ['111', '101', '101', '111', '001', '001', '111'],
};

type DotMatrixNumeralProps = {
  value: number | string;
  color: string;
  cell?: number;
  offColor?: string;
};

export function DotMatrixNumeral({
  value,
  color,
  cell = 7,
  offColor = 'rgba(23,25,29,0.1)',
}: DotMatrixNumeralProps) {
  const chars = String(value)
    .split('')
    .filter((char) => FONT[char]);
  const gap = cell * 0.55;
  const charWidth = cell * 3 + gap * 2;
  const width = Math.max(cell, chars.length * charWidth - gap);
  const height = cell * 7 + gap * 6;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {chars.map((char, charIndex) => {
        const rows = FONT[char];
        const offsetX = charIndex * charWidth;
        return rows.flatMap((row, rowIndex) =>
          row.split('').map((dot, colIndex) => {
            const cx = offsetX + colIndex * (cell + gap) + cell / 2;
            const cy = rowIndex * (cell + gap) + cell / 2;
            return (
              <Circle
                key={`${charIndex}-${rowIndex}-${colIndex}`}
                cx={cx}
                cy={cy}
                r={cell / 2}
                fill={dot === '1' ? color : offColor}
              />
            );
          }),
        );
      })}
    </Svg>
  );
}
