import { describe, it, expect } from "vitest";
import {
  hasFieldChanges,
  hasArrayChanges,
  hasObjectChanges,
  hasChanges,
} from "../form-utils";

describe("hasFieldChanges", () => {
  it("変更なしはfalseを返す", () => {
    const current = { name: "田中", email: "tanaka@example.com" };
    const initial = { name: "田中", email: "tanaka@example.com" };
    expect(hasFieldChanges(current, initial, ["name", "email"])).toBe(false);
  });

  it("変更ありはtrueを返す", () => {
    const current = { name: "鈴木", email: "tanaka@example.com" };
    const initial = { name: "田中", email: "tanaka@example.com" };
    expect(hasFieldChanges(current, initial, ["name", "email"])).toBe(true);
  });

  it("指定フィールドのみ比較する", () => {
    const current = { name: "鈴木", email: "tanaka@example.com" };
    const initial = { name: "田中", email: "tanaka@example.com" };
    expect(hasFieldChanges(current, initial, ["email"])).toBe(false);
  });

  it("undefinedとnullは空文字として扱う", () => {
    const current = { name: undefined as unknown as string, email: "" };
    const initial = { name: "", email: null as unknown as string };
    expect(hasFieldChanges(current, initial, ["name", "email"])).toBe(false);
  });
});

describe("hasArrayChanges", () => {
  it("同じ配列はfalseを返す", () => {
    expect(hasArrayChanges([1, 2, 3], [1, 2, 3])).toBe(false);
    expect(hasArrayChanges([], [])).toBe(false);
  });

  it("異なる配列はtrueを返す", () => {
    expect(hasArrayChanges([1, 2, 3], [1, 2])).toBe(true);
    expect(hasArrayChanges([1, 2, 3], [3, 2, 1])).toBe(true);
  });
});

describe("hasObjectChanges", () => {
  it("同じオブジェクトはfalseを返す", () => {
    expect(hasObjectChanges({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(false);
  });

  it("異なるオブジェクトはtrueを返す", () => {
    expect(hasObjectChanges({ a: 1 }, { a: 2 })).toBe(true);
  });
});

describe("hasChanges", () => {
  it("すべてfalseはfalseを返す", () => {
    expect(hasChanges(false, false, false)).toBe(false);
  });

  it("1つでもtrueであればtrueを返す", () => {
    expect(hasChanges(false, true, false)).toBe(true);
    expect(hasChanges(true, false, false)).toBe(true);
  });
});
