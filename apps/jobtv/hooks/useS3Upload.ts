"use client";

import { useState, useCallback, useRef } from "react";

export interface S3UploadProgress {
  /** 0〜100 */
  percent: number;
  /** アップロード済みバイト数 */
  loaded: number;
  /** 総バイト数 */
  total: number;
}

export interface UseS3UploadReturn {
  /** S3 にファイルを直接アップロード */
  upload: (presignedUrl: string, file: File) => Promise<{ success: boolean; error?: string }>;
  /** アップロード中かどうか */
  isUploading: boolean;
  /** 進捗情報 */
  progress: S3UploadProgress | null;
  /** アップロードをキャンセル */
  cancel: () => void;
}

/**
 * Presigned URL を使って S3 にクライアントから直接アップロードする hook。
 * XMLHttpRequest を使用してプログレスイベントを取得する。
 */
export function useS3Upload(): UseS3UploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<S3UploadProgress | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const cancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setIsUploading(false);
    setProgress(null);
  }, []);

  const upload = useCallback(
    (presignedUrl: string, file: File): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        setIsUploading(true);
        setProgress({ percent: 0, loaded: 0, total: file.size });

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress({
              percent: Math.round((e.loaded / e.total) * 100),
              loaded: e.loaded,
              total: e.total
            });
          }
        });

        xhr.addEventListener("load", () => {
          xhrRef.current = null;
          setIsUploading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress({ percent: 100, loaded: file.size, total: file.size });
            resolve({ success: true });
          } else {
            setProgress(null);
            resolve({
              success: false,
              error: `アップロードに失敗しました (HTTP ${xhr.status})`
            });
          }
        });

        xhr.addEventListener("error", () => {
          xhrRef.current = null;
          setIsUploading(false);
          setProgress(null);
          resolve({
            success: false,
            error: "ネットワークエラーが発生しました。接続を確認してもう一度お試しください。"
          });
        });

        xhr.addEventListener("abort", () => {
          xhrRef.current = null;
          setIsUploading(false);
          setProgress(null);
          resolve({ success: false, error: "アップロードがキャンセルされました" });
        });

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    },
    []
  );

  return { upload, isUploading, progress, cancel };
}
