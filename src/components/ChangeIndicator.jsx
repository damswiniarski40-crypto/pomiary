import { calculateChange } from '../utils/comparison';

export default function ChangeIndicator({ current, previous }) {
  const result = calculateChange(current, previous);
  if (!result) return null;

  const { diff, direction } = result;

  if (direction === 'same') {
    return <span className="change neutral">=</span>;
  }

  const isUp = direction === 'up';
  return (
    <span className={`change ${isUp ? 'up' : 'down'}`}>
      {isUp ? '↑' : '↓'} {isUp ? '+' : ''}{diff}
    </span>
  );
}
