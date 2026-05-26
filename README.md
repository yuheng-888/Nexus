# Nexus

Nexus is an Electron-based AI IDE prototype with a native backend runtime,
model configuration, local code indexing, Git integration, workflows, MCP
management, plugin and skill marketplaces, voice wake support, and native AI
agent tools.

## Requirements

- Node.js 22 or newer
- npm
- macOS for the packaged desktop install scripts

## Development

```bash
npm install
npm --prefix frontend install
npm test
npm run build
```

## macOS Build And Install

```bash
npm run install:mac
open -n /Applications/Nexus.app
```

## Notes

- Build artifacts, dependencies, local environment files, extracted vendor
  references, and desktop metadata are intentionally excluded from the
  repository.
- API keys and provider credentials are stored locally by the application and
  should not be committed.
