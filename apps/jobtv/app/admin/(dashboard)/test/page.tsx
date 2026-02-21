"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { uploadVideoToS3Action, uploadThumbnailToS3Action } from "@/lib/actions/video-actions";

export default function AdminTestPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"landscape" | "portrait">("landscape");
  const [videoId, setVideoId] = useState<string>("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [videoResult, setVideoResult] = useState<{
    success: boolean;
    data?: { s3Key: string; url: string; s3Url: string };
    error?: string;
  } | null>(null);
  const [thumbnailResult, setThumbnailResult] = useState<{
    success: boolean;
    data?: { s3Key: string; url: string; s3Url: string };
    error?: string;
  } | null>(null);

  const handleVideoUpload = async () => {
    if (!videoFile) {
      alert("動画ファイルを選択してください");
      return;
    }

    setIsUploadingVideo(true);
    setVideoResult(null);

    try {
      const result = await uploadVideoToS3Action(videoFile, aspectRatio, videoId || undefined);
      if (result.error) {
        setVideoResult({ success: false, error: result.error });
      } else if (result.data) {
        setVideoResult({ success: true, data: result.data });
      } else {
        setVideoResult({ success: false, error: "予期しないエラーが発生しました" });
      }
    } catch (error) {
      setVideoResult({
        success: false,
        error: error instanceof Error ? error.message : "アップロードに失敗しました"
      });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleThumbnailUpload = async () => {
    if (!thumbnailFile) {
      alert("サムネイルファイルを選択してください");
      return;
    }

    setIsUploadingThumbnail(true);
    setThumbnailResult(null);

    try {
      const result = await uploadThumbnailToS3Action(thumbnailFile, videoId || undefined);
      if (result.error) {
        setThumbnailResult({ success: false, error: result.error });
      } else if (result.data) {
        setThumbnailResult({ success: true, data: result.data });
      } else {
        setThumbnailResult({ success: false, error: "予期しないエラーが発生しました" });
      }
    } catch (error) {
      setThumbnailResult({
        success: false,
        error: error instanceof Error ? error.message : "アップロードに失敗しました"
      });
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">動画アップロードテスト</h1>
        <p className="text-gray-500 font-medium mt-2">S3への動画・サムネイルアップロード機能をテストします</p>
      </div>

      {/* 動画アップロード */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">動画アップロード</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">動画ID（オプション）</label>
            <input
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="指定しない場合は自動生成されます"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">アスペクト比</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as "landscape" | "portrait")}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="landscape">横長（16:9）</option>
              <option value="portrait">縦長（9:16）</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">動画ファイル</label>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {videoFile && (
              <p className="text-sm text-gray-500 mt-1">
                選択中: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            onClick={handleVideoUpload}
            disabled={!videoFile || isUploadingVideo}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploadingVideo ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                動画をアップロード
              </>
            )}
          </button>

          {videoResult && (
            <div
              className={`p-4 rounded-md border ${
                videoResult.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {videoResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {videoResult.success ? (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-green-800">アップロード成功</p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-bold">S3キー:</span>{" "}
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{videoResult.data?.s3Key}</code>
                        </p>
                        <p>
                          <span className="font-bold">CloudFront URL:</span>{" "}
                          <a
                            href={videoResult.data?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {videoResult.data?.url}
                          </a>
                        </p>
                        <p>
                          <span className="font-bold">S3 URL:</span>{" "}
                          <a
                            href={videoResult.data?.s3Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {videoResult.data?.s3Url}
                          </a>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-red-800">アップロード失敗</p>
                      <p className="text-sm text-red-700 mt-1">{videoResult.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* サムネイルアップロード */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">サムネイルアップロード</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">動画ID（オプション）</label>
            <input
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="指定しない場合は自動生成されます"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">サムネイル画像</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {thumbnailFile && (
              <p className="text-sm text-gray-500 mt-1">
                選択中: {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            onClick={handleThumbnailUpload}
            disabled={!thumbnailFile || isUploadingThumbnail}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploadingThumbnail ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                サムネイルをアップロード
              </>
            )}
          </button>

          {thumbnailResult && (
            <div
              className={`p-4 rounded-md border ${
                thumbnailResult.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {thumbnailResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {thumbnailResult.success ? (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-green-800">アップロード成功</p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-bold">S3キー:</span>{" "}
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {thumbnailResult.data?.s3Key}
                          </code>
                        </p>
                        <p>
                          <span className="font-bold">CloudFront URL:</span>{" "}
                          <a
                            href={thumbnailResult.data?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {thumbnailResult.data?.url}
                          </a>
                        </p>
                        <p>
                          <span className="font-bold">S3 URL:</span>{" "}
                          <a
                            href={thumbnailResult.data?.s3Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {thumbnailResult.data?.s3Url}
                          </a>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-red-800">アップロード失敗</p>
                      <p className="text-sm text-red-700 mt-1">{thumbnailResult.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

