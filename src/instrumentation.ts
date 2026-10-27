// Runs once when the server starts. Loads the Central Asia library in the
// background so the first visitor doesn't wait for it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getLibrary } = await import("@/lib/library");
    getLibrary().catch(() => {});
  }
}
