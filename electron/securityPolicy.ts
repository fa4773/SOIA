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

  // High-risk critical commands that always require confirmation in balanced and strict
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

    // In Strict: any shell or write command requires approval
    if (this.currentProfile === 'strict') {
      const isReadOnly = /^(ls|dir|pwd|whoami|uname|cat|echo|head|tail|date|git status)\b/i.test(trimmed);
      if (!isReadOnly) {
        return {
          allowed: true,
          needsConfirmation: true,
          reason: 'Strict profile active: authorization required for non-read-only commands.'
        };
      }
      return { allowed: true, needsConfirmation: false };
    }

    // In Balanced: block or ask confirmation for destructive system operations
    if (this.currentProfile === 'balanced') {
      for (const pattern of this.criticalPatterns) {
        if (pattern.test(trimmed)) {
          return {
            allowed: true,
            needsConfirmation: true,
            reason: `Critical system operation detected (${trimmed.slice(0, 40)}...). Explicit confirmation required.`
          };
        }
      }
      return { allowed: true, needsConfirmation: false };
    }

    // In Autonomous: full clearance for agentic tasks
    return { allowed: true, needsConfirmation: false };
  }
}

export const securityPolicy = new SecurityPolicy();
