import { requireSession } from "@/lib/auth-session";
import { NewCustomerForm } from "@/components/CustomerForms";

export const metadata = { title: "New Customer" };

export default async function NewCustomerPage() {
  await requireSession();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">New Customer</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Add a customer to your CRM.
        </p>
      </div>
      <NewCustomerForm />
    </div>
  );
}
