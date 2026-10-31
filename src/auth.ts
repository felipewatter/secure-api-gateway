import { createHash, verify } from 'node:crypto';
import type { Config } from './config';
export interface Principal { sub: string; roles: readonly string[]; actorHash: string }
function parseB64Url(segment: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(segment) || segment.length > 16384) throw new Error('Invalid token encoding');
  const b = Buffer.from(segment, 'base64url');
  if (b.toString('base64url') !== segment) throw new Error('Non-canonical token encoding');
  return b;
}
export function authenticate(header: string | undefined, config: Config, now = Math.floor(Date.now() / 1000)): Principal | null {
  if (!header || !/^Bearer [A-Za-z0-9._-]+$/.test(header) || header.length > 16384) return null;
  try {
    const segments = header.slice(7).split('.');
    if (segments.length !== 3) return null;
    const headerObject: unknown = JSON.parse(parseB64Url(segments[0]).toString('utf8'));
    if (!headerObject || typeof headerObject !== 'object' || Array.isArray(headerObject)) return null;
    const jwtHeader = headerObject as Record<string, unknown>;
    if (jwtHeader.alg !== 'RS256' || (jwtHeader.typ !== undefined && jwtHeader.typ !== 'JWT') || jwtHeader.crit !== undefined) return null;
    const signed = Buffer.from(`${segments[0]}.${segments[1]}`, 'ascii');
    if (!verify('RSA-SHA256', signed, config.publicKey, parseB64Url(segments[2]))) return null;
    const claims: unknown = JSON.parse(parseB64Url(segments[1]).toString('utf8'));
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return null;
    const p = claims as Record<string, unknown>;
    if (p.iss !== config.issuer || p.aud !== config.audience || typeof p.sub !== 'string' || !/^[^\x00-\x1f]{1,200}$/.test(p.sub)) return null;
    if (typeof p.exp !== 'number' || !Number.isSafeInteger(p.exp) || p.exp <= now) return null;
    if (p.nbf !== undefined && (typeof p.nbf !== 'number' || !Number.isSafeInteger(p.nbf) || p.nbf > now)) return null;
    if (p.iat !== undefined && (typeof p.iat !== 'number' || !Number.isSafeInteger(p.iat) || p.iat > now + 60)) return null;
    if (!Array.isArray(p.roles) || p.roles.length < 1 || p.roles.length > 32 || !p.roles.every(role => typeof role === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(role))) return null;
    return { sub: p.sub, roles: p.roles, actorHash: createHash('sha256').update(p.sub).digest('hex').slice(0, 16) };
  } catch { return null; }
}
export function authorize(principal: Principal, pathname: string, rules: Config['routeRules']): boolean {
  const rule = rules.find(x => pathname === x.prefix || pathname.startsWith(`${x.prefix}/`));
  return !!rule && rule.roles.some(role => principal.roles.includes(role));
}
