import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://fenilramoliya.com',
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'always' },
});
