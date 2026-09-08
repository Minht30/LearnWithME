import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DbTest, DbQuestion } from "@/lib/db/types";
import { TestPdf } from "@/lib/pdf/test-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const withKey = req.nextUrl.searchParams.get("withKey") === "1";

  const admin = createAdminClient();
  const [{ data: test }, { data: questions }] = await Promise.all([
    admin.from("tests").select("*").eq("id", id).maybeSingle(),
    admin.from("questions").select("*").eq("test_id", id).order("position"),
  ]);
  if (!test) return new Response("Not found", { status: 404 });

  const buf = await renderToBuffer(
    TestPdf({
      test: test as DbTest,
      questions: (questions ?? []) as DbQuestion[],
      withKey,
    })
  );

  const filename = `${slugify(test.title)}${withKey ? "-teacher" : ""}.pdf`;
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "test";
}
