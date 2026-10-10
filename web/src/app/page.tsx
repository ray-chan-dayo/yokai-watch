"use client";

import { useRef, useState } from "react";
import { postMonster } from "@/lib/api";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setGenerated(null);
    setStatus("idle");
  }

  async function handleSubmit() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStatus("sending");
    try {
      const data = await postMonster(name, file);
      if (data.success) {
        setGenerated(data.imageUrl);
        setStatus("done");
      } else {
        setErrorMessage(data.message);
        setStatus("error");
      }
    } catch {
      setErrorMessage("送信に失敗しました");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          妖怪ウォッチ変換
        </h1>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="撮影した写真"
            className="w-full rounded-2xl object-cover"
          />
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-full bg-zinc-900 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          カメラで撮影
        </button>

        {preview && status !== "done" && (
          <>
            <input
              type="text"
              placeholder="妖怪名を入力"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-full border border-zinc-300 px-5 py-3 text-base text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-50"
            />
            <button
              onClick={handleSubmit}
              disabled={status === "sending" || !name.trim()}
              className="w-full rounded-full border border-zinc-900 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              {status === "sending" ? "送信中…" : "この写真を送信"}
            </button>
          </>
        )}

        {status === "done" && generated && (
          <div className="flex w-full flex-col items-center gap-2">
            <p className="text-sm text-green-600 dark:text-green-400">生成しました</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generated}
              alt="生成された妖怪キャラクター"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        )}
        {status === "error" && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
