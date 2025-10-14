
// This file is necessary to provide type definitions for the `node-fetch` package
// when used in a project with modern module resolution.

declare module 'node-fetch' {
  const fetch: typeof import('undici').fetch;
  export default fetch;
  export const {
    Headers,
    Request,
    Response,
    FetchError,
    AbortError,
  }: typeof import('undici');
}
