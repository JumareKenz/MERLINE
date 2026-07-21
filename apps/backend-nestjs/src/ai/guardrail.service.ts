import { Injectable } from '@nestjs/common';

interface GuardrailResult {
  passed: boolean;
  reason?: string;
}

@Injectable()
export class GuardrailService {
  private readonly blockedPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /DROP\s+TABLE/i,
    /DROP\s+DATABASE/i,
    /DELETE\s+FROM/i,
    /--\s+.*$/m,
  ];

  private readonly sensitivePatterns = [
    /\bpassword\b/i,
    /\bssn\b/i,
    /\bcredit.?card\b/i,
    /\bapi.?key\b/i,
    /\bsecret\b/i,
  ];

  private readonly maxInputLength = 100000;
  private readonly maxOutputLength = 500000;

  checkInput(message: string): GuardrailResult {
    if (!message || message.trim().length === 0) {
      return { passed: false, reason: 'Message cannot be empty' };
    }

    if (message.length > this.maxInputLength) {
      return { passed: false, reason: `Message exceeds maximum length of ${this.maxInputLength} characters` };
    }

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(message)) {
        return { passed: false, reason: 'Message contains blocked content patterns' };
      }
    }

    return { passed: true };
  }

  checkOutput(response: string): GuardrailResult {
    if (!response || response.trim().length === 0) {
      return { passed: false, reason: 'Response cannot be empty' };
    }

    if (response.length > this.maxOutputLength) {
      return { passed: false, reason: `Response exceeds maximum length of ${this.maxOutputLength} characters` };
    }

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(response)) {
        return { passed: false, reason: 'Response contains blocked content patterns' };
      }
    }

    return { passed: true };
  }

  sanitizeInput(message: string): string {
    return message.replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'));
  }
}
