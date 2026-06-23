# Carrete — Reglas para agentes de código
- Stack: Next.js App Router + TS + Tailwind + Supabase + Framer Motion + @dnd-kit. Deploy: Vercel.
- NUNCA exponer entries.category_id (la respuesta) al cliente antes de adivinar. Usar las RPC.
- El "día" es LOCAL por usuario (profiles.timezone): entry_date = medianoche local del autor, calculada en el servidor con la RPC create_entry. No hay zona horaria global.
- Mobile-first siempre. Probar dnd con sensores touch.
- Estética cozy pastel: lavanda/crema/rosa/salvia, rounded-2xl, sombras suaves, fuentes Quicksand + Caveat.
- Subir imágenes comprimidas a Storage privado; servir con signed URLs.
- Commits por fase; no saltarse fases del plan.