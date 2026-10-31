import { createPublicKey, KeyObject } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';

export interface Config {
  upstream: URL;
  issuer: string;
  audience: string;
  publicKey: KeyObject;
  routeRules: ReadonlyArray<{ prefix: string; roles: readonly string[] }>;
  corsOrigins: ReadonlySet<string>;
  maxRequestsPerMinute: number;
  maxBodyBytes: number;
  maxResponseBytes: number;
  upstreamTimeoutMs: number;
  port: number;
}

function integer(value: string | undefined, fallback: number, min: number, max: number, field: string): number {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error(`Invalid ${field}`);
  const num = Number(value);
  if (!Number.isSafeInteger(num) || num < min || num > max) throw new Error(`Invalid ${field}`);
  return num;
}
function required(value: string | undefined, name: string): string {
  if (!value || value.trim() !== value || /[\x00-\x1f]/.test(value)) throw new Error(`Missing or invalid ${name}`);
  return value;
}
export function parseConfig(env: NodeJS.ProcessEnv): Config {
  const upstream = new URL(required(env.UPSTREAM_URL, 'UPSTREAM_URL'));
  if (!['https:', 'http:'].includes(upstream.protocol) || upstream.username || upstream.password || upstream.search || upstream.hash || upstream.pathname !== '/') {
    throw new Error('UPSTREAM_URL must be an HTTP(S) origin without credentials, query or path');
  }
  if (env.NODE_ENV === 'production' && upstream.protocol !== 'https:') throw new Error('Production requires HTTPS upstream');
  const issuer = required(env.JWT_ISSUER, 'JWT_ISSUER');
  const audience = required(env.JWT_AUDIENCE, 'JWT_AUDIENCE');
  const keyFile = required(env.JWT_PUBLIC_KEY_FILE, 'JWT_PUBLIC_KEY_FILE');
  if (!lstatSync(keyFile).isFile()) throw new Error('JWT_PUBLIC_KEY_FILE must be a regular file');
  const publicKey = createPublicKey(readFileSync(keyFile));
  if (publicKey.asymmetricKeyType !== 'rsa' || (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error('JWT_PUBLIC_KEY_FILE requires an RSA public key of at least 2048 bits');
  const value: unknown = JSON.parse(required(env.ROUTE_RULES, 'ROUTE_RULES'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ROUTE_RULES must be a JSON object');
  const rules = Object.entries(value).map(([prefix, roles]) => {
    if (!/^\/api\/[a-zA-Z0-9_/-]+$/.test(prefix) || prefix.includes('//') || prefix.includes('..') || prefix.endsWith('/')) throw new Error(`Invalid route prefix: ${prefix}`);
    if (!Array.isArray(roles) || roles.length === 0 || !roles.every(r => typeof r === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(r))) throw new Error(`Invalid roles for ${prefix}`);
    return { prefix, roles: roles as string[] };
  });
  if (!rules.length) throw new Error('ROUTE_RULES cannot be empty');
  rules.sort((a, b) => b.prefix.length - a.prefix.length);
  const corsOrigins = new Set((env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean));
  for (const origin of corsOrigins) {
    const parsed = new URL(origin);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('CORS_ORIGINS must contain exact origins');
  }
  return {
    upstream, issuer, audience, publicKey, routeRules: rules, corsOrigins,
    maxRequestsPerMinute: integer(env.RATE_LIMIT_PER_MINUTE, 60, 1, 100000, 'RATE_LIMIT_PER_MINUTE'),
    maxBodyBytes: integer(env.MAX_BODY_BYTES, 1048576, 1, 10485760, 'MAX_BODY_BYTES'),
    maxResponseBytes: integer(env.MAX_RESPONSE_BYTES, 2097152, 1, 20971520, 'MAX_RESPONSE_BYTES'),
    upstreamTimeoutMs: integer(env.UPSTREAM_TIMEOUT_MS, 5000, 100, 60000, 'UPSTREAM_TIMEOUT_MS'),
    port: integer(env.PORT, 3000, 0, 65535, 'PORT'),
  };
}
