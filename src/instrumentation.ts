export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateSettings } = await import("@/settings");
    validateSettings();
  }
}
