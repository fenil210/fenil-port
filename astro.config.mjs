import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { prosePlugin } from './src/lib/prose.ts';

export default defineConfig({
  site: 'https://fenilramoliya.com',
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'always' },
  // scripts stay files, never inlined, so the CSP only has to hash the theme script in Base.astro
  vite: { build: { assetsInlineLimit: 0 } },
  // images in articles get a srcset sized to the column they sit in
  image: { layout: 'constrained' },
  markdown: {
    processor: satteri({ hastPlugins: [prosePlugin] }),
    // code takes the site's colours, set in global.css
    shikiConfig: { theme: 'css-variables' },
  },
});
