import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import app from "../app";
import prisma from "../lib/prisma";

vi.mock("../lib/r2", () => ({
  uploadImage: vi.fn().mockResolvedValue(undefined),
}));

const mockOpenAI = (body: object, status = 200) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(body),
      status,
    })
  );
};

const imageGenerationResponse = (base64 = "abc123") => ({
  output: [{ type: "image_generation_call", result: base64 }],
});

describe("GET /monsters", () => {
  it("データがないとき空配列を返す", async () => {
    const res = await request(app).get("/monsters");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  describe("データがあるとき", () => {
    beforeEach(async () => {
      const book = await prisma.book.create({ data: {} });
      await prisma.monster.createMany({
        data: [
          {
            bookId: book.id,
            name: "ジバニャン",
            imageFilename: "jibanyan.png",
            medalFilename: "jibanyan_medal.png",
            description: "赤と黒のしましま模様の猫の妖怪",
          },
          {
            bookId: book.id,
            name: "ウィスパー",
            imageFilename: "whisper.png",
            medalFilename: "whisper_medal.png",
            description: "白くてふわふわした妖怪執事",
          },
        ],
      });
    });

    it("妖怪一覧を名前の昇順で返す", async () => {
      const res = await request(app).get("/monsters");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe("ウィスパー");
      expect(res.body[1].name).toBe("ジバニャン");
    });

    it("各妖怪が必要なフィールドを持つ", async () => {
      const res = await request(app).get("/monsters");
      const monster = res.body[0];

      expect(monster).toHaveProperty("id");
      expect(monster).toHaveProperty("bookId");
      expect(monster).toHaveProperty("name");
      expect(monster).toHaveProperty("imageFilename");
      expect(monster).toHaveProperty("medalFilename");
      expect(monster).toHaveProperty("description");
    });
  });
});

describe("POST /monsters", () => {
  const photoBuffer = Buffer.from("fake image data");

  it("name がないとき 400 を返す", async () => {
    const res = await request(app)
      .post("/monsters")
      .attach("photo", photoBuffer, "photo.jpg");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("name フィールドが見つかりません");
  });

  it("photo がないとき 400 を返す", async () => {
    const res = await request(app)
      .post("/monsters")
      .field("name", "ジバニャン");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("photo フィールドが見つかりません");
  });

  it("ChatGPT がエラーを返したとき 422 を返す", async () => {
    mockOpenAI({ error: { message: "API error" } });

    const res = await request(app)
      .post("/monsters")
      .field("name", "ジバニャン")
      .attach("photo", photoBuffer, "photo.jpg");

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("API error");
  });

  it("人物が写っていないとき 422 を返す", async () => {
    mockOpenAI({
      output: [{ type: "message", content: [{ text: "NO_PERSON" }] }],
    });

    const res = await request(app)
      .post("/monsters")
      .field("name", "ジバニャン")
      .attach("photo", photoBuffer, "photo.jpg");

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("人物を特定できませんでした");
  });

  it("画像生成に成功したとき monster を DB に保存して 201 を返す", async () => {
    mockOpenAI(imageGenerationResponse());

    const res = await request(app)
      .post("/monsters")
      .field("name", "ジバニャン")
      .attach("photo", photoBuffer, "photo.jpg");

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("ジバニャン");
    expect(res.body.id).toBeDefined();
    expect(res.body.imageFilename).toMatch(/^[\w-]+\.png$/);
  });

  it("生成された monster が DB に保存されている", async () => {
    mockOpenAI(imageGenerationResponse());

    const res = await request(app)
      .post("/monsters")
      .field("name", "ジバニャン")
      .attach("photo", photoBuffer, "photo.jpg");

    const saved = await prisma.monster.findUnique({ where: { id: res.body.id } });
    expect(saved?.name).toBe("ジバニャン");
    expect(saved?.imageFilename).toBe(res.body.imageFilename);
  });
});

describe("GET /monsters/:id", () => {
  let monsterId: string;

  beforeEach(async () => {
    const monster = await prisma.monster.create({
      data: { name: "ジバニャン", imageFilename: "jibanyan.png" },
    });
    monsterId = monster.id;
  });

  it("存在するIDのとき monster を返す", async () => {
    const res = await request(app).get(`/monsters/${monsterId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(monsterId);
    expect(res.body.name).toBe("ジバニャン");
  });

  it("存在しないIDのとき 404 を返す", async () => {
    const res = await request(app).get("/monsters/non-existent-id");

    expect(res.status).toBe(404);
  });
});

describe("PATCH /monsters/:id", () => {
  let monsterId: string;

  beforeEach(async () => {
    const monster = await prisma.monster.create({
      data: { name: "ジバニャン", imageFilename: "jibanyan.png" },
    });
    monsterId = monster.id;
  });

  it("name を更新して更新後の monster を返す", async () => {
    const res = await request(app)
      .patch(`/monsters/${monsterId}`)
      .send({ name: "ジバニャンEX" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(monsterId);
    expect(res.body.name).toBe("ジバニャンEX");
  });

  it("存在しないIDのとき 404 を返す", async () => {
    const res = await request(app)
      .patch("/monsters/non-existent-id")
      .send({ name: "ジバニャンEX" });

    expect(res.status).toBe(404);
  });

  it("name が空のとき 400 を返す", async () => {
    const res = await request(app)
      .patch(`/monsters/${monsterId}`)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("name がないとき 400 を返す", async () => {
    const res = await request(app)
      .patch(`/monsters/${monsterId}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
