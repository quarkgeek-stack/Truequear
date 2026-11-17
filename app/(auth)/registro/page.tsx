import { isGoogleAuthEnabled } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";

export const metadata = {
  title: "Creá tu cuenta",
};

export default function RegisterPage() {
  return <RegisterForm googleEnabled={isGoogleAuthEnabled()} />;
}
