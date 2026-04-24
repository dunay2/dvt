type E2eApiStubRequest = {
  method: string;
  url: URL;
  body: unknown;
  headers: Record<string, string>;
};

type E2eApiStubResponse = {
  statusCode?: number;
  body?: unknown;
  headers?: Record<string, string>;
};

type E2eApiStubDefinition = {
  method: string;
  pathname: string | RegExp;
  responder: (request: E2eApiStubRequest) => E2eApiStubResponse | Promise<E2eApiStubResponse>;
};

export type E2eApiCallRecord = E2eApiStubRequest;

const e2eApiStubs: E2eApiStubDefinition[] = [];
const e2eApiCalls: E2eApiCallRecord[] = [];

function pathnameMatches(pathname: string, matcher: string | RegExp): boolean {
  if (typeof matcher === 'string') {
    return pathname === matcher;
  }

  return matcher.test(pathname);
}

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

function buildHeadersRecord(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

function parseRequestBody(rawBody: string, headers: Headers): unknown {
  if (rawBody.length === 0) {
    return null;
  }

  const contentType = headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return rawBody;
    }
  }

  return rawBody;
}

function toResponseBody(body: unknown): { payload: BodyInit | null; contentType: string | null } {
  if (body == null) {
    return { payload: null, contentType: null };
  }

  if (typeof body === 'string') {
    return { payload: body, contentType: 'text/plain; charset=utf-8' };
  }

  return {
    payload: JSON.stringify(body),
    contentType: 'application/json; charset=utf-8',
  };
}

export function resetE2eApiStubs(): void {
  e2eApiStubs.length = 0;
  e2eApiCalls.length = 0;
}

export function stubE2eApi(
  method: string,
  pathname: string | RegExp,
  responder: E2eApiStubDefinition['responder']
): void {
  e2eApiStubs.push({
    method: normalizeMethod(method),
    pathname,
    responder,
  });
}

export function stubE2eJsonApi(
  method: string,
  pathname: string | RegExp,
  body: unknown,
  options: Omit<E2eApiStubResponse, 'body'> = {}
): void {
  stubE2eApi(method, pathname, () => ({
    statusCode: options.statusCode,
    headers: options.headers,
    body,
  }));
}

export function installE2eApiFetchStub(window: Window): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new window.Request(input, init);
    const requestUrl = new URL(request.url);
    const requestMethod = normalizeMethod(request.method);
    const matchedStub = e2eApiStubs.find(
      (stub) =>
        stub.method === requestMethod && pathnameMatches(requestUrl.pathname, stub.pathname)
    );

    if (!matchedStub) {
      return originalFetch(input, init);
    }

    const rawBody = await request.clone().text();
    const callRecord: E2eApiCallRecord = {
      method: requestMethod,
      url: requestUrl,
      body: parseRequestBody(rawBody, request.headers),
      headers: buildHeadersRecord(request.headers),
    };
    e2eApiCalls.push(callRecord);

    const response = await matchedStub.responder(callRecord);
    const { payload, contentType } = toResponseBody(response.body);
    const responseHeaders = new window.Headers(response.headers ?? {});
    if (contentType && !responseHeaders.has('content-type')) {
      responseHeaders.set('content-type', contentType);
    }

    return new window.Response(payload, {
      status: response.statusCode ?? 200,
      headers: responseHeaders,
    });
  };
}

export function getE2eApiCalls(pathname: string | RegExp, method?: string): E2eApiCallRecord[] {
  const normalizedMethod = method ? normalizeMethod(method) : null;

  return e2eApiCalls.filter((call) => {
    if (normalizedMethod && call.method !== normalizedMethod) {
      return false;
    }

    return pathnameMatches(call.url.pathname, pathname);
  });
}

export function getLastE2eApiCall(
  pathname: string | RegExp,
  method?: string
): E2eApiCallRecord | null {
  const calls = getE2eApiCalls(pathname, method);
  return calls.length > 0 ? calls[calls.length - 1] ?? null : null;
}

export function waitForE2eApiCall(pathname: string | RegExp, method?: string): Cypress.Chainable {
  return cy.wrap(null).should(() => {
    expect(getE2eApiCalls(pathname, method).length).to.be.greaterThan(0);
  });
}
