import { useEffect, useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { useGroup, useUpdateGroup } from "@/hooks/useGroups";
import { colors } from "@/theme/tokens";

const EDIT_GROUP_TEST_IDS = {
  titleInput: "group.edit.title.input",
  descriptionInput: "group.edit.description.input",
  submitButton: "group.edit.submit.button",
} as const;

export default function EditGroupScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const group = useGroup(id!);
  const { mutate, isPending } = useUpdateGroup(id!);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Seed the form once the group loads.
  useEffect(() => {
    if (group.data && !initialized) {
      setTitle(group.data.title);
      setDescription(group.data.description);
      setInitialized(true);
    }
  }, [group.data, initialized]);

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
        onSuccess: () => router.back(),
        onError: () => showAlert(t("group.failed_update")),
      },
    );
  };

  if (group.isLoading || !initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <Text style={s.pageTitle}>{t("group.edit_group")}</Text>
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
              placeholder={t("group.placeholder_group_title")}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              style={[s.fieldInput, titleFocused && s.fieldInputFocused]}
              placeholderTextColor="#8C8A82"
              testID={EDIT_GROUP_TEST_IDS.titleInput}
            />
          </View>

          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("group.field_description")}</Text>
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
              placeholderTextColor="#8C8A82"
              testID={EDIT_GROUP_TEST_IDS.descriptionInput}
            />
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={isPending ? t("group.saving_group") : t("group.save_group")}
            testID={EDIT_GROUP_TEST_IDS.submitButton}
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
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.surface} />
                <Text style={s.submitText}>{t("group.save_changes")}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
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
    fontSize: 20,
    fontWeight: "300",
    letterSpacing: 0.4,
    color: "#2E2E2B",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    color: "#8C8A82",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: "#FAF8F4",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2E2E2B",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fieldInputFocused: {
    borderColor: "#8A9A7E",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EDE9E2",
    backgroundColor: "transparent",
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#566B52",
    alignItems: "center",
    justifyContent: "center",
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: "#FAF8F4",
  },
});
