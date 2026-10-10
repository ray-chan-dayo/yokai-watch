import { Request, Response, Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma";
import { uploadImage } from "../lib/r2";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const PROMPT =
  "この写真に写っている人物の特徴を活かして、妖怪ウォッチ風の可愛いデフォルメキャラクターの画像を生成してください。" +
  "顔や体が一部しか見えない場合や画質が粗い場合でも、見える範囲から想像してキャラクターを作成してください。" +
  "人物が一切写っていない場合のみ、画像を生成せず「NO_PERSON」とテキストのみで返してください。";

router.post("/", upload.single("photo"), async (req: Request, res: Response) => {
  const name = req.body.name as string | undefined;
  if (!name) {
    res.status(400).json({ success: false, message: "name フィールドが見つかりません" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ success: false, message: "photo フィールドが見つかりません" });
    return;
  }

  const base64 = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype || "image/jpeg";

  const apiRes = await fetch("https://api.openai.com/v1/responses", {
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
            { type: "input_image", image_url: `data:${mimeType};base64,${base64}` },
            { type: "input_text", text: PROMPT },
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    }),
  });

  type OutputItem = { type: string; result?: string; content?: { text?: string }[] };
  type OpenAIResponse = { error?: { message: string }; output?: OutputItem[] };
  const data = (await apiRes.json()) as OpenAIResponse;

  if (data.error) {
    res.status(422).json({ success: false, message: data.error.message });
    return;
  }

  const imageOutput = data.output?.find((o) => o.type === "image_generation_call");

  if (!imageOutput?.result) {
    const text = data.output?.find((o) => o.type === "message")?.content?.[0]?.text ?? "";
    if (text.trim() === "NO_PERSON") {
      res.status(422).json({ success: false, message: "人物を特定できませんでした" });
    } else {
      res.status(422).json({ success: false, message: "画像の生成に失敗しました" });
    }
    return;
  }

  const imageFilename = `${randomUUID()}.png`;
  const imageBuffer = Buffer.from(imageOutput.result, "base64");
  await uploadImage(imageFilename, imageBuffer, "image/png");

  const monster = await prisma.monster.create({
    data: { name, imageFilename },
  });

  res.status(201).json(monster);
});

router.get("/", async (_req: Request, res: Response) => {
  const monsters = await prisma.monster.findMany({
    orderBy: { name: "asc" },
  });
  res.json(monsters);
});

export default router;
