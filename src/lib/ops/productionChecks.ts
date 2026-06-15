export interface ProductionEnvCheck {
  key: string;
  ok: boolean;
  scope: "server" | "public";
  category: "database" | "auth" | "map" | "blob" | "admin";
}

export interface OAuthCallbackExpectation {
  provider: "google" | "line";
  callbackUrl: string;
}

export interface ProductionReadiness {
  env: ProductionEnvCheck[];
  missing: string[];
  callbacks: OAuthCallbackExpectation[];
  baseUrl: string | null;
}

const REQUIRED_ENV: Array<Omit<ProductionEnvCheck, "ok">> = [
  { key: "DATABASE_URL", scope: "server", category: "database" },
  { key: "AUTH_SECRET", scope: "server", category: "auth" },
  { key: "AUTH_GOOGLE_ID", scope: "server", category: "auth" },
  { key: "AUTH_GOOGLE_SECRET", scope: "server", category: "auth" },
  { key: "AUTH_LINE_ID", scope: "server", category: "auth" },
  { key: "AUTH_LINE_SECRET", scope: "server", category: "auth" },
  { key: "NEXT_PUBLIC_MAPBOX_TOKEN", scope: "public", category: "map" },
  { key: "BLOB_READ_WRITE_TOKEN", scope: "server", category: "blob" },
  { key: "ADMIN_EMAIL", scope: "server", category: "admin" },
];

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, "");
}

export function getProductionBaseUrl(): string | null {
  return (
    normalizeBaseUrl(process.env.AUTH_URL) ??
    normalizeBaseUrl(process.env.NEXTAUTH_URL) ??
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL)
  );
}

export function getOAuthCallbackExpectations(
  baseUrl: string | null,
): OAuthCallbackExpectation[] {
  if (!baseUrl) return [];
  return [
    { provider: "google", callbackUrl: `${baseUrl}/api/auth/callback/google` },
    { provider: "line", callbackUrl: `${baseUrl}/api/auth/callback/line` },
  ];
}

export function getProductionReadiness(): ProductionReadiness {
  const env = REQUIRED_ENV.map((item) => ({
    ...item,
    ok: Boolean(process.env[item.key]),
  }));
  const baseUrl = getProductionBaseUrl();

  return {
    env,
    missing: env.filter((item) => !item.ok).map((item) => item.key),
    callbacks: getOAuthCallbackExpectations(baseUrl),
    baseUrl,
  };
}
