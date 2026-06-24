import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const imagePath = path.join("/");

  if (!imagePath) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data, error } = await supabase.storage
    .from("photos")
    .download(imagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "No pude cargar la foto." },
      { status: 404 }
    );
  }

  return new Response(data, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Type": data.type || "image/jpeg"
    }
  });
}
