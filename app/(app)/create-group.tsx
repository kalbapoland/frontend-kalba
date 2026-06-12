import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { useCreateGroup } from "@/hooks/useGroups";
import { useAuthStore } from "@/store/auth";
import { successFeedback } from "@/lib/haptics";
import { colors, fonts, radii } from "@/theme/tokens";

const CREATE_GROUP_TEST_IDS = {
  titleInput: "group.create.title.input",
  descriptionInput: "group.create.description.input",
  submitButton: "group.create.submit.button",
} as const;

export default function CreateGroupScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate, isPending } = useCreateGroup();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  if (user?.role !== "trainer") {
    return (
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.line} />
        <Text style={s.lockedText}>{t("group.only_trainers")}</Text>
      </View>
    );
  }

  const showAlert = (msg: string) => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(t("errors.title"), msg);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showAlert(t("group.title_required"));
      return;
    }
    mutate(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: (group) => {
          successFeedback();
          router.replace(`/(app)/group/${group.id}`);
        },
        onError: () => showAlert(t("group.failed_create")),
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("workshop.go_back")}
            style={({ pressed }) => [s.backButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={s.pageTitle}>{t("group.new_group")}</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("group.field_title")}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("group.placeholder_title")}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              style={[s.fieldInput, titleFocused && s.fieldInputFocused]}
              placeholderTextColor={colors.inkMuted}
              testID={CREATE_GROUP_TEST_IDS.titleInput}
            />
          </View>

          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("group.field_description_optional")}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("group.placeholder_description")}
              multiline
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              style={[
                s.fieldInput,
                descFocused && s.fieldInputFocused,
                { minHeight: 120, textAlignVertical: "top" },
              ]}
              placeholderTextColor={colors.inkMuted}
              testID={CREATE_GROUP_TEST_IDS.descriptionInput}
            />
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={
              isPending ? t("group.creating_group_a11y") : t("group.create_group_a11y")
            }
            testID={CREATE_GROUP_TEST_IDS.submitButton}
            style={({ pressed }) => [
              s.submitButton,
              {
                opacity: isPending ? 0.55 : 1,
                transform: [{ scale: pressed && !isPending ? 0.97 : 1 }],
              },
            ]}
          >
            {isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <View style={s.submitInner}>
                <Ionicons name="add-circle-outline" size={18} color={colors.surface} />
                <Text style={s.submitText}>{t("group.create_group")}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  lockedText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkMuted,
    marginTop: 16,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -4,
  },
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.4,
    color: colors.ink,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.inkMuted,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fieldInputFocused: {
    borderColor: colors.primarySoft,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineWhisper,
    backgroundColor: "transparent",
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    letterSpacing: 0.5,
    color: colors.surface,
  },
});
