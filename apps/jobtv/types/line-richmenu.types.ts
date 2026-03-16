export type LineRichMenuBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LineRichMenuAreaAction = {
  type: "uri" | "message" | "postback";
  uri?: string;
  text?: string;
  data?: string;
  label?: string;
};

export type LineRichMenuArea = {
  bounds: LineRichMenuBounds;
  action: LineRichMenuAreaAction;
};

export type LineRichMenuSize = {
  width: 2500;
  height: 1686 | 843;
};

export type LineRichMenu = {
  richMenuId: string;
  name: string;
  chatBarText: string;
  size: LineRichMenuSize;
  areas: LineRichMenuArea[];
  selected: boolean;
};

export type CreateRichMenuInput = {
  name: string;
  chatBarText: string;
  size: LineRichMenuSize;
  areas: LineRichMenuArea[];
  selected?: boolean;
  image: File;
};
