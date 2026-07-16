import dynamic from "next/dynamic";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

const RegisterForm = dynamic(() => import("./RegisterForm"), {
  loading: () => <AuthFormSkeleton />,
});

export default function RegisterPage() {
  return <RegisterForm />;
}
