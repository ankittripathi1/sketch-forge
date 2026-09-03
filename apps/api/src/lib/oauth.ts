import { Google } from "arctic";
import { env, googleCallbackUrl, isGoogleLoginEnabled } from "./env.js";

/**
 * Google client, or `null` when no Google credentials are configured.
 *
 * The redirect URI is derived from PUBLIC_ORIGIN and API_BASE_PATH so it always
 * matches the origin the browser is actually on. It must also be registered
 * verbatim in the Google Cloud console under Authorized redirect URIs.
 */
export const google = isGoogleLoginEnabled
  ? new Google(
      env.GOOGLE_CLIENT_ID!,
      env.GOOGLE_CLIENT_SECRET!,
      googleCallbackUrl,
    )
  : null;
