// src/services/pubky.ts
const TESTNET = process.env.NEXT_PUBLIC_TESTNET?.toLowerCase() === "true";
// Normalize relay: remove trailing slashes and ensure '/link' suffix
const RAW_HTTP_RELAY =
  process.env.NEXT_PUBLIC_HTTP_RELAY || "https://httprelay.pubky.app/link";
const HTTP_RELAY = (() => {
  let r = RAW_HTTP_RELAY.replace(/\/+$/, "");
  if (!/\/link$/.test(r)) r = `${r}/link`;
  return r;
})();
const PKARR_RELAYS = process.env.NEXT_PUBLIC_PKARR_RELAYS
  ? JSON.parse(process.env.NEXT_PUBLIC_PKARR_RELAYS)
  : ["https://pkarr.pubky.app", "https://pkarr.pubky.org"];
const CAPABILITIES = "/pub/calky/:rw";

const HTTP_NEXUS =
  process.env.NEXT_PUBLIC_HTTP_NEXUS || "https://nexus.pubky.app/";

// Global client variable
let client: any = null;

// Initialize client only on client side
const initClient = async () => {
  if (typeof window === "undefined") {
    throw new Error("Pubky client can only be initialized on client side");
  }

  if (!client) {
    const { Client } = await import("@synonymdev/pubky");
    client = new Client({
      pkarr: {
        relays: PKARR_RELAYS,
        requestTimeout: null,
      },
      userMaxRecordAge: null,
    });
  }

  return client;
};

// Client initialization function for compatibility
export function initPubkyClient() {
  return initClient();
}

export async function generateAuthUrl() {
  try {
    console.log("🚀 Creating auth request with relay:", HTTP_RELAY);
    console.log("🔑 Using capabilities:", CAPABILITIES || "[EMPTY]");

    const clientInstance = await initClient();
    const authRequest = clientInstance.authRequest(HTTP_RELAY, CAPABILITIES);
    const url = String(authRequest.url());

    console.log("🔗 Generated auth URL:", url);

    return {
      url,
      promise: authRequest.response(),
    };
  } catch (error) {
    console.error("❌ Error generating auth URL:", error);
    throw error;
  }
}

export async function loginWithAuthUrl(pubkey: string) {
  try {
    console.log("🔐 Starting login process for pubkey:", pubkey);

    // Create a minimal session object with just the pubkey
    const session = {
      pubkey,
      capabilities: CAPABILITIES,
      obtainedAt: Date.now(),
      lastSync: Date.now(),
    };

    localStorage.setItem("session", JSON.stringify(session));
    console.log("✅ Login successful, complete session created:", session);

    return { success: true, session };
  } catch (error) {
    console.error("❌ Login error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function getStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("session");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error reading stored session:", error);
    return null;
  }
}

async function getHomeserverFor(session: any) {
  const clientInstance = await initClient();
  const { PublicKey } = await import("@synonymdev/pubky");
  const userPk = PublicKey.from(session.pubkey);

  try {
    const homeserver = await clientInstance.getHomeserver(userPk);
    if (!homeserver) {
      throw new Error("No homeserver found for this pubkey");
    }

    let addresses: string[] = [];
    let port: number | null = null;

    try {
      if (typeof homeserver.getAddresses === "function") {
        addresses = await homeserver.getAddresses();
      }
      if (!addresses.length && typeof homeserver.addr === "string") {
        addresses = [homeserver.addr];
      }
      if (typeof homeserver.port === "number") {
        port = homeserver.port;
      }
      if (!port && typeof homeserver.getPort === "function") {
        port = await homeserver.getPort();
      }
    } catch (e) {
      console.warn("Homeserver address probing failed softly:", e);
    }

    return {
      success: true,
      homeserverKey: homeserver.z32(),
      pkarrRelays: PKARR_RELAYS,
      addresses,
      port,
    };
  } catch (error) {
    console.error("❌ Error resolving homeserver:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Quick existence check for the app folder for the authenticated user
export async function checkAppFolderExists(session: any) {
  if (!session || !session.pubkey) {
    return { success: false, error: "Invalid session or missing pubkey." };
  }
  try {
    // First resolve homeserver like in createAppFolder
    const homeserverResult = await getHomeserverFor(session);
    if (!homeserverResult.success) {
      return { success: false, error: homeserverResult.error };
    }

    const clientInstance = await initClient();
    const appName = process.env.NEXT_PUBLIC_PUBKY_APP_NAME || "Calky";
    // Check for the config.json file specifically
    const url = `pubky://${session.pubkey}/pub/${appName}/config.json`;
    const urlWithTs = `${url}?t=${Date.now()}`;
    const response = await clientInstance.fetch(urlWithTs, {
      method: "GET",
      headers: new Headers({
        Accept: "application/json",
        "Cache-Control": "no-cache",
      }),
      credentials: "include",
    });
    if (response.status === 404) {
      return { success: true, exists: false };
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true, exists: true };
  } catch (error) {
    console.error("❌ Error checking app folder existence:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Create the app folder for the authenticated user
export async function createAppFolder(session: any) {
  if (!session || !session.pubkey) {
    return { success: false, error: "Invalid session or missing pubkey." };
  }

  const homeserver = await getHomeserverFor(session);
  if (!homeserver.success) {
    return { success: false, error: `Homeserver error: ${homeserver.error}` };
  }

  try {
    const clientInstance = await initClient();
    const appName = process.env.NEXT_PUBLIC_PUBKY_APP_NAME || "Calky";
    // Create an initial config file instead of an empty folder
    const url = `pubky://${session.pubkey}/pub/${appName}/config.json`;
    console.log(`🚀 Attempting to create app folder via client: ${url}`);

    const configData = {
      app_name: appName,
      created_at: Date.now(),
      app_version: "1.0.0",
      homeserver_key: homeserver.homeserverKey,
    };

    const response = await clientInstance.fetch(url, {
      method: "PUT",
      headers: new Headers({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(configData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("✅ App folder created successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error creating app folder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Delete the app folder for the authenticated user
export async function deleteAppFolder(session: any) {
  if (!session || !session.pubkey) {
    return { success: false, error: "Invalid session or missing pubkey." };
  }
  try {
    // First resolve homeserver
    const homeserverResult = await getHomeserverFor(session);
    if (!homeserverResult.success) {
      return { success: false, error: homeserverResult.error };
    }

    const clientInstance = await initClient();
    const appName = process.env.NEXT_PUBLIC_PUBKY_APP_NAME || "Calky";

    // Delete the config.json file
    const url = `pubky://${session.pubkey}/pub/${appName}/config.json`;

    console.log("🗑️ Deleting app folder:", { url });

    const response = await clientInstance.fetch(url, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("✅ App folder deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting app folder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("session");
  }
}
