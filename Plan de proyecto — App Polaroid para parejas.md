# Plan de proyecto — App Polaroid para parejas (Codex-ready)

<aside>
💜

**Resumen en una línea:** una web app móvil donde tú y tu novia suben **5 fotos al día** (una por categoría), cada quien **etiqueta en secreto** sus fotos, y luego **ambos adivinan** las del otro arrastrando etiquetas. Estética *cozy* pastel, animación polaroid, pizarrón/corcho, calendario y contador de racha.

</aside>

Este documento está escrito para usarse **directamente como spec en Codex**: tiene la mecánica, el modelo de datos (SQL listo), la arquitectura, el sistema de diseño y un plan de construcción por fases con prompts copiables.

---

## 1. Concepto y nombre

Un ritual diario íntimo para dos personas. No es una red social: es un cuaderno compartido y un juego de adivinar cómo está/qué piensa el otro.

**Nombre elegido: Carrete** ✨ (otras ideas que se consideraron):

| Nombre | Vibe |
| --- | --- |
| **Carrete** | Rollo de fotos, simple y bonito |
| **Revelado** | El momento polaroid de "revelar" |
| **Cinco** | Las 5 fotos del día |
| **Entre tú y yo** | Íntimo, de pareja |
| **Pinned** | El pin/etiqueta en el corcho |
| **Polaroika** | Juguetón, marca propia |

<aside>
✨

**Carrete** es el nombre definitivo del proyecto.

</aside>

---

## 2. Las 5 categorías (con mejores nombres)

Cada día se sube **1 foto por cada categoría** (5 fotos en total). Estos son los nombres pulidos + emoji para las etiquetas:

| # | Categoría (nombre nuevo) | Idea original | Emoji |
| --- | --- | --- | --- |
| 1 | **Me sacó una sonrisa** | algo que te hizo sonreír | 😊 |
| 2 | **Me acordé de ti** | algo que te recordó a tu pareja | 💭 |
| 3 | **Lo que veo ahora** | algo que estás viendo en este momento | 👀 |
| 4 | **Mi mood de hoy** | algo que represente cómo te sientes | 🌈 |
| 5 | **Ojalá estuvieras aquí** | algo que te gustaría mostrarle | 🫶 |

---

## 3. Mecánica completa del juego

<aside>
🎯

**Regla central:** los dos suben y los dos adivinan. La etiqueta real va "escondida detrás" de la polaroid (efecto 3D físico), y solo se revela al adivinar.

</aside>

### Flujo diario de cada persona

1. **Subir (modo autor):** tomas o eliges 5 fotos, una por cada categoría. Al subir cada foto, **le asignas en secreto su categoría** (la etiqueta queda "pegada por detrás" de la polaroid). Ocurre la **animación de revelado polaroid**.
2. **Adivinar (modo detective):** ves las 5 polaroids de tu pareja **sin sus etiquetas**, y **arrastras** una etiqueta de categoría sobre cada una intentando acertar con qué intención la subió.
3. **Revelar:** cuando colocas las 5, se hace el **flip 3D** de cada polaroid mostrando la etiqueta real por detrás → se marca ✅ acierto / ❌ fallo y un puntaje del día (ej. 3/5).

### Reglas de puntaje

- `is_correct = (categoría_adivinada === categoría_real)`.
- Puntaje del día por persona: aciertos sobre 5.
- Se puede mostrar un **marcador semanal/total** de la pareja (suma de aciertos) como métrica divertida.

### Reglas de racha (streak) 🔥

- Un día **cuenta para la racha** cuando **ambos** completaron su parte: subieron sus 5 fotos **y** adivinaron las 5 del otro.
- La racha = número de días consecutivos completos hasta hoy (o ayer si hoy aún no termina).
- Si un día no se completa, la racha vuelve a 0 (opcional: "comodín"/freeze para 1 fallo, lo dejamos para el futuro).

### Zona horaria: día local independiente (Portugal ↔ Venezuela) 🌍

<aside>
🌍

**Modelo elegido (opción 4): cada quien vive su propio día local, sin ventana de gracia.** No hay una zona horaria única de pareja: cada usuario guarda su propio `timezone` y sus subidas se fechan según **su propia medianoche local** (corte exacto). Una **fecha lógica D** cuenta para la racha cuando **ambos** completaron las tareas de esa fecha, cada uno en su propio día local.

</aside>

- Cada perfil guarda su `timezone` (ej. `Europe/Lisbon`, `America/Caracas`).
- Al subir, `entry_date` se calcula **en el servidor** con la medianoche local del autor → nadie puede falsear la fecha con el reloj del teléfono.
- **Sin gracia / corte exacto:** solo puedes subir las fotos de "hoy" en tu propio día local; al pasar tu medianoche local, ese día queda cerrado para subir.
- **Adivinar es tolerante por naturaleza:** como tu pareja puede subir cuando ya es de madrugada para ti, las adivinanzas de una fecha D no caducan por reloj; quedan disponibles hasta que las completes. D solo cuenta para la racha cuando ambos subieron 5 **y** ambos adivinaron las 5 del otro.
- Dato útil: medianoche en Caracas = 5:00 am en Lisboa, así que con días locales independientes ninguno pierde su tarde/noche.

---

## 4. Pantallas / rutas

| Ruta | Pantalla | Contenido |
| --- | --- | --- |
| `/` | Hoy (corcho) | Pizarrón del día: tus 5 espacios + estado de tu pareja, racha, acceso a subir/adivinar |
| `/subir` | Subir fotos | Cámara/galería, asignar categoría secreta, animación polaroid |
| `/adivinar` | Adivinar | Polaroids de la pareja + bandeja de etiquetas arrastrables + revelado |
| `/calendario` | Calendario | Vista mensual; tocar un día abre ese corcho en modo lectura |
| `/dia/[fecha]` | Día pasado | Corcho de un día anterior (solo lectura, con etiquetas reveladas) |
| `/login` | Acceso | Código compartido de pareja (MVP) |
| `/ajustes` | Ajustes | Nombre, avatar, tema, cerrar sesión |

---

## 5. Stack técnico y arquitectura

- **Framework:** Next.js 14+ (App Router) + TypeScript.
- **UI/estilos:** Tailwind CSS + componentes propios.
- **Animaciones:** Framer Motion (revelado polaroid, flip 3D, transiciones del corcho).
- **Drag & drop (touch-friendly):** `@dnd-kit/core` (mejor que react-dnd en móvil).
- **Backend/DB/Auth/Storage:** Supabase (Postgres + Storage + RLS).
- **Deploy:** Vercel (front) + Supabase (datos).
- **Estado/datos:** React Server Components + `@supabase/ssr`; client components donde haya interacción (subir, adivinar, dnd).
- **PWA (recomendado):** manifest + service worker para instalarla en el móvil como app y abrir cámara fácil.

```
[ Móvil PWA / Next.js en Vercel ]
        |  (supabase-js / @supabase/ssr)
        v
[ Supabase ]
  ├─ Postgres (couples, profiles, categories, entries, guesses)
  ├─ RLS (cada pareja solo ve lo suyo)
  ├─ RPC security definer (anti-trampa: ocultar etiqueta real hasta adivinar)
  └─ Storage bucket "photos" (privado, signed URLs)
```

---

## 6. Modelo de datos (Supabase / Postgres)

SQL listo para pegar en el **SQL editor** de Supabase.

```sql
-- =========================================================
-- TABLAS
-- =========================================================

-- Parejas (preparado para multi-pareja a futuro)
create table couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

-- Perfiles (1 fila por usuario autenticado)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'UTC',   -- IANA tz del usuario: 'Europe/Lisbon' / 'America/Caracas'
  created_at timestamptz not null default now()
);

-- Categorías (5 fijas; en tabla por si quieres editarlas luego)
create table categories (
  id smallint primary key,
  key text unique not null,
  label text not null,
  emoji text,
  sort_order smallint not null
);

insert into categories (id, key, label, emoji, sort_order) values
  (1, 'smile',    'Me sacó una sonrisa',  '😊', 1),
  (2, 'you',      'Me acordé de ti',      '💭', 2),
  (3, 'now',      'Lo que veo ahora',     '👀', 3),
  (4, 'mood',     'Mi mood de hoy',       '🌈', 4),
  (5, 'wish',     'Ojalá estuvieras aquí','🫶', 5);

-- Entradas: 1 foto por (autor, fecha, categoría)
create table entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  category_id smallint not null references categories(id),
  image_path text not null,            -- ruta en Storage
  caption text,
  created_at timestamptz not null default now(),
  unique (author_id, entry_date, category_id)
);

-- Adivinanzas: la pareja adivina la categoría de cada entrada
create table guesses (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  guesser_id uuid not null references profiles(id) on delete cascade,
  guessed_category_id smallint not null references categories(id),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (entry_id, guesser_id)
);

create index on entries (couple_id, entry_date);
create index on guesses (guesser_id);
```

### Seguridad (RLS) — versión segura anti-trampa

<aside>
🔒

Problema: la columna `entries.category_id` es la respuesta correcta. Si el cliente puede leerla antes de adivinar, hay trampa. Solución: **no exponer `entries` directamente para leer las fotos del otro**; usar **funciones RPC `security definer`** que devuelven los datos sin la respuesta, y que calculan el acierto en el servidor.

</aside>

```sql
-- Activar RLS
alter table couples   enable row level security;
alter table profiles  enable row level security;
alter table entries   enable row level security;
alter table guesses   enable row level security;
alter table categories enable row level security;

-- Helper: couple_id del usuario actual
create or replace function my_couple_id()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from profiles where id = auth.uid()
$$;

-- categories: lectura para todos los autenticados
create policy cat_read on categories for select to authenticated using (true);

-- profiles: ves tu perfil y el de tu pareja
create policy prof_read on profiles for select to authenticated
  using (id = auth.uid() or couple_id = my_couple_id());
create policy prof_update on profiles for update to authenticated
  using (id = auth.uid());

-- entries: SOLO puedes leer directamente TUS propias entradas
-- (las del otro se obtienen por RPC sin la categoría real)
create policy entries_read_own on entries for select to authenticated
  using (author_id = auth.uid());
create policy entries_insert_own on entries for insert to authenticated
  with check (author_id = auth.uid() and couple_id = my_couple_id());

-- guesses: lees las tuyas; insertas las tuyas
create policy guesses_read_own on guesses for select to authenticated
  using (guesser_id = auth.uid());
```

### Funciones RPC (lógica de juego en el servidor)

```sql
-- 1) Entradas de la pareja para ADIVINAR (sin la categoría real)
create or replace function get_entries_to_guess(p_date date)
returns table (
  entry_id uuid,
  image_path text,
  already_guessed boolean,
  guessed_category_id smallint
)
language sql security definer set search_path = public as $$
  select e.id,
         e.image_path,
         (g.id is not null) as already_guessed,
         g.guessed_category_id
  from entries e
  left join guesses g
    on g.entry_id = e.id and g.guesser_id = auth.uid()
  where e.couple_id = my_couple_id()
    and e.author_id <> auth.uid()
    and e.entry_date = p_date
  order by e.created_at;
$$;

-- 2) Registrar una adivinanza y calcular acierto en el servidor
create or replace function submit_guess(p_entry_id uuid, p_category_id smallint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_real smallint; v_correct boolean;
begin
  -- validar que la entrada es de mi pareja y NO mía
  select category_id into v_real from entries
   where id = p_entry_id and couple_id = my_couple_id() and author_id <> auth.uid();
  if v_real is null then raise exception 'entrada inválida'; end if;

  v_correct := (v_real = p_category_id);
  insert into guesses (entry_id, guesser_id, guessed_category_id, is_correct)
  values (p_entry_id, auth.uid(), p_category_id, v_correct)
  on conflict (entry_id, guesser_id) do nothing; -- no permitir re-adivinar
  return v_correct;
end; $$;

-- 3) Resultados del día (para el revelado): solo cuando YA adivinaste todo
create or replace function get_day_results(p_date date)
returns table (
  entry_id uuid, image_path text, caption text,
  real_category_id smallint, guessed_category_id smallint, is_correct boolean
)
language sql security definer set search_path = public as $$
  select e.id, e.image_path, e.caption,
         e.category_id, g.guessed_category_id, g.is_correct
  from entries e
  join guesses g on g.entry_id = e.id and g.guesser_id = auth.uid()
  where e.couple_id = my_couple_id()
    and e.author_id <> auth.uid()
    and e.entry_date = p_date;
$$;

-- 4) Estado del día (cuántas subió/adivinó cada quién)
create or replace function get_day_status(p_date date)
returns table (
  my_uploads int, partner_uploads int,
  my_guesses int, partner_guesses int
)
language sql security definer set search_path = public as $$
  select
   (select count(*) from entries e where e.couple_id=my_couple_id() and e.author_id=auth.uid() and e.entry_date=p_date),
   (select count(*) from entries e where e.couple_id=my_couple_id() and e.author_id<>auth.uid() and e.entry_date=p_date),
   (select count(*) from guesses g join entries e on e.id=g.entry_id where g.guesser_id=auth.uid() and e.entry_date=p_date),
   (select count(*) from guesses g join entries e on e.id=g.entry_id where g.guesser_id<>auth.uid() and e.entry_date=p_date);
$$;

-- 0) Crear entrada con fecha = medianoche LOCAL del autor (anti-trampa de fecha)
-- Usar SIEMPRE esta RPC para subir, en vez de insertar entries desde el cliente.
create or replace function create_entry(p_category_id smallint, p_image_path text, p_caption text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_tz text; v_date date; v_id uuid;
begin
  select timezone into v_tz from profiles where id = auth.uid();
  v_date := (now() at time zone coalesce(v_tz, 'UTC'))::date;  -- "hoy" local del autor
  insert into entries (couple_id, author_id, entry_date, category_id, image_path, caption)
  values (my_couple_id(), auth.uid(), v_date, p_category_id, p_image_path, p_caption)
  returning id into v_id;
  return v_id;
end; $$;

-- 5) Racha: fechas lógicas consecutivas COMPLETAS
-- (ambos subieron 5 y ambos adivinaron 5; cada quien en su propio día local)
create or replace function get_streak()
returns int
language plpgsql security definer set search_path = public as $$
declare v_couple uuid := my_couple_id(); v_day date; v_min date; v_streak int := 0; v_ok boolean;
begin
  select max(entry_date), min(entry_date) into v_day, v_min
    from entries where couple_id = v_couple;
  if v_day is null then return 0; end if;

  loop
    select (
      (select count(distinct author_id) from entries where couple_id=v_couple and entry_date=v_day) = 2
      and (select count(*) from entries where couple_id=v_couple and entry_date=v_day) = 10
      and (select count(*) from guesses g join entries e on e.id=g.entry_id
            where e.couple_id=v_couple and e.entry_date=v_day) = 10
    ) into v_ok;
    if v_ok then
      v_streak := v_streak + 1; v_day := v_day - 1;       -- día completo: suma y retrocede
    elsif v_streak = 0 then
      v_day := v_day - 1;                                  -- el día más reciente aún puede estar a medias
    else
      exit;                                                -- hueco: se corta la racha
    end if;
    exit when v_day < v_min;                               -- corte de seguridad
  end loop;
  return v_streak;
end; $$;
```

---

## 7. Supabase Storage (fotos)

- Bucket **privado** llamado `photos`.
- Ruta sugerida: `{couple_id}/{entry_date}/{author_id}/{category_id}.jpg`.
- Servir imágenes con **signed URLs** (no públicas) generadas desde el servidor.
- Comprimir/redimensionar en el cliente antes de subir (ej. máx 1600px, calidad 0.8) con `browser-image-compression` para que vuele en móvil.

```sql
-- Policy de Storage (ejemplo): subir solo a la carpeta de tu pareja
-- (configurar en Storage > Policies)
-- bucket_id = 'photos' AND (storage.foldername(name))[1] = my_couple_id()::text
```

---

## 8. Funcionalidades clave (detalle de implementación)

### 8.1 Captura + animación polaroid

- Input de cámara en móvil: `<input type="file" accept="image/*" capture="environment" />`.
- Tras elegir/tomar la foto: comprimir → mostrar **animación de revelado**:
    1. Aparece el marco polaroid blanco vacío (cae con leve rebote).
    2. La imagen empieza **oscura/desaturada** y se "revela" subiendo brillo/saturación en ~2.5s (simula la química polaroid).
    3. Pequeño *shake* tipo "agitar la foto".
- Framer Motion para el rebote y el `filter` animado.

```tsx
// Pseudocódigo del revelado
<motion.div className="polaroid"
  initial= y: -40, rotate: -6, opacity: 0 
  animate= y: 0, rotate: -2, opacity: 1 
  transition= type: 'spring', stiffness: 120, damping: 10 >
  <motion.img src={url}
    initial= filter: 'brightness(0.2) saturate(0)' 
    animate= filter: 'brightness(1) saturate(1)' 
    transition= duration: 2.5, ease: 'easeOut'  />
  <div className="polaroid-caption font-hand">{caption}</div>
</motion.div>
```

### 8.2 Etiqueta secreta "detrás" (efecto 3D físico) + flip de revelado

- La polaroid es una **tarjeta 3D**: cara frontal = foto; **cara trasera = etiqueta real**.
- Al asignar categoría al subir, se "pega" en la cara trasera (se ve un pin/post-it asomando por detrás).
- En el revelado, la tarjeta hace **flip en Y** mostrando la etiqueta real.

```css
.card3d { transform-style: preserve-3d; transition: transform .6s; }
.card3d.flipped { transform: rotateY(180deg); }
.card3d .front, .card3d .back { backface-visibility: hidden; position: absolute; inset: 0; }
.card3d .back { transform: rotateY(180deg); }
/* etiqueta asomando por detrás antes del flip */
.secret-tag { position:absolute; bottom:-10px; right:8px; transform: rotate(-8deg) translateZ(-2px); }
```

### 8.3 Pizarrón / corcho

- Fondo de corcho o tablero pastel; polaroids con **cinta washi** y leve rotación aleatoria (`rotate` entre -6° y 6°) para look orgánico.
- Layout en cuadrícula irregular (masonry simple) de las 5 polaroids del día.

### 8.4 Drag & drop de etiquetas (adivinar)

- `@dnd-kit/core` con sensores **Pointer + Touch** (clave para móvil).
- Bandeja inferior con las 5 etiquetas (chips con emoji). Se arrastran sobre cada polaroid (drop zone).
- Al soltar las 5 → botón **"Revelar"** que llama `submit_guess` por cada una y luego `get_day_results`, dispara los flips.

### 8.5 Calendario

- Vista mensual (custom o `react-day-picker` estilizado).
- Cada día muestra un mini-indicador: ✅ completo, 🟡 a medias, ⬜ vacío.
- Tocar un día → `/dia/[fecha]` en modo lectura con etiquetas ya reveladas.

### 8.6 Contador de racha 🔥

- Llamar `get_streak()` y mostrarlo grande en `/` con animación de fueguito cuando sube.
- Micro-celebración (confeti pastel) al completar el día y al subir la racha.

---

## 9. Sistema de diseño (cozy pastel)

<aside>
🎨

Inspiración: lila/lavanda kawaii + crema + toques de rosa y salvia. Bordes redondeados, sombras suaves, texturas de papel.

</aside>

**Paleta sugerida (Tailwind theme):**

| Token | Hex | Uso |
| --- | --- | --- |
| `lavender` | `#C9B6F2` | acento principal |
| `lilac-soft` | `#E6DCFB` | fondos / chips |
| `cream` | `#FBF7F0` | fondo base |
| `blush` | `#F7D6E0` | acentos cálidos |
| `sage` | `#C7DAC4` | éxito / ✅ |
| `ink` | `#4A4458` | texto |

**Tipografías (Google Fonts):**

- Títulos/caption polaroid: **Caveat** o **Patrick Hand** (manuscrita).
- Texto UI: **Quicksand** o **Nunito** (redondeada, suave).

**Detalles visuales:** sombras difusas, esquinas `rounded-2xl`, cinta washi semitransparente, grano/textura de papel sutil, micro-animaciones en cada tap.

---

## 10. Librerías recomendadas

```bash
npm i @supabase/supabase-js @supabase/ssr framer-motion @dnd-kit/core \
  @dnd-kit/utilities browser-image-compression date-fns react-day-picker canvas-confetti
npm i -D tailwindcss postcss autoprefixer
```

---

## 11. Estructura de carpetas

```
/app
  /(auth)/login/page.tsx
  /page.tsx                 // Hoy / corcho
  /subir/page.tsx
  /adivinar/page.tsx
  /calendario/page.tsx
  /dia/[fecha]/page.tsx
  /ajustes/page.tsx
  /api/...                  // route handlers si hacen falta
/components
  Polaroid.tsx
  PolaroidReveal.tsx        // animación de revelado
  Card3D.tsx                // flip + etiqueta secreta
  Corkboard.tsx
  CategoryChip.tsx
  GuessBoard.tsx            // dnd-kit
  StreakCounter.tsx
  MonthCalendar.tsx
/lib
  supabase/client.ts
  supabase/server.ts
  dates.ts                  // tz por usuario (profiles.timezone); fecha local del autor
  storage.ts                // signed urls + upload comprimido
/supabase
  schema.sql                // todo el SQL de la sección 6-7
/styles, /public (manifest PWA, iconos)
AGENTS.md
```

---

## 12. Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo en servidor (signed urls / acciones admin)
# Sin zona horaria global: cada usuario guarda la suya en profiles.timezone
```

---

## 13. Plan de construcción por fases (para Codex)

<aside>
🧭

Construir en este orden. Cada fase es un commit funcional. No saltar fases: el juego depende de los datos y los datos del esquema.

</aside>

- [ ]  **Fase 0 — Setup:** Next.js + TS + Tailwind + tema pastel + fuentes + layout base + PWA manifest.
- [ ]  **Fase 1 — Supabase:** crear proyecto, correr `schema.sql` (tablas, RLS, RPCs), bucket `photos`, helpers `supabase/client.ts` y `server.ts`.
- [ ]  **Fase 2 — Acceso (MVP):** login por **código compartido de pareja** → crear/asociar `couple` + `profile` (guardar la zona horaria del dispositivo en `profiles.timezone`).
- [ ]  **Fase 3 — Subir + polaroid:** captura desde cámara, compresión, asignar categoría secreta, animación de revelado, subir a Storage y crear la entrada con la RPC `create_entry` (fecha = día local del autor).
- [ ]  **Fase 4 — Corcho "Hoy":** mostrar tus 5 polaroids + estado de la pareja (`get_day_status`) + racha (`get_streak`).
- [ ]  **Fase 5 — Adivinar (dnd) + flip 3D:** `get_entries_to_guess`, arrastrar etiquetas, `submit_guess`, revelado con flip y ✅/❌ (`get_day_results`).
- [ ]  **Fase 6 — Calendario + días pasados:** vista mensual con indicadores + `/dia/[fecha]` en lectura.
- [ ]  **Fase 7 — Pulido:** confeti, sonidos suaves, racha animada, micro-interacciones, estados vacíos bonitos.
- [ ]  **Futuro:** multi-pareja real, notificaciones push (recordatorio diario), comodín de racha, exportar el mes como collage.

---

## 14. Prompts listos para Codex

<details><summary>Prompt inicial (pegar primero en Codex)</summary>

</details>

</details>

Eres mi pareja de programación. Vamos a construir "Carrete", una web app PWA móvil para dos personas (pareja) hecha con Next.js (App Router) + TypeScript + Tailwind + Supabase + Framer Motion + @dnd-kit, desplegada en Vercel. Lee este documento de spec completo (te lo pego) y trabaja por FASES en el orden indicado, haciendo un commit funcional por fase. Empieza por la Fase 0 (setup) y para a que yo revise antes de seguir. Usa estética cozy pastel (lavanda/crema/rosa/salvia), fuentes Quicksand + Caveat. No inventes la mecánica: sigue exactamente la sección 3 (ambos suben y etiquetan en secreto, ambos adivinan, etiqueta real escondida detrás con flip 3D).

</details>

<details><summary>Prompt Fase 1 (Supabase)</summary>

</details>

</details>

Implementa la Fase 1: crea el archivo supabase/schema.sql con TODO el SQL de las secciones 6 y 7 (tablas, seed de categories, RLS, funciones RPC y bucket photos). Crea lib/supabase/client.ts y lib/supabase/server.ts usando @supabase/ssr. Documenta en el README los pasos para correr el SQL y crear el bucket. No avances a la Fase 2 hasta que confirme.

</details>

<details><summary>Prompt Fase 5 (núcleo del juego)</summary>

</details>

</details>

Implementa la Fase 5: pantalla /adivinar. Carga las entradas de la pareja con la RPC get_entries_to_guess(fecha) (NUNCA leas entries.category_id en el cliente). Renderiza las 5 polaroids en el corcho y una bandeja inferior con las 5 etiquetas (CategoryChip). Usa @dnd-kit con sensores Pointer y Touch para arrastrar cada etiqueta sobre su polaroid. Cuando las 5 estén colocadas, habilita "Revelar": llama submit_guess por cada una, luego get_day_results, y anima el flip 3D (Card3D) mostrando la etiqueta real por detrás con ✅/❌ y el puntaje X/5. Respeta la paleta y las animaciones suaves.

</details>

---

## 15. [AGENTS.md](http://AGENTS.md) sugerido para el repo

```markdown
# Carrete — Reglas para agentes de código
- Stack: Next.js App Router + TS + Tailwind + Supabase + Framer Motion + @dnd-kit. Deploy: Vercel.
- NUNCA exponer entries.category_id (la respuesta) al cliente antes de adivinar. Usar las RPC.
- El "día" es LOCAL por usuario (profiles.timezone): entry_date = medianoche local del autor, calculada en el servidor con la RPC create_entry. No hay zona horaria global.
- Mobile-first siempre. Probar dnd con sensores touch.
- Estética cozy pastel: lavanda/crema/rosa/salvia, rounded-2xl, sombras suaves, fuentes Quicksand + Caveat.
- Subir imágenes comprimidas a Storage privado; servir con signed URLs.
- Commits por fase; no saltarse fases del plan.
```