// ==============================================================================
// SOIA Security Policy Manager
// ==============================================================================

export type SecurityProfile = 'strict' | 'balanced' | 'autonomous';

export interface SecurityCommandCheckResult {
  allowed: boolean;
  needsConfirmation: boolean;
  reason?: string;
}

export class SecurityPolicy {
  private currentProfile: SecurityProfile = 'balanced';

  // Comandi critici ad alto rischio che richiedono sempre conferma in balanced e strict
  private criticalPatterns: RegExp[] = [
    /\brm\s+-rf\s+\//,
    /\bmkfs\b/,
    /\bdd\s+if=/,
    /\bfdisk\b/,
    /\bparted\b/,
    /\bwipefs\b/,
    /\bchmod\s+-R\s+777\s+\//,
    /\bshutdown\b/,
    /\breboot\b/,
    /\bformat\b/i,
    /Remove-Item\s+-Recurse\s+-Force\s+[A-Za-z]:\\/i
  ];

  constructor(initialProfile: SecurityProfile = 'balanced') {
    this.currentProfile = initialProfile;
  }

  public getProfile(): SecurityProfile {
    return this.currentProfile;
  }

  public setProfile(profile: SecurityProfile): void {
    this.currentProfile = profile;
  }

  public evaluateCommand(command: string): SecurityCommandCheckResult {
    const trimmed = command.trim();

    // In Strict: qualsiasi comando di shell o scrittura richiede approvazione
    if (this.currentProfile === 'strict') {
      const isReadOnly = /^(ls|dir|pwd|whoami|uname|cat|echo|head|tail|date|git status)\b/i.test(trimmed);
      if (!isReadOnly) {
        return {
          allowed: true,
          needsConfirmation: true,
          reason: 'Profilo Strict attivo: richiesta autorizzazione per esecuzione comandi non di sola lettura.'
        };
      }
      return { allowed: true, needsConfirmation: false };
    }

    // In Balanced: blocca o chiede conferma per operazioni distruttive di sistema
    if (this.currentProfile === 'balanced') {
      for (const pattern of this.criticalPatterns) {
        if (pattern.test(trimmed)) {
          return {
            allowed: true,
            needsConfirmation: true,
            reason: `Operazione critica di sistema rilevata (${trimmed.slice(0, 40)}...). Richiesta conferma esplicita.`
          };
        }
      }
      return { allowed: true, needsConfirmation: false };
    }

    // In Autonomous: via libera per compiti agentici
    return { allowed: true, needsConfirmation: false };
  }
}

export const securityPolicy = new SecurityPolicy();
