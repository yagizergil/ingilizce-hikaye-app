import { MascotLoading } from "@/components/ui/MascotLoading";

interface LoadingStateProps {
  message?: string;
}

/** Liste içi yükleme: sayfa çeviren maskot (kompakt). Mesaj verilirse başlık yerine geçer. */
export function LoadingState({ message }: LoadingStateProps) {
  return <MascotLoading compact title={message} />;
}
