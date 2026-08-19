# Loop Debts

Loop Debts is a focused mobile-first app for private debt notes shared between two people.

The product has one flow:

1. Log in with email and password.
2. Accept an invitation or start a shared debt note.
3. Add plain-language debt and payment entries.
4. See the balance from each person's point of view.

## Stack

- Vue 3, TypeScript, and Vite
- Firebase Authentication and Firestore
- Firebase callable functions for creating and accepting invitations
- Capacitor configuration for native packaging

## Local development

```sh
pnpm install
pnpm dev
```

Create `.env` from `.env.example` and provide the Firebase values.

## Verification

```sh
pnpm build
pnpm --dir functions build
```
