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

## Fase 2

Esta fase implementa el acceso MVP:

- `/login` entra con nombre y código compartido de pareja.
- El cliente crea una sesión anónima de Supabase cuando todavía no hay usuario.
- La RPC `join_couple` crea o encuentra la pareja por `invite_code` y asocia `profiles.timezone` con la zona horaria del dispositivo.

### Actualizar Supabase para Fase 2

1. En Supabase Auth, activa **Anonymous sign-ins**.
2. Ejecuta `supabase/migrations/202606230001_phase_2_access.sql` en el SQL editor si ya habías corrido Fase 1.
3. Si estás creando el proyecto desde cero, puedes ejecutar `supabase/schema.sql` completo.

## Fase 3

Esta fase implementa `/subir`:

- Captura desde cámara/galería con `accept="image/*"` y `capture="environment"`.
- Compresión en cliente con `browser-image-compression`.
- Una polaroid por categoría, con revelado visual después de elegir foto.
- Upload al bucket privado `photos`.
- Creación de entrada mediante la RPC `create_entry`; el cliente no inserta directamente en `entries`.

## Fase 4

Esta fase conecta el corcho de `/`:

- Redirige a `/login` si no existe sesión/perfil.
- Lee solo tus propias entradas de `entries` para mostrar tus 5 polaroids del día.
- Genera signed URLs de Storage desde el servidor para fotos privadas.
- Muestra `get_day_status` y `get_streak`.

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
