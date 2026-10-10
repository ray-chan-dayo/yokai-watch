import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  const openaiRes = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-6-luna",
      input: text,
      store: true,
    }),
  });

  const data = await openaiRes.json();
  const messageOutput = data.output?.find(
    (o: { type: string }) => o.type === "message"
  );
  const responseText = messageOutput?.content?.[0]?.text ?? "";

  return NextResponse.json({ text: responseText }, { status: 201 });
}
