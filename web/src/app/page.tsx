"use client";

import { useEffect, useRef, useState } from "react";
import { postMonster } from "@/lib/api";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function handleCapture(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setGenerated(null);
    setErrorMessage("");
    setStatus("idle");
    // Let the user choose the same image again after retaking or retrying.
    event.currentTarget.value = "";
  }

  async function handleSubmit() {
    if (!photo || !name.trim()) return;

    setStatus("sending");
    setErrorMessage("");
    try {
      const data = await postMonster(name.trim(), photo);
      if (data.success) {
        setGenerated(data.imageUrl);
        setStatus("done");
      } else {
        setErrorMessage(data.message);
        setStatus("error");
      }
    } catch {
      setErrorMessage("送信に失敗しました。通信環境を確認して、もう一度お試しください。");
      setStatus("error");
    }
  }

  const isReady = Boolean(photo && name.trim());

  return (
    <main className="home-shell">
      <section className="create-panel" aria-labelledby="page-title">
        <header className="page-heading">
          <svg className="title-flame title-flame-left" aria-hidden="true" viewBox="0 0 100 160">
            <path d="M50 5c4 28 38 39 38 72 0 24-17 43-39 43S10 103 10 80c0-16 9-28 25-38-2 15 4 24 14 30C64 55 56 32 50 5Z" />
            <path className="title-flame-cutout" d="M48 87c-10 4-15 11-15 20 0 9 7 15 16 15s17-7 17-16c0-7-5-12-12-16 2 8 0 13-5 16-5-5-4-12-1-19Z" />
          </svg>
          <h1 id="page-title"><span>なかま妖怪</span><span>大図鑑</span></h1>
          <svg className="title-flame title-flame-right" aria-hidden="true" viewBox="0 0 100 160">
            <path d="M50 5c4 28 38 39 38 72 0 24-17 43-39 43S10 103 10 80c0-16 9-28 25-38-2 15 4 24 14 30C64 55 56 32 50 5Z" />
            <path className="title-flame-cutout" d="M48 87c-10 4-15 11-15 20 0 9 7 15 16 15s17-7 17-16c0-7-5-12-12-16 2 8 0 13-5 16-5-5-4-12-1-19Z" />
          </svg>
        </header>

        <div className="photo-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview ?? "/hero-sample.jpg"}
            alt={preview ? "選択した写真のプレビュー" : "写真プレビューのサンプル"}
            className="photo-preview"
          />
          {preview && <span className="photo-badge">写真を選択中</span>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          onChange={handleCapture}
          aria-label="変換する写真を選ぶ"
        />

        <div className="form-stack">
          <button className="camera-button" onClick={() => inputRef.current?.click()}>
            再撮影
          </button>

          <label className="name-field">
            <span className="visually-hidden">妖怪の名前</span>
            <input
              type="text"
              placeholder="妖怪のなまえを入力"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoComplete="off"
            />
            <span className="name-sparkle" aria-hidden="true">✧</span>
          </label>

          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={!isReady || status === "sending" || status === "done"}
          >
            {status === "sending" ? (
              <><span className="loading-dot" aria-hidden="true" />妖怪を召喚中…</>
            ) : status === "done" ? "生成しました" : "この写真を送信"}
          </button>
        </div>

        {status === "error" && <p className="error-message" role="alert">{errorMessage}</p>}

        {status === "done" && generated && (
          <section className="result-card" aria-live="polite" aria-label="生成された妖怪">
            <p className="result-label"><span aria-hidden="true">✦</span> あなたの妖怪</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generated} alt={`${name}から生まれた妖怪`} />
            <p className="result-name">{name}</p>
            <button
              className="reset-button"
              onClick={() => {
                setStatus("idle");
                setGenerated(null);
              }}
            >
              もう一度つくる
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
