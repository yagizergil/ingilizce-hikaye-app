import { router } from "expo-router";
import { SignInScreen } from "@/features/onboarding";

export default function SignInRoute() {
  return <SignInScreen onDone={() => router.back()} />;
}
