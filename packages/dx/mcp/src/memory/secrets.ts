/**
 * `.praxis/` is committed to git, so anything that looks like a credential is refused before it is
 * written. The patterns cover common provider token formats plus generic `password = …` style
 * assignments; they favor refusing a lookalike over leaking a real secret.
 */
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['an AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['a GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['an API key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/],
  ['a Stripe key', /\b[rs]k_(?:live|test)_[0-9A-Za-z]{16,}\b/],
  ['a Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['a Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['a JSON Web Token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['credentials in a URL', /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@/i],
  [
    'a secret assignment',
    /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*['"]?(?!<|\$\{|process\.env|import\.meta\.env)[^\s'",;]{8,}/i,
  ],
]

/** Names what kind of secret `value` contains, or `undefined` when it looks clean. */
export function findSecret(value: string): string | undefined {
  return SECRET_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0]
}
