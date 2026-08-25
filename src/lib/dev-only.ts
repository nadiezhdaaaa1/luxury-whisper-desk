// Fail-closed gate for mock-billing surfaces.
//
// These endpoints grant paid access, create profiles and mint magic links, so
// the gate must default to CLOSED. The previous check was
// `(process.env.NODE_ENV ?? "development") === "production"`, which opened
// everything whenever NODE_ENV was merely unset — a missing env var on a
// production host would have exposed them.
//
// `import.meta.env.DEV` is substituted by Vite at build time: true in the dev
// server, false in every production build, and unaffected by runtime env vars.
// The `=== true` comparison means anything unexpected (undefined, a string)
// also refuses.
export function isDevBuild(): boolean {
  return import.meta.env?.DEV === true;
}

/** Throws unless this is a development build. Message kept byte-identical to the previous guards. */
export function assertDevOnly(
  message = "mock billing is disabled in production builds",
): never | void {
  if (!isDevBuild()) throw new Error(message);
}
