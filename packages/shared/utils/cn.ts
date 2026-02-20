import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を結合してTailwind CSSのクラスを最適化
 * clsxとtailwind-mergeを組み合わせて、条件付きクラス名と競合するクラスの解決を行う
 * 
 * @example
 * cn("text-red-500", "text-blue-500") // "text-blue-500" (後者が優先)
 * cn("px-4", condition && "px-8") // condition ? "px-8" : "px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}




