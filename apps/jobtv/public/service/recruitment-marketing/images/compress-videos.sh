#!/bin/bash
# 動画ファイルを品質を維持しつつ圧縮するスクリプト

cd "$(dirname "$0")"

# FFmpegの存在確認
if ! command -v ffmpeg &> /dev/null; then
    echo "エラー: FFmpegがインストールされていません。"
    echo "インストール方法: brew install ffmpeg"
    exit 1
fi

# 圧縮設定（品質を維持しつつサイズを削減）
# CRF 23: 高品質（18-28の範囲、小さいほど高品質）
# preset slow: より良い圧縮効率（時間はかかるが品質が良い）
# scale=1080:-1: 幅1080pxにリサイズ（縦横比維持、縦長動画に適切）

compress_video() {
    local input="$1"
    local output="${input%.mp4}-compressed.mp4"
    
    if [ ! -f "$input" ]; then
        echo "警告: $input が見つかりません。スキップします。"
        return
    fi
    
    echo "圧縮中: $input -> $output"
    
    ffmpeg -i "$input" \
        -vcodec libx264 \
        -crf 23 \
        -preset slow \
        -vf "scale=1080:-1" \
        -movflags +faststart \
        -y "$output" 2>&1 | grep -E "(Duration|Stream|Output|error)" || true
    
    if [ -f "$output" ]; then
        original_size=$(du -h "$input" | cut -f1)
        compressed_size=$(du -h "$output" | cut -f1)
        echo "完了: $output (元: $original_size -> 圧縮後: $compressed_size)"
    else
        echo "エラー: $output の作成に失敗しました。"
    fi
}

# 各動画ファイルを圧縮
for file in shorts-sample-*.mp4; do
    if [ -f "$file" ] && [[ ! "$file" =~ -compressed\.mp4$ ]]; then
        compress_video "$file"
        echo ""
    fi
done

echo "圧縮完了！"
echo ""
echo "次のステップ:"
echo "1. 圧縮後の動画の品質を確認してください"
echo "2. 問題なければ、元ファイルを削除して圧縮版にリネーム:"
echo "   mv shorts-sample-XX-compressed.mp4 shorts-sample-XX.mp4"
echo "3. Gitに追加してコミット:"
echo "   git add shorts-sample-*.mp4"
echo "   git commit -m 'chore: compress video files'"




