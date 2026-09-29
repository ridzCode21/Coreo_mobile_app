import { PillarComingSoonScreen } from '@/features/home';

export default function WellnessTab() {
  return (
    <PillarComingSoonScreen
      pillar="Wellness"
      title="Wellness logging is next."
      body="Water is already part of the daily summary. Sleep, HRV, and steps stay read-only until the backend supports manual updates."
    />
  );
}
