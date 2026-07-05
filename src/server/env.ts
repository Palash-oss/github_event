export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppUrl(requestUrl?: string): string {
  return process.env.APP_URL || (requestUrl ? new URL(requestUrl).origin : "http://localhost:3000");
}