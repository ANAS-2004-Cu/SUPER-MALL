// Legacy shim: Firebase client moved to app/services/client.ts.
// TODO: Remove this file once every module imports from app/services directly.
import * as client from '../app/services/client';

export * from '../app/services/client';

export default client;

