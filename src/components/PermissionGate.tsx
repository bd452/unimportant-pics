import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PermissionResponse } from "expo-media-library";
import { colors, radius, spacing } from "../styles/theme";

type PermissionGateProps = {
  permission: PermissionResponse | null;
  onRequestAccess: () => void;
};

export function PermissionGate({
  permission,
  onRequestAccess
}: PermissionGateProps) {
  const denied = permission && !permission.granted && !permission.canAskAgain;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Camera roll cleanup</Text>
        <Text style={styles.title}>Review your photos with AI guidance.</Text>
        <Text style={styles.body}>
          unimportant-pics only analyzes photos as they enter a review session.
          AI calls go through the backend, and deletion still requires your final
          iOS confirmation.
        </Text>
        {denied ? (
          <Text style={styles.warning}>
            Photo access is disabled. Enable it in iOS Settings to continue.
          </Text>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={onRequestAccess}
        >
          <Text style={styles.buttonText}>Choose photo access</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.md
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: spacing.sm
  },
  warning: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md
  }
});
