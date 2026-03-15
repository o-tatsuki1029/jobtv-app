"use client";

import type { LineMessage } from "@/types/line-flex.types";
import { FlexRenderer } from "./FlexRenderer";
import { LINE_GREEN, CHAT_BG } from "./line-flex-constants";
import { ChevronLeft, Menu, Phone } from "lucide-react";

interface LineChatFrameProps {
  message: LineMessage | null;
}

export function LineChatFrame({ message }: LineChatFrameProps) {
  return (
    <div
      style={{
        width: 375,
        height: 667,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 20,
        border: "1px solid #e0e0e0",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        backgroundColor: CHAT_BG,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: LINE_GREEN,
        }}
      >
        <ChevronLeft style={{ width: 20, height: 20, color: "#fff" }} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          JOBTV
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Phone style={{ width: 16, height: 16, color: "#fff" }} />
          <Menu style={{ width: 16, height: 16, color: "#fff" }} />
        </div>
      </div>

      {/* Chat area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflowY: "auto",
          padding: 12,
        }}
      >
        {message ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: "50%",
                backgroundColor: LINE_GREEN,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              JT
            </div>
            <div style={{ minWidth: 0, maxWidth: "calc(100% - 44px)" }}>
              <p
                style={{
                  margin: "0 0 4px 0",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: 500,
                }}
              >
                JOBTV
              </p>
              <FlexRenderer message={message} />
              <p
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.6)",
                  textAlign: "left",
                }}
              >
                14:30
              </p>
            </div>
          </div>
        ) : (
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            メッセージを作成するとプレビューが表示されます
          </p>
        )}
      </div>

      {/* Input bar (decorative) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: "#fff",
          padding: "8px 12px",
        }}
      >
        <div
          style={{
            flex: 1,
            borderRadius: 20,
            backgroundColor: "#f5f5f5",
            padding: "6px 12px",
            fontSize: 12,
            color: "#999",
          }}
        >
          Aa
        </div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: LINE_GREEN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="#fff"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
