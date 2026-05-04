const allowedMethods = 'DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT';
const defaultAllowedHeaders = 'authorization, content-type, x-api-key';

export const applyCorsHeaders = (headers: Headers, request: Request) => {
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', allowedMethods);
  headers.set(
    'access-control-allow-headers',
    request.headers.get('access-control-request-headers') ?? defaultAllowedHeaders
  );
  headers.append('vary', 'Access-Control-Request-Headers');
};

export const jsonResponse = (request: Request, body: unknown, status = 200) => {
  const headers = new Headers({
    'content-type': 'application/json'
  });

  applyCorsHeaders(headers, request);

  return new Response(JSON.stringify(body), {
    headers,
    status
  });
};

export const emptyResponse = (request: Request, status = 204) => {
  const headers = new Headers();

  applyCorsHeaders(headers, request);

  return new Response(null, {
    headers,
    status
  });
};

export const withCors = (request: Request, response: Response) => {
  const responseWithCors = new Response(response.body, response);

  applyCorsHeaders(responseWithCors.headers, request);

  return responseWithCors;
};
