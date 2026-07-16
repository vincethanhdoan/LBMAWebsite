/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Uploads source maps so minified stack traces resolve in Sentry.
    // Only active on builds that have the token — i.e. Vercel deploys, not CI.
    ...(sentryAuthToken
      ? [
          sentryVitePlugin({
            authToken: sentryAuthToken,
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            // Maps are uploaded to Sentry for stack-trace resolution, then removed
            // from the build output so they're never publicly fetchable. Scoped to
            // dist/assets (glob runs from the build's cwd, i.e. the repo root) so
            // it never touches node_modules' own .map files.
            sourcemaps: {
              filesToDeleteAfterUpload: ['dist/assets/**/*.js.map'],
            },
          }),
        ]
      : []),
  ],
  build: {
    // Emit source maps ONLY when the Sentry plugin runs (token present), since
    // that same build uploads them and then deletes them from the output. Without
    // the token there is no uploader and no deleter, so emitting maps would ship
    // full source to the public. 'hidden' also omits the sourceMappingURL comment.
    sourcemap: sentryAuthToken ? 'hidden' : false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
  },
});
