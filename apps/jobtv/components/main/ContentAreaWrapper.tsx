"use client";

import type { ReactNode } from "react";
import { useMainTheme } from "@/components/theme/PageThemeContext";

export default function ContentAreaWrapper({ children }: { children: ReactNode }) {
  const { classes } = useMainTheme();
  return <div className={classes.contentAreaBg}>{children}</div>;
}
