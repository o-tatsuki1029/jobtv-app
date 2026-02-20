"use client";

import React, { useState } from "react";
import { MessageSquare, Search, Send, Paperclip, MoreVertical, User } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

interface Candidate {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export default function ChatPage() {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>("1");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ダミーデータ
  const candidates: Candidate[] = [
    {
      id: "1",
      name: "山田 太郎",
      lastMessage: "ありがとうございます。よろしくお願いいたします。",
      lastMessageTime: "10:30",
      unreadCount: 2,
      isOnline: true
    },
    {
      id: "2",
      name: "佐藤 花子",
      lastMessage: "面接日程について確認させてください。",
      lastMessageTime: "昨日",
      unreadCount: 0,
      isOnline: false
    },
    {
      id: "3",
      name: "鈴木 一郎",
      lastMessage: "履歴書を添付いたしました。",
      lastMessageTime: "2日前",
      unreadCount: 1,
      isOnline: false
    },
    {
      id: "4",
      name: "田中 美咲",
      lastMessage: "お世話になっております。",
      lastMessageTime: "3日前",
      unreadCount: 0,
      isOnline: true
    }
  ];

  const messages: Message[] = [
    {
      id: "1",
      senderId: "1",
      content: "お世話になっております。先日応募させていただきました山田です。",
      timestamp: "10:25",
      isOwn: false
    },
    {
      id: "2",
      senderId: "company",
      content: "山田様、ご応募ありがとうございます。書類選考の結果、面接にお進みいただきたく存じます。",
      timestamp: "10:27",
      isOwn: true
    },
    {
      id: "3",
      senderId: "1",
      content: "ありがとうございます。ぜひよろしくお願いいたします。",
      timestamp: "10:28",
      isOwn: false
    },
    {
      id: "4",
      senderId: "company",
      content: "それでは、来週の火曜日14時からオンライン面接を実施したいと思いますが、ご都合いかがでしょうか？",
      timestamp: "10:29",
      isOwn: true
    },
    {
      id: "5",
      senderId: "1",
      content: "ありがとうございます。よろしくお願いいたします。",
      timestamp: "10:30",
      isOwn: false
    }
  ];

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId);

  const filteredCandidates = candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // TODO: メッセージ送信処理
      console.log("Send message:", messageInput);
      setMessageInput("");
      // テキストエリアの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Enterキーでの送信は無効化（改行のみ）
    // 送信ボタンをクリックして送信する
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // 400字制限
    if (value.length <= 400) {
      setMessageInput(value);

      // 高さを自動調整
      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = Math.min(scrollHeight, 120) + "px";
      }
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 候補者リスト */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-lg text-gray-900">チャット</h2>
          </div>
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="候補者を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        {/* 候補者リスト */}
        <div className="flex-1 overflow-y-auto">
          {filteredCandidates.map((candidate) => (
            <button
              key={candidate.id}
              onClick={() => setSelectedCandidateId(candidate.id)}
              className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedCandidateId === candidate.id ? "bg-gray-50" : ""
              }`}
            >
              {/* アバター */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  {candidate.avatar ? (
                    <img src={candidate.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                {candidate.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-gray-900 truncate">{candidate.name}</p>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{candidate.lastMessageTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate">{candidate.lastMessage}</p>
                  {candidate.unreadCount > 0 && (
                    <span className="ml-2 flex-shrink-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {candidate.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* チャットエリア */}
      {selectedCandidate ? (
        <div className="flex-1 flex flex-col">
          {/* チャットヘッダー */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {selectedCandidate.avatar ? (
                    <img src={selectedCandidate.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {selectedCandidate.isOnline && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedCandidate.name}</p>
                <p className="text-xs text-gray-500">{selectedCandidate.isOnline ? "オンライン" : "オフライン"}</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div key={message.id} className={`flex flex-col ${message.isOwn ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.isOwn
                      ? "bg-green-400 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 px-1">{message.timestamp}</p>
              </div>
            ))}
          </div>

          {/* 入力エリア */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-end gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Paperclip className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="メッセージを入力...（400字以内）"
                  rows={1}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  style={{ minHeight: "44px", maxHeight: "120px", height: "44px" }}
                />
                <div className="absolute bottom-2 right-3 text-xs text-gray-400">{messageInput.length}/400</div>
              </div>
              <StudioButton
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                icon={<Send className="w-4 h-4" />}
              >
                送信
              </StudioButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">チャットを選択してください</p>
            <p className="text-sm text-gray-400 mt-2">候補者を選択してメッセージを開始します</p>
          </div>
        </div>
      )}
    </div>
  );
}
