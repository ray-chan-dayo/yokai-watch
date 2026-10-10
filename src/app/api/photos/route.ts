import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });

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

  const visionRes = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: "text",
            text: "この写真に写っている人物の特徴（性別、年齢感、髪型、表情、服装など）を詳しく日本語で説明してください。人物が特定できない場合は「人物を特定できませんでした」とだけ返してください。",
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const description = visionRes.choices[0]?.message?.content ?? "";

  if (description.includes("人物を特定できませんでした")) {
    return NextResponse.json(
      { success: false, message: "人物を特定できませんでした" },
      { status: 422 }
    );
  }

  const imageRes = await openai.images.generate({
    model: "dall-e-3",
    prompt: `妖怪ウォッチ風のキャラクターイラスト。以下の特徴を持つ人物をベースに、可愛くデフォルメした妖怪キャラクターを生成してください。特徴: ${description}`,
    size: "1024x1024",
    quality: "standard",
    n: 1,
    response_format: "b64_json",
  });

  const imageData = imageRes.data?.[0]?.b64_json;

  if (!imageData) {
    return NextResponse.json(
      { success: false, message: "画像の生成に失敗しました" },
      { status: 422 }
    );
  }

  return NextResponse.json(
    { success: true, imageUrl: `data:image/png;base64,${imageData}` },
    { status: 201 }
  );
}
