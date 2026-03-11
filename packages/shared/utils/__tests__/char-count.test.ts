import { describe, it, expect } from "vitest";
import {
  getCharCountText,
  getCharCountLevel,
  getCharCountClassName,
} from "../char-count";

describe("getCharCountText", () => {
  it("maxLengthなしは文字数のみ表示", () => {
    expect(getCharCountText(10)).toBe("10文字");
    expect(getCharCountText(0)).toBe("0文字");
  });

  it("maxLengthありは現在/最大形式", () => {
    expect(getCharCountText(10, 100)).toBe("10 / 100文字");
    expect(getCharCountText(0, 50)).toBe("0 / 50文字");
    expect(getCharCountText(100, 100)).toBe("100 / 100文字");
  });
});

describe("getCharCountLevel", () => {
  it("maxLengthなしはnormal", () => {
    expect(getCharCountLevel(100)).toBe("normal");
    expect(getCharCountLevel(0)).toBe("normal");
  });

  it("maxLength超過はerror", () => {
    expect(getCharCountLevel(101, 100)).toBe("error");
    expect(getCharCountLevel(200, 100)).toBe("error");
  });

  it("90%超過はwarning", () => {
    expect(getCharCountLevel(91, 100)).toBe("warning");
    expect(getCharCountLevel(95, 100)).toBe("warning");
    expect(getCharCountLevel(100, 100)).toBe("warning");
  });

  it("90%以下はnormal", () => {
    expect(getCharCountLevel(90, 100)).toBe("normal");
    expect(getCharCountLevel(0, 100)).toBe("normal");
  });
});

describe("getCharCountClassName", () => {
  it("errorはred-500クラス", () => {
    expect(getCharCountClassName(101, 100)).toBe("text-red-500");
  });

  it("warningはyellow-500クラス", () => {
    expect(getCharCountClassName(95, 100)).toBe("text-yellow-500");
  });

  it("normalはgray-400クラス", () => {
    expect(getCharCountClassName(50, 100)).toBe("text-gray-400");
    expect(getCharCountClassName(50)).toBe("text-gray-400");
  });
});
