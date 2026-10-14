import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkyBackground } from '@/shared/components/SkyBackground';
import { WaveMark } from '@/shared/components/WaveMark';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors, fontFamily, spacing, textStyle } from '@/shared/theme/tokens';

type AuthFormScaffoldProps = PropsWithChildren<{
  title: ReactNode;
  description?: ReactNode;
  footer: ReactNode;
}>;

export function AuthFormScaffold({ title, description, footer, children }: AuthFormScaffoldProps) {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, breakpoint } = useResponsive();
  const paddingX = breakpoint === 'compact' ? spacing.screenPadXCompact : spacing.screenPadX;

  return (
    <SkyBackground style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={[styles.content, { maxWidth: contentMaxWidth, paddingHorizontal: paddingX }]}>
          <WaveMark size={26} strokeWidth={5} style={styles.wave} />
          <View style={styles.title}>{title}</View>
          {description ? <View style={styles.description}>{description}</View> : null}
          <View style={styles.fields}>{children}</View>
          <View style={styles.spacer} />
          <View>{footer}</View>
        </View>
      </ScrollView>
    </SkyBackground>
  );
}

export const authTitleStyles = StyleSheet.create({
  base: { ...textStyle('questionTitle'), color: colors.ink },
  emphasis: { fontFamily: fontFamily.poppins400 },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { flex: 1, width: '100%' },
  wave: { opacity: 0.55 },
  title: { marginTop: spacing.xl },
  description: { marginTop: spacing.ms },
  fields: { marginTop: spacing.authFieldsGap },
  spacer: { flex: 1, minHeight: spacing.lg },
});
