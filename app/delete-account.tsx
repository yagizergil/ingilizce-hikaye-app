import { router } from "expo-router";
import { DeleteAccountScreen } from "@/features/onboarding";

export default function DeleteAccountRoute() {
  return (
    <DeleteAccountScreen
      onDeleted={() => router.replace("/")}
      onCancel={() => router.back()}
    />
  );
}
