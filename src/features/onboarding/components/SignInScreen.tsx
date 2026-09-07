import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as AppleAuthentication from "expo-apple-authentication";

import { spacing, radius, type, monoType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";
import {
  useAppleSignIn,
  useGoogleSignIn,
  useEmailSignIn,
} from "@/features/onboarding/api/useAuthMutations";

interface SignInScreenProps {
  onDone: () => void;
}

export function SignInScreen({ onDone }: SignInScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const apple = useAppleSignIn();
  const google = useGoogleSignIn();
  const emailSignIn = useEmailSignIn();

  const handleApple = async () => {
    try {
      await apple.signIn();
      onDone();
    } catch {
      Alert.alert(t("common.errorTitle"), t("auth.error.generic"));
    }
  };

  const handleGoogle = async () => {
    try {
      await google.signIn();
      onDone();
    } catch {
      Alert.alert(t("common.errorTitle"), t("auth.error.generic"));
    }
  };

  const handleEmail = async () => {
    if (!email.includes("@")) {
      Alert.alert(t("common.errorTitle"), t("auth.error.invalidEmail"));
      return;
    }
    try {
      await emailSignIn.sendLink(email);
      Alert.alert(t("auth.email.sentTitle"), t("auth.email.sentBody"));
    } catch {
      Alert.alert(t("common.errorTitle"), t("auth.error.generic"));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <View style={styles.content}>
        <Text style={[type.screenTitle, styles.title, { color: theme.text.primary }]}>{t("auth.title")}</Text>
        <Text style={[monoType.rowText, styles.subtitle, { color: theme.text.secondary }]}>
          {t("auth.subtitle")}
        </Text>

        {Platform.OS === "ios" ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={styles.appleButton}
            onPress={() => void handleApple()}
          />
        ) : null}

        <View style={styles.googleButtonWrap}>
          <Button
            label={t("auth.google")}
            onPress={() => void handleGoogle()}
            disabled={google.isLoading}
            variant="secondary"
            fullWidth
          />
        </View>

        <View style={styles.divider} />

        <TextInput
          style={[monoType.rowText, styles.input, { borderColor: theme.border.strong, color: theme.text.primary }]}
          placeholder={t("auth.email.placeholder")}
          placeholderTextColor={theme.text.secondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.emailButtonWrap}>
          <Button
            label={t("auth.email.send")}
            onPress={() => void handleEmail()}
            disabled={emailSignIn.isLoading}
            fullWidth
          />
        </View>

        <Pressable style={styles.skipButton} onPress={onDone}>
          <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>{t("auth.skip")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  appleButton: {
    height: 44,
    marginBottom: spacing.sm,
  },
  googleButtonWrap: {
    marginBottom: spacing.sm,
  },
  divider: {
    height: spacing.md,
  },
  input: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  emailButtonWrap: {
    marginBottom: spacing.sm,
  },
  skipButton: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
});
