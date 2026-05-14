import { Google } from "arctic";

const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
const redirectURI = "http://localhost:4001/auth/google/callback";

export const google = new Google(clientId, clientSecret, redirectURI);
