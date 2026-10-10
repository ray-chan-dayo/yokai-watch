import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../app";
import prisma from "../lib/prisma";

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
