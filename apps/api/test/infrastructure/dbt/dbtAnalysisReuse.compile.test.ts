/** Owned concern: compile operation, selection and target isolation using the unchanged native-analysis fixture. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DbtProjectAnalysis } from '../../../src/application/ports/dbtProjectAnalysis.js';

import {
  createDbtAnalysisReuseFixture,
  deferredSignal,
  REUSE_PROFILE,
  type DbtAnalysisReuseFixture,
} from './dbtAnalysisReuseFixtures.js';

describe('native dbt analysis reuse compile operation, selection and target isolation', () => {
  let fixture: DbtAnalysisReuseFixture;
  beforeEach(async () => {
    fixture = await createDbtAnalysisReuseFixture();
  });
  afterEach(async () => {
    await fixture.dispose();
  });

  it('partitions native compilation reuse by execution target', async () => {
    const analyzer = fixture.analyzer();
    const compile = (targetName: string): Promise<DbtProjectAnalysis> =>
      analyzer.analyze({
        ...fixture.input,
        operation: { kind: 'compile', selectors: ['orders'], targetName },
      });
    await compile('analysis');
    await compile('analysis');
    expect(fixture.run).toHaveBeenCalledTimes(1);
    await compile('production');
    expect(fixture.run).toHaveBeenCalledTimes(2);
    expect(
      fixture.run.mock.calls.map(([input]) => {
        const targetIndex = input.args.indexOf('--target');
        return input.args.slice(targetIndex, targetIndex + 2);
      })
    ).toEqual([
      ['--target', 'analysis'],
      ['--target', 'production'],
    ]);
  });

  it('compiles each distinct resolved variable set with exactly those CLI values', async () => {
    const analyzer = fixture.analyzer();
    const compile = (dbtVariablesJson?: string): Promise<DbtProjectAnalysis> =>
      analyzer.analyze({
        ...fixture.input,
        operation: {
          kind: 'compile',
          selectors: ['orders'],
          ...(dbtVariablesJson === undefined ? {} : { dbtVariablesJson }),
        },
      });
    const withZero = '{"amount":0,"use_amount":true}';
    const disabled = '{"use_amount":false}';
    for (const variables of [undefined, withZero, withZero, disabled]) await compile(variables);
    expect(
      fixture.run.mock.calls.map(([{ args }]) => {
        const index = args.indexOf('--vars');
        return index === -1 ? undefined : args[index + 1];
      })
    ).toEqual([undefined, withZero, disabled]);
    const protectedArgs = ['--log-level', 'none', '--log-level-file', 'none', '--no-print'];
    for (const [{ args }] of fixture.run.mock.calls.slice(1)) {
      const index = args.indexOf('--log-level');
      expect(args.slice(index, index + protectedArgs.length)).toEqual(protectedArgs);
    }
  });

  it.each(
    (['parse', 'compile'] as const).flatMap((kind) =>
      (['model', 'profile'] as const).map((location) => [kind, location] as const)
    )
  )('bypasses %s reuse for dynamic Jinja in the %s', async (kind, location) => {
    const input = {
      ...fixture.input,
      operation: kind === 'parse' ? { kind } : { kind, selectors: ['orders'] },
    };
    if (location === 'model')
      await fixture.writeSource('models/orders.sql', 'select {{ run_started_at }}\n');
    else
      await fixture.writeProfile(
        REUSE_PROFILE.replace('schema: public', 'schema: "{{ env_var(\'DBT_SCHEMA\') }}"')
      );
    const analyzer = fixture.analyzer();
    expect((await analyzer.analyze(input)).status).toBe('valid');
    expect((await analyzer.analyze(input)).status).toBe('valid');
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it('executes compilation independently from retained parse evidence', async () => {
    const analyzer = fixture.analyzer();
    await analyzer.analyze(fixture.input);
    const compile = {
      ...fixture.input,
      operation: { kind: 'compile' as const, selectors: ['orders'] },
    };
    const compiled = await analyzer.analyze(compile);
    expect(compiled.resources.find((resource) => resource.name === 'orders')?.compiledSql).toBe(
      'select client_id from "public"."clients"'
    );
    expect(await analyzer.analyze(compile)).toEqual(compiled);
    await analyzer.analyze(fixture.input);
    expect(fixture.run).toHaveBeenCalledTimes(2);
    expect(fixture.run.mock.calls.slice(1).every(([input]) => input.args[0] === 'compile')).toBe(
      true
    );
  });

  it('separates model selections and shares reordered equivalent compilation selections', async () => {
    const analyzer = fixture.analyzer();
    const compile = (selectors: readonly string[]): ReturnType<typeof analyzer.analyze> =>
      analyzer.analyze({ ...fixture.input, operation: { kind: 'compile', selectors } });
    const orders = await compile(['orders']);
    const clients = await compile(['clients']);
    expect(
      orders.resources.find((resource) => resource.name === 'clients')?.compiledSql
    ).toBeUndefined();
    expect(
      clients.resources.find((resource) => resource.name === 'orders')?.compiledSql
    ).toBeUndefined();
    const both = await compile(['orders', 'clients']);
    expect(await compile(['clients', 'orders', 'clients'])).toEqual(both);
    expect(fixture.run).toHaveBeenCalledTimes(3);
  });

  it('joins concurrent static compilations without borrowing parse evidence', async () => {
    const analyzer = fixture.analyzer();
    await analyzer.analyze(fixture.input);
    const started = deferredSignal();
    const release = deferredSignal();
    fixture.run.mockImplementation(async (input) => {
      started.resolve();
      await release.promise;
      return fixture.complete(input);
    });
    const input = {
      ...fixture.input,
      operation: { kind: 'compile' as const, selectors: ['orders'] },
    };
    const pending = [1, 2, 3].map(() => analyzer.analyze(input));
    await started.promise;
    release.resolve();
    const results = await Promise.all(pending);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(
      results[0]?.resources.find((resource) => resource.name === 'orders')?.compiledSql
    ).toBeDefined();
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });
});
