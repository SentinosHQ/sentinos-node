# Releasing `@sentinos/node`

This package is published to npm as `@sentinos/node`.

## One-Time Setup

### 1) npm package and trusted publishing

1. Ensure the `@sentinos` npm scope exists and that this package is created under it.
2. In npm package settings, configure GitHub Actions trusted publishing for:
   - owner: `SentinosHQ`
   - repository: `sentinos-node`
   - workflow: `publish.yml`
3. Confirm the package is public.

### 2) Local prerequisites

- Node.js 20+
- npm 10+

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

## Clean-Room Verification

The release check script packs the SDK, installs it into a temporary empty project, and verifies the package exports are usable:

```bash
npm run release:check
```

That check is required before every publish.
