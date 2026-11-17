import { isGoogleAuthEnabled } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";

export const metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return <LoginForm googleEnabled={isGoogleAuthEnabled()} />;
}
