import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ApiError } from '@/shared/api/errors';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { useBarcodeLookup } from '@/features/nutrition/api/nutritionApi';
import { scalePer100g } from '@/features/nutrition/lib/macros';
import { BarcodeScannerView } from '@/features/nutrition/components/BarcodeScannerView';

const DIET_CONFIRM_ROUTE = '/diet/confirm';

/**
 * Live barcode scanning (Layer 1.1). Camera-first: point at a pack, it auto-detects, looks the
 * code up (§8 `/food/lookup/barcode/`), and hands off to the confirm screen prefilled. Manual code
 * entry is the fallback (revealed by "Enter code instead", or when camera permission is denied) and
 * hits the identical endpoint. No red error states — every failure has a calm recovery path
 * (design-system §10). Reached via `(app)/(tabs)/diet/scan`.
 */
export default function BarcodeScannerScreen() {
  const router = useRouter();
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [code, setCode] = useState<string | null>(null);

  const lookup = useBarcodeLookup(code ?? '', code != null);
  const foundItem = lookup.isSuccess ? lookup.data : undefined;

  useEffect(() => {
    if (!foundItem) return;
    const scaled = scalePer100g(
      {
        calories: foundItem.calories_per_100g,
        protein_g: foundItem.protein_g_per_100g,
        carbs_g: foundItem.carbs_g_per_100g,
        fat_g: foundItem.fat_g_per_100g,
      },
      100,
    );
    const query = new URLSearchParams({
      source: 'barcode',
      prefill: JSON.stringify({ food_name: foundItem.name, ...scaled }),
    });
    router.replace(`${DIET_CONFIRM_ROUTE}?${query.toString()}` as Href);
  }, [foundItem, router]);

  const notFound =
    lookup.isError && lookup.error instanceof ApiError && lookup.error.status === 404;
  const serviceDown =
    lookup.isError && lookup.error instanceof ApiError && lookup.error.status === 503;
  const otherError = lookup.isError && !notFound && !serviceDown;

  const scanAgain = () => setCode(null);
  const submitManual = () => {
    if (manualCode.trim().length === 0) return;
    setCode(manualCode.trim());
  };

  if (manualMode) {
    return (
      <View style={styles.manualRoot}>
        <Text style={styles.manualTitle}>Enter the barcode</Text>
        <Text style={styles.manualBody}>
          The number printed under the barcode — packaged anything.
        </Text>
        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          keyboardType="number-pad"
          placeholder="8901234567890"
          placeholderTextColor={colors.ink40}
          style={styles.manualField}
          autoFocus
        />

        {notFound ? (
          <Text style={styles.notice}>
            Didn&apos;t find that one — check the digits or describe it instead.
          </Text>
        ) : null}
        {serviceDown ? (
          <Text style={styles.notice}>
            That lookup&apos;s down for a moment — try again shortly.
          </Text>
        ) : null}
        {otherError ? (
          <Text style={styles.notice}>Couldn&apos;t look that up just now.</Text>
        ) : null}

        <Pressable onPress={submitManual} style={styles.primaryButton} accessibilityRole="button">
          {lookup.isFetching ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Look it up</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => setManualMode(false)}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Back to camera</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BarcodeScannerView
        onScan={(scanned) => setCode(scanned)}
        onClose={() => router.back()}
        onEnterManually={() => setManualMode(true)}
        paused={code != null}
      />

      {/* Status overlay while a scanned code is being resolved. */}
      {code != null ? (
        <View style={styles.statusBanner} pointerEvents="box-none">
          {lookup.isFetching ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.statusText}>Looking that up…</Text>
            </View>
          ) : null}
          {notFound || otherError ? (
            <View style={styles.statusCol}>
              <Text style={styles.statusText}>Didn&apos;t find that one.</Text>
              {/* Surfaces exactly what the camera/manual entry captured — the mock food DB only
                  knows ~10 seeded barcodes (fixtures.ts), so a real product will always land here.
                  Showing the captured code proves the scan itself worked, rather than leaving the
                  user unsure whether anything was read at all. */}
              <Text style={styles.scannedCode}>Scanned: {code}</Text>
              <Pressable onPress={scanAgain} style={styles.bannerButton} accessibilityRole="button">
                <Text style={styles.bannerButtonText}>Scan again</Text>
              </Pressable>
              <Pressable onPress={() => setManualMode(true)} accessibilityRole="button">
                <Text style={styles.bannerLink}>Enter code instead</Text>
              </Pressable>
            </View>
          ) : null}
          {serviceDown ? (
            <View style={styles.statusCol}>
              <Text style={styles.statusText}>That lookup&apos;s down for a moment.</Text>
              <Pressable onPress={scanAgain} style={styles.bannerButton} accessibilityRole="button">
                <Text style={styles.bannerButtonText}>Scan again</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.midnight,
  },
  statusBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.screenPadBottom + 72,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(18,42,70,0.7)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  statusCol: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(18,42,70,0.7)',
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  statusText: {
    ...textStyle('body'),
    color: colors.white,
    textAlign: 'center',
  },
  scannedCode: {
    ...textStyle('caption'),
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  bannerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  bannerButtonText: {
    ...textStyle('body'),
    color: colors.ink,
  },
  bannerLink: {
    ...textStyle('caption'),
    color: 'rgba(255,255,255,0.8)',
  },
  manualRoot: {
    flex: 1,
    backgroundColor: colors.midnight,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  manualTitle: {
    ...textStyle('sheetTitle'),
    color: colors.onNight,
  },
  manualBody: {
    ...textStyle('body'),
    color: 'rgba(239,244,249,0.62)',
    marginBottom: spacing.sm,
  },
  manualField: {
    ...textStyle('cardValue'),
    color: colors.onNight,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    letterSpacing: 1,
  },
  notice: {
    ...textStyle('bodySm'),
    color: colors.white,
  },
  primaryButton: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coreBlue,
  },
  primaryButtonText: {
    ...textStyle('bodyLg'),
    color: colors.white,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...textStyle('body'),
    color: 'rgba(239,244,249,0.62)',
  },
});
