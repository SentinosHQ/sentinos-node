# Releasing `@sentinos/node`

This package is published to npm as `@sentinos/node`.

## One-Time Setup

### 1) npm package and trusted publishing

1. Ensure the `@sentinos` npm scope exists and that this package is created under it.
2. In npm package settings, configure GitHub Actions trusted publishing for:
   - package name: `@sentinos/node`
   - owner: `SentinosHQ`
   - repository: `sentinos-node`
   - workflow: `publish.yml`
   - environment: leave blank unless you later add a protected GitHub Actions environment
3. Confirm the package is public.

This trusted publisher registration is done in npm package settings. The repository cannot self-register it.

### 2) Local prerequisites

- Node.js 20+
- npm 11.5.1+

## Preflight (Must Pass)

From the repo root:

```bash
npm ci
npm run build
npm test
npm run provenance:check
npm run release:check
```

## Version Bump

1. Update `version` in `package.json`.
2. Ensure README examples still match the exported client surface.

## Publish Flow

### 1) Dry run

```bash
npm ci
npm run build
npm test
npm run provenance:check
npm publish --dry-run --provenance --access public
```

### 2) Production publish

1. Commit the version bump.
2. Create and push a tag matching the package version:

```bash
git tag v0.1.0
git push origin main --tags
```

3. GitHub Actions `publish.yml` publishes the package with npm provenance.

## Trusted Publishing Notes

- npm trusted publishing currently requires npm 11.5.1 or newer.
- The workflow upgrades npm before publishing so OIDC publishing does not silently fall back to token-style auth behavior.
- If a publish run fails after build/test/provenance checks pass, inspect the runner's npm version first.

## Clean-Room Verification

The release check script packs the SDK, installs it into a temporary empty project, and verifies the package exports are usable:

```bash
npm run release:check
```

That check is required before every publish.
