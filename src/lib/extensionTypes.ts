// ─────────────────────────────────────────────────────────────────────────────
// extensionTypes.ts
// Types, validation schema and sandboxed extension runner for Wolftoon
// Anti-piracy note: extensions are user-installed and community-maintained.
// Wolftoon itself does not host or distribute copyrighted content.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Extension Manifest (served by repo index.json) ──────────────────────────

export interface ExtensionManifest {
  /** Unique reverse-domain id, e.g. "br.mangafree" */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** Source language ISO 639-1, e.g. "pt", "en", "ja" */
  lang: string;
  /** SemVer string, e.g. "1.2.0" */
  version: string;
  /** Base domain or description of the source */
  baseUrl: string;
  /** Absolute URL to the .js bundle */
  scriptUrl: string;
  /** Optional icon URL (32×32 png/webp) */
  iconUrl?: string;
  /** True when the source requires age-verification / adult content */
  isNsfw?: boolean;
  /** Short description */
  description?: string;
}

/** A repository index file — array of manifests */
export type ExtensionRepo = ExtensionManifest[];

// ─── Installed Extension Record ───────────────────────────────────────────────

export type ExtensionStatus = 'installed' | 'outdated' | 'error';

export interface InstalledExtension extends ExtensionManifest {
  status: ExtensionStatus;
  installedAt: string; // ISO datetime
  /** Raw script source cached in localStorage */
  _scriptCache?: string;
}

// ─── Extension API (what each .js file must export) ──────────────────────────

export interface SearchResult {
  id: string;        // provider-internal id
  title: string;
  cover?: string;
  url: string;
  lang?: string;
}

export interface ChapterItem {
  id: string;
  number: number;
  title?: string;
  date?: string;   // ISO date string
  url: string;
  isVip?: boolean;
}

export interface PageItem {
  index: number;
  url: string;
}

/**
 * The shape every extension must expose.
 * Extensions are loaded via dynamic <script> evaluation; the module must
 * assign itself to `window.__wolftoon_ext`.
 */
export interface ExtensionModule {
  /** Unique id must match the manifest */
  id: string;
  /** Search for titles */
  search(query: string, page?: number): Promise<SearchResult[]>;
  /** List chapters for a given title URL */
  getChapters(titleUrl: string): Promise<ChapterItem[]>;
  /** Get page image URLs for a chapter */
  getPages(chapterUrl: string): Promise<PageItem[]>;
}

// ─── Repository list stored in localStorage ───────────────────────────────────

export interface RepoEntry {
  url: string;
  label: string;
  addedAt: string;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const STORAGE = {
  INSTALLED:    'wt_ext_installed',    // JSON array of InstalledExtension
  REPOS:        'wt_ext_repos',        // JSON array of RepoEntry
  SCRIPT_PREFIX: 'wt_ext_script_',    // + ext.id → raw JS string
} as const;

// ─── Default repository ───────────────────────────────────────────────────────

export const DEFAULT_REPOS: RepoEntry[] = [
  {
    url:     'https://raw.githubusercontent.com/deusdaespada/wolftoon-extensions/main/index.json',
    label:   'Wolftoon Official',
    addedAt: new Date().toISOString(),
  },
];

// ─── Sandbox runner ───────────────────────────────────────────────────────────

/**
 * Executes an extension script in a minimal sandbox and returns its module.
 *
 * The extension script must end with:
 *   window.__wolftoon_ext = { id, search, getChapters, getPages };
 *
 * Security model:
 *  - Scripts run in the same origin, so a malicious script CAN read cookies/
 *    localStorage. Only install extensions from trusted repos.
 *  - Network requests made by extensions go through the browser's fetch,
 *    which means CORS applies normally.
 *  - We do a basic structural check before executing.
 */
export function loadExtensionFromScript(script: string): ExtensionModule {
  // Basic guard — reject obviously invalid scripts
  if (!script.includes('__wolftoon_ext')) {
    throw new Error('Script does not export __wolftoon_ext');
  }

  // Clear any previous value
  (window as any).__wolftoon_ext = undefined;

  // eslint-disable-next-line no-new-func
  const fn = new Function(script);
  fn();

  const mod = (window as any).__wolftoon_ext as ExtensionModule | undefined;
  if (!mod || typeof mod.search !== 'function') {
    throw new Error('Extension module is malformed');
  }

  return mod;
}

// ─── Version comparison ───────────────────────────────────────────────────────

/** Returns true when `remote` is newer than `local` (semver). */
export function isNewerVersion(local: string, remote: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [la, lb, lc] = parse(local);
  const [ra, rb, rc] = parse(remote);
  if (ra !== la) return ra > la;
  if (rb !== lb) return rb > lb;
  return rc > lc;
}
