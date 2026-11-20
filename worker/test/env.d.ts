import type { D1Migration } from 'cloudflare:test';
type TestBindings = {
  TEST_MIGRATIONS: D1Migration[];
  TEST_VERSES: Array<[string, string, number, number, string]>;
  TEST_SAMPLE: Array<[string, string, number, number, string]>;
};
declare global {
  namespace Cloudflare { interface Env extends TestBindings {} }
  interface Env extends TestBindings {}
}
export {};
