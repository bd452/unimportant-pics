/**
 * Runtime configuration. `API_BASE_URL` should point to the Vercel deployment
 * (or `vercel dev`) that hosts /api/analyze. In production builds you would
 * typically set this through native build configuration or env injection.
 */
export const config = {
  apiBaseUrl:
    (typeof process !== 'undefined' && (process.env as Record<string, string>)?.API_BASE_URL) ||
    'http://localhost:3000',
};
