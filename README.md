# Carrete

Carrete es una PWA móvil para dos personas: cada día ambos suben cinco fotos, etiquetan en secreto la intención de cada una y luego adivinan las fotos del otro antes del revelado.

## Fase 0

Esta fase deja listo el setup base:

- Next.js App Router con TypeScript.
- Tailwind CSS con paleta cozy pastel.
- Fuentes Quicksand y Caveat.
- Pantalla inicial mobile-first tipo corcho.
- Manifest PWA e icono base.

## Comandos

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## Variables futuras

Supabase se implementa en la Fase 1. Cuando llegue esa fase, se usaran estas variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
