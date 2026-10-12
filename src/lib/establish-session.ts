/** Exchange a Firebase ID token for the httpOnly `__session` cookie. */
export async function establishSession(
  idToken: string
): Promise<{ success: boolean; error?: string }> {
  let res: Response;
  try {
    res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    return { success: false, error: "Failed to create session. Please try again." };
  }

  if (res.ok) return { success: true };

  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return {
    success: false,
    error: data?.error ?? "Failed to create session. Please try again.",
  };
}
