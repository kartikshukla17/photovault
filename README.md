# PhotoVault (UI Prototype)

This Next.js app implements the **Photo Vault** UI described in:
- `personal-photo-vault.md`
- `photo-vault-figma-spec.md`
- `photo-vault-ui.jsx` (prototype reference)

## Run

```bash
npm run dev
```

## Screens

- `/gallery`
- `/albums`
- `/backup`
- `/settings`

## Notes

- Mock photos/albums live in `lib/vault/mock-data.ts`.
- `npm run build` uses `next build --webpack` (to avoid Turbopack sandbox issues in this environment).
