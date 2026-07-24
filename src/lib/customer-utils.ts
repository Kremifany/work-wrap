import type { Customer, CustomerServiceAddress } from "@/types";

export function newAddressId(): string {
  return crypto.randomUUID();
}

export function getPrimaryAddress(
  customer: Pick<Customer, "address" | "serviceAddresses">
): CustomerServiceAddress | null {
  const addresses = customer.serviceAddresses ?? [];
  if (addresses.length === 0) {
    const legacy = customer.address?.trim();
    if (!legacy) return null;
    return {
      id: "legacy",
      label: "Primary",
      line1: legacy,
      isPrimary: true,
    };
  }
  return addresses.find((a) => a.isPrimary) ?? addresses[0] ?? null;
}

export function getPrimaryAddressLine(
  customer: Pick<Customer, "address" | "serviceAddresses">
): string {
  return getPrimaryAddress(customer)?.line1?.trim() || customer.address?.trim() || "";
}

/**
 * Normalize legacy customers (single `address`) into `serviceAddresses`,
 * and keep `address` synced to the primary row.
 */
export function normalizeCustomer<T extends Customer>(customer: T): T {
  const existing = Array.isArray(customer.serviceAddresses)
    ? customer.serviceAddresses
    : [];

  let serviceAddresses = existing
    .filter((a) => a && typeof a.line1 === "string" && a.line1.trim())
    .map((a, index) => ({
      id: a.id?.trim() || newAddressId(),
      label: (a.label ?? "").trim(),
      line1: a.line1.trim(),
      isPrimary: Boolean(a.isPrimary),
    }));

  if (serviceAddresses.length === 0) {
    const legacy = customer.address?.trim();
    if (legacy) {
      serviceAddresses = [
        {
          // Stable id so form pickers don't reset on re-render
          id: "legacy",
          label: "Primary",
          line1: legacy,
          isPrimary: true,
        },
      ];
    }
  } else {
    const primaryCount = serviceAddresses.filter((a) => a.isPrimary).length;
    if (primaryCount === 0) {
      serviceAddresses = serviceAddresses.map((a, i) => ({
        ...a,
        isPrimary: i === 0,
      }));
    } else if (primaryCount > 1) {
      let kept = false;
      serviceAddresses = serviceAddresses.map((a) => {
        if (a.isPrimary && !kept) {
          kept = true;
          return a;
        }
        return { ...a, isPrimary: false };
      });
    }
  }

  const primary = serviceAddresses.find((a) => a.isPrimary) ?? serviceAddresses[0];
  return {
    ...customer,
    serviceAddresses,
    address: primary?.line1 ?? customer.address ?? "",
  };
}

export function buildServiceAddressesFromInput(
  addresses: Array<{ id?: string; label?: string; line1: string; isPrimary?: boolean }>,
  legacyAddress?: string
): CustomerServiceAddress[] {
  const cleaned = addresses
    .map((a) => ({
      id: a.id?.trim() || newAddressId(),
      label: (a.label ?? "").trim(),
      line1: a.line1.trim(),
      isPrimary: Boolean(a.isPrimary),
    }))
    .filter((a) => a.line1.length > 0);

  if (cleaned.length === 0) {
    const legacy = legacyAddress?.trim();
    if (!legacy) return [];
    return [
      {
        id: newAddressId(),
        label: "Primary",
        line1: legacy,
        isPrimary: true,
      },
    ];
  }

  if (!cleaned.some((a) => a.isPrimary)) {
    cleaned[0] = { ...cleaned[0], isPrimary: true };
  } else {
    let kept = false;
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i].isPrimary) {
        if (kept) cleaned[i] = { ...cleaned[i], isPrimary: false };
        else kept = true;
      }
    }
  }

  return cleaned;
}
