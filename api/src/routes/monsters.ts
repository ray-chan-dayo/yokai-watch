import { Request, Response, Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma";
import { uploadImage } from "../lib/r2";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const CHARACTER_PROMPT =
  "この写真に写っている人物の特徴を活かして、妖怪ウォッチ風の可愛いデフォルメキャラクターの画像を生成してください。" +
  "顔や体が一部しか見えない場合や画質が粗い場合でも、見える範囲から想像してキャラクターを作成してください。" +
  "人物が一切写っていない場合のみ、画像を生成せず「NO_PERSON」とテキストのみで返してください。";

const MEDAL_PROMPT =
  "この写真に写っている人物の特徴を活かして、妖怪ウォッチのメダル風の円形画像を生成してください。" +
  "円形のメダルの中央に妖怪ウォッチ風にデフォルメされた人物のキャラクターイラスト、周囲に金色の装飾的なフレームデザインを描いてください。" +
  "背景は透明または単色にしてください。";

type OutputItem = { type: string; result?: string; content?: { text?: string }[] };
type OpenAIResponse = { error?: { message: string }; output?: OutputItem[] };

async function callOpenAI(
  base64: string,
  mimeType: string,
  prompt: string,
  size?: string
): Promise<OpenAIResponse> {
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
            { type: "input_image", image_url: `data:${mimeType};base64,${base64}` },
            { type: "input_text", text: prompt },
          ],
        },
      ],
      tools: [{ type: "image_generation", ...(size && { size }) }],
    }),
  });
  return res.json() as Promise<OpenAIResponse>;
}

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

  const [characterData, medalData] = await Promise.all([
    callOpenAI(base64, mimeType, CHARACTER_PROMPT),
    callOpenAI(base64, mimeType, MEDAL_PROMPT, "256x256"),
  ]);

  if (characterData.error) {
    res.status(422).json({ success: false, message: characterData.error.message });
    return;
  }

  const characterOutput = characterData.output?.find((o) => o.type === "image_generation_call");

  if (!characterOutput?.result) {
    const text = characterData.output?.find((o) => o.type === "message")?.content?.[0]?.text ?? "";
    if (text.trim() === "NO_PERSON") {
      res.status(422).json({ success: false, message: "人物を特定できませんでした" });
    } else {
      res.status(422).json({ success: false, message: "画像の生成に失敗しました" });
    }
    return;
  }

  const medalOutput = medalData.output?.find((o) => o.type === "image_generation_call");

  const imageFilename = `${randomUUID()}.png`;
  const medalFilename = medalOutput?.result ? `${randomUUID()}.png` : null;

  await Promise.all([
    uploadImage(imageFilename, Buffer.from(characterOutput.result, "base64"), "image/png"),
    ...(medalFilename && medalOutput?.result
      ? [uploadImage(medalFilename, Buffer.from(medalOutput.result, "base64"), "image/png")]
      : []),
  ]);

  const monster = await prisma.monster.create({
    data: { name, imageFilename, medalFilename },
  });

  res.status(201).json(monster);
});

router.get("/", async (_req: Request, res: Response) => {
  const monsters = await prisma.monster.findMany({
    orderBy: { name: "asc" },
  });
  res.json(monsters);
});

router.get("/:id", async (req: Request, res: Response) => {
  const monster = await prisma.monster.findUnique({
    where: { id: req.params.id },
  });
  if (!monster) {
    res.status(404).json({ success: false, message: "妖怪が見つかりません" });
    return;
  }
  res.json(monster);
});

export default router;
