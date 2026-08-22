export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

const WEBAUTHN_CREDENTIAL_ID_KEY = "cat-diary-webauthn-credential-id";

export async function registerPlatformAuthenticator(): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "電子貓日記" },
        user: { id: userId, name: "cat-diary-user", displayName: "電子貓日記" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return false;
    const id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    localStorage.setItem(WEBAUTHN_CREDENTIAL_ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function hasRegisteredAuthenticator(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(WEBAUTHN_CREDENTIAL_ID_KEY);
}

export async function verifyPlatformAuthenticator(): Promise<boolean> {
  const storedId = localStorage.getItem(WEBAUTHN_CREDENTIAL_ID_KEY);
  if (!storedId) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = Uint8Array.from(atob(storedId), (c) => c.charCodeAt(0));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: rawId, type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export function clearPlatformAuthenticator(): void {
  localStorage.removeItem(WEBAUTHN_CREDENTIAL_ID_KEY);
}
