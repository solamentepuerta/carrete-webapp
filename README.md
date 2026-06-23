# Carrete

Carrete es una PWA móvil para dos personas: cada día ambos suben cinco fotos, etiquetan en secreto la intención de cada una y luego adivinan las fotos del otro antes del revelado.

## Fase 0

Esta fase deja listo el setup base:

- Next.js App Router con TypeScript.
- Tailwind CSS con paleta cozy pastel.
- Fuentes Quicksand y Caveat.
- Pantalla inicial mobile-first tipo corcho.
- Manifest PWA e icono base.

## Fase 1

Esta fase deja lista la base de Supabase:

- `supabase/schema.sql` con tablas, seed de categorias, RLS, RPCs anti-trampa y bucket privado `photos`.
- `lib/supabase/client.ts` para Client Components.
- `lib/supabase/server.ts` para Server Components, Server Actions y Route Handlers.

### Configurar Supabase

1. Crea un proyecto en Supabase.
2. Abre el SQL editor y ejecuta completo `supabase/schema.sql`.
3. Confirma que existe el bucket privado `photos` en Storage.
4. Copia las variables del proyecto a `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

La app no usa zona horaria global. Cada perfil guarda `profiles.timezone`, y las entradas deben crearse con la RPC `create_entry` para calcular `entry_date` en el servidor según el dia local del autor.

## Comandos

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
