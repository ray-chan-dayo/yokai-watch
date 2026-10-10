import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = (formData.get("name") as string | null) ?? "モックの妖怪";

  await new Promise((r) => setTimeout(r, 800));

  return NextResponse.json(
    {
      id: crypto.randomUUID(),
      name,
      imageFilename: "mock-monster.svg",
      bookId: null,
      medalFilename: null,
      description: null,
    },
    { status: 201 }
  );
}
