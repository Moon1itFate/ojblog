import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

type GiscusConfig = {
  repo?: string;
  repoId?: string;
  category?: string;
  categoryId?: string;
};

type CommentConfig = {
  provider?: string;
  giscus?: GiscusConfig;
};

type SiteConfig = {
  comment?: CommentConfig;
};

const configPath = path.resolve(process.cwd(), 'config/site.yaml');
const siteConfig = yaml.load(fs.readFileSync(configPath, 'utf8')) as SiteConfig;

const provider = siteConfig.comment?.provider ?? 'none';

if (provider === 'none') {
  console.log('Comment provider is disabled.');
  process.exit(0);
}

if (provider !== 'giscus') {
  console.log(`Comment provider is "${provider}". This checker currently validates Giscus only.`);
  process.exit(0);
}

const giscus = siteConfig.comment?.giscus ?? {};
const resolved = {
  repo: process.env.PUBLIC_GISCUS_REPO || giscus.repo,
  repoId: process.env.PUBLIC_GISCUS_REPO_ID || giscus.repoId,
  category: process.env.PUBLIC_GISCUS_CATEGORY || giscus.category,
  categoryId: process.env.PUBLIC_GISCUS_CATEGORY_ID || giscus.categoryId,
};

const missing = Object.entries(resolved)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(`Giscus is not ready. Missing: ${missing.join(', ')}`);
  console.error('Fill config/site.yaml or set PUBLIC_GISCUS_REPO_ID and PUBLIC_GISCUS_CATEGORY_ID in Netlify.');
  process.exit(1);
}

console.log(`Giscus is configured for ${resolved.repo} / ${resolved.category}.`);
