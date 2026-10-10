import { NextRequest, NextResponse } from "next/server";

const PROMPT =
  "この写真に写っている人物の特徴を活かして、妖怪ウォッチ風の可愛いデフォルメキャラクターの画像を生成してください。" +
  "顔や体が一部しか見えない場合や画質が粗い場合でも、見える範囲から想像してキャラクターを作成してください。" +
  "人物が一切写っていない場合のみ、画像を生成せず「NO_PERSON」とテキストのみで返してください。";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const photo = formData.get("photo") as File | null;

  if (!photo) {
    return NextResponse.json(
      { success: false, message: "photo フィールドが見つかりません" },
      { status: 400 }
    );
  }

  const bytes = await photo.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = photo.type || "image/jpeg";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-6-luna",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64}`,
            },
            {
              type: "input_text",
              text: PROMPT,
            },
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    }),
  });

  const data = await res.json();

  if (data.error) {
    return NextResponse.json(
      { success: false, message: data.error.message },
      { status: 422 }
    );
  }

  const imageOutput = data.output?.find(
    (o: { type: string }) => o.type === "image_generation_call"
  );

  if (imageOutput?.result) {
    return NextResponse.json(
      { success: true, imageUrl: `data:image/png;base64,${imageOutput.result}` },
      { status: 201 }
    );
  }

  const messageOutput = data.output?.find(
    (o: { type: string }) => o.type === "message"
  );
  const text = messageOutput?.content?.[0]?.text ?? "";

  if (text.trim() === "NO_PERSON") {
    return NextResponse.json(
      { success: false, message: "人物を特定できませんでした" },
      { status: 422 }
    );
  }

  return NextResponse.json(
    { success: false, message: "画像の生成に失敗しました" },
    { status: 422 }
  );
}
