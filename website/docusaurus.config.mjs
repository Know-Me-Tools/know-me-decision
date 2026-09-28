import {themes as prismThemes} from 'prism-react-renderer';


const REPO = 'https://github.com/Know-Me-Tools/know-me-decision';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'KnowMe Decision',
  tagline: 'Self-hosted decision models for KnowMe: calibrated, auditable and local-first.',
  favicon: 'img/favicon.svg',
  url: process.env.SITE_URL ?? 'https://know-me-tools.github.io',
  baseUrl: process.env.BASE_URL ?? '/know-me-decision/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  organizationName: 'Know-Me-Tools',
  projectName: 'know-me-decision',
  markdown: {
    mermaid: true,
    // The synced repository docs are plain Markdown (they contain `<`, `{port}`
    // and similar text that MDX would parse), so .md files use CommonMark.
    format: 'detect',
    hooks: {onBrokenMarkdownLinks: 'throw'},
  },
  headTags: [
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'}},
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'}},
  ],
  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Roboto:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap',
  ],
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {sidebarPath: './sidebars.js', routeBasePath: 'docs'},
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      },
    ],
  ],
  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {hashed: true, indexDocs: true, indexBlog: false, indexPages: false, docsRouteBasePath: 'docs', highlightSearchTermsOnTargetPage: true},
    ],
  ],
  themeConfig: {
    image: 'img/og.png',
    colorMode: {defaultMode: 'dark', respectPrefersColorScheme: true},
    navbar: {
      title: 'KnowMe Decision',
      logo: {alt: 'KnowMe', src: 'img/logo.svg', width: 32, height: 32},
      items: [
        {type: 'docSidebar', sidebarId: 'docs', label: 'Docs', position: 'left'},
        {to: '/docs/playbook', label: 'Playbook', position: 'left'},
        {href: 'pathname:///architecture/knowme-decision-layer.html', label: 'Architecture report', position: 'left'},
        {href: REPO, label: 'GitHub', position: 'right'},
      ],
    },
    footer: {
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Overview', to: '/docs/'},
            {label: 'Build playbook', to: '/docs/playbook'},
            {label: 'Research', to: '/docs/research/open-decision-models-2026-09'},
          ],
        },
        {
          title: 'KnowMe',
          items: [
            {label: 'know-me.tools', href: 'https://know-me.tools'},
            {label: 'GitHub', href: REPO},
          ],
        },
      ],
      copyright: `KnowMe, LLC · AI that understands you. © ${new Date().getFullYear()}`,
    },
    mermaid: {theme: {light: 'neutral', dark: 'dark'}},
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula, additionalLanguages: ['rust', 'toml']},
  },
};

export default config;
