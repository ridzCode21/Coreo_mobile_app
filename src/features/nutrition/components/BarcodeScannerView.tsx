import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

type BarcodeScannerViewProps = {
  /** Fired once with the raw barcode string. Parent should set `paused` immediately to debounce. */
  onScan: (code: string) => void;
  onClose: () => void;
  onEnterManually: () => void;
  /** When true, scanning is suspended (after a hit / during lookup) so `onScan` fires once. */
  paused: boolean;
};

/**
 * The ONLY file that imports `expo-camera`, so the rest of the nutrition feature stays free of the
 * native dependency and typechecks before it's installed (`npx expo install expo-camera` — same
 * isolation pattern as `lib/photoCapture.ts`). On-device barcode scanning (Apple Vision / Android
 * MLKit) — no API key, no network for the scan itself. Verify the API against the SDK 57 docs
 * before shipping (CLAUDE.md §2). No design-source mockup for this screen — built in the
 * established glass language (design-system §9 net-new pattern).
 */
export function BarcodeScannerView({
  onScan,
  onClose,
  onEnterManually,
  paused,
}: BarcodeScannerViewProps) {
  const [permission, requestPermission] = useCameraPermissions();

  const handleScan = (result: BarcodeScanningResult) => {
    if (paused) return;
    onScan(result.data);
  };

  // Permission still resolving.
  if (!permission) {
    return <View style={styles.fill} />;
  }

  // Not granted yet — calm explainer + a path that never dead-ends (manual entry).
  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.permission]}>
        <Text style={styles.permissionTitle}>Let me see the barcode</Text>
        <Text style={styles.permissionBody}>
          I use your camera to scan a pack&apos;s barcode. Nothing is stored — I just read the code.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={styles.primaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Allow camera</Text>
        </Pressable>
        <Pressable
          onPress={onEnterManually}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Enter code instead</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.secondaryButton} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        // Undefined handler while paused = CameraView stops scanning (fires once per hit).
        onBarcodeScanned={paused ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />

      {/* Overlay: dim scrim + a centered glass reticle + calm guidance. */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.reticleWrap} pointerEvents="none">
          <View style={styles.reticle} />
          <Text style={styles.hint}>Point at the barcode. I&apos;ll catch it.</Text>
        </View>

        <Pressable onPress={onEnterManually} style={styles.manualPill} accessibilityRole="button">
          <Text style={styles.manualPillText}>Enter code instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.midnight,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.screenPadTop,
    paddingBottom: spacing.screenPadBottom,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  close: {
    ...textStyle('body'),
    color: colors.white,
  },
  reticleWrap: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  reticle: {
    width: 260,
    height: 160,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  hint: {
    ...textStyle('body'),
    color: colors.white,
    textAlign: 'center',
  },
  manualPill: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  manualPillText: {
    ...textStyle('body'),
    color: colors.white,
  },
  permission: {
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  permissionTitle: {
    ...textStyle('sheetTitle'),
    color: colors.onNight,
  },
  permissionBody: {
    ...textStyle('body'),
    color: 'rgba(239,244,249,0.62)',
    marginBottom: spacing.sm,
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
