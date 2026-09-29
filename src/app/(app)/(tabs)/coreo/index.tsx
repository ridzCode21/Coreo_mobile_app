import { Redirect, type Href } from 'expo-router';

export default function LegacyCoreoRedirect() {
  return <Redirect href={'/core' as Href} />;
}
