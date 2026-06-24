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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

La app no usa zona horaria global. Cada perfil guarda `profiles.timezone`, y las entradas deben crearse con la RPC `create_entry` para calcular `entry_date` en el servidor según el dia local del autor.

## Fase 2

Esta fase implemento el acceso MVP original:

- `/login` entra con nombre y código compartido de pareja.
- El cliente crea una sesión anónima de Supabase cuando todavía no hay usuario.
- La RPC `join_couple` crea o encuentra la pareja por `invite_code` y asocia `profiles.timezone` con la zona horaria del dispositivo.

### Actualizar Supabase para Fase 2

1. En Supabase Auth, activa **Anonymous sign-ins**.
2. Ejecuta `supabase/migrations/202606230001_phase_2_access.sql` en el SQL editor si ya habías corrido Fase 1.
3. Si estás creando el proyecto desde cero, puedes ejecutar `supabase/schema.sql` completo.

La app actual ya no usa Anonymous sign-ins para entrar. Usa email/password y conserva `join_couple` solo por compatibilidad con instalaciones anteriores.

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

## Fase 5

Esta fase implementa `/adivinar`:

- Carga fotos de la pareja con `get_entries_to_guess`, sin exponer la categoría real.
- Usa `@dnd-kit/core` con sensores Pointer y Touch.
- Envía cada intento con `submit_guess`.
- Revela con flip 3D llamando `get_day_results` solo cuando ya existen las 5 adivinanzas.

### Actualizar Supabase para Fase 5

Ejecuta `supabase/migrations/202606230002_phase_5_results_gate.sql` para endurecer `get_day_results` antes de probar el revelado.

## Fase 6

Esta fase implementa calendario e historial:

- `/calendario` muestra vista mensual con indicadores completo, a medias o vacío.
- La RPC `get_calendar_month` devuelve solo conteos por día, nunca categorías reales.
- `/dia/[fecha]` muestra el día en modo lectura con tus etiquetas propias y las etiquetas de la pareja solo cuando `get_day_results` ya puede revelar.

### Actualizar Supabase para Fase 6

Ejecuta `supabase/migrations/202606230003_phase_6_calendar.sql` para crear la RPC mensual.

## Fase 7

Esta fase añade pulido de experiencia:

- Confeti pastel al completar subidas, revelar resultados perfectos y volver al corcho completo.
- Chime suave en acciones iniciadas por la persona usuaria, como subir y revelar.
- Racha animada en el corcho de hoy.
- Score visible después del flip de adivinanzas.
- Micro-interacciones y estados vacíos más cálidos.

## Flujo actual

- `/login` usa correo y contraseña con Supabase Auth.
- `/` es la experiencia principal: alterna entre **Mi carrete** y **Su carrete**.
- **Mi carrete** sube o reemplaza fotos tocando cada polaroid.
- **Su carrete** permite asignar pistas en borrador, desmarcar con presión larga y revelar al tener 5 pistas.
- El juego se bloquea hasta emparejarse con un código generado desde la app.

### Actualizar Supabase para el flujo actual

1. En Supabase Auth, activa el provider **Email**.
2. Ejecuta `supabase/migrations/202606240004_email_pairing_and_entry_upsert.sql`.
3. Anonymous sign-ins ya no es necesario para usuarios nuevos.
4. En **Authentication > URL Configuration**, configura:
   - **Site URL:** la URL de producción en Vercel.
   - **Redirect URLs:** `https://tu-dominio.vercel.app/auth/callback`.
   - Para desarrollo local, agrega también `http://localhost:3000/auth/callback`.

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` tambien funciona como alias de compatibilidad si tu proyecto todavía usa el nombre anterior.

## Checklist Vercel + Supabase

En Vercel agrega estas variables en Production, Preview y Development si quieres probar previews:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

En Supabase, antes de probar el flujo completo:

1. Ejecuta `supabase/schema.sql` completo si el proyecto esta vacio.
2. Si ya habias corrido una fase anterior, ejecuta las migraciones pendientes en orden.
3. Activa **Authentication > Sign In / Providers > Email**.
4. Confirma que el bucket privado `photos` existe.
