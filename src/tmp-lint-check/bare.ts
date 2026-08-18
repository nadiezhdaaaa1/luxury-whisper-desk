export function b() {
  // @ts-expect-error test
  gtag("event", "x");
}
