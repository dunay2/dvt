import { describe, expect, it } from 'vitest';

import { PlanUriNotAllowedError } from '../../src/contracts/errors.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';

describe('PlanRefPolicy', () => {
  const policy = new PlanRefPolicy({ allowedSchemes: ['https'] });

  it('rejects dangerous schemes', () => {
    expect(() => policy.validateOrThrow('data:text/plain,hello')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('javascript:alert(1)')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('mailto:security@example.com')).toThrowError(
      PlanUriNotAllowedError
    );
  });

  it('rejects RFC1918 and full loopback IPv4 ranges', () => {
    expect(() => policy.validateOrThrow('https://10.23.4.5/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('https://172.16.10.5/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('https://172.31.255.1/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('https://192.168.1.5/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('https://127.20.30.40/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
  });

  it('rejects IPv6 ULA addresses', () => {
    expect(() => policy.validateOrThrow('https://[fc00::1234]/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('https://[fd12:3456::1]/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
    expect(() => policy.validateOrThrow('https://[::ffff:127.0.0.1]/plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
  });

  it('rejects localhost with trailing dot', () => {
    expect(() => policy.validateOrThrow('https://localhost./plan.json')).toThrowError(
      PlanUriNotAllowedError
    );
  });

  it('allows public https hostnames', () => {
    expect(() => policy.validateOrThrow('https://plans.example.com/plan.json')).not.toThrow();
    expect(() => policy.validateOrThrow('https://172.32.0.1/plan.json')).not.toThrow();
  });
});
