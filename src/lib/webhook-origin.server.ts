// Where the in-app mock emitters POST the webhook.
//
// The request URL the dev server reports can carry an https scheme even though
// the local listener is plain http (the preview terminates TLS upstream), so a
// naive self-fetch to `new URL(getRequest().url).origin` dies with
// "TypeError: fetch failed". Downgrade loopback hosts to http; leave every
// other origin exactly as received.
export function selfOrigin(requestUrl: string): string {
  const u = new URL(requestUrl);
  if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "0.0.0.0") {
    u.protocol = "http:";
  }
  return u.origin;
}
