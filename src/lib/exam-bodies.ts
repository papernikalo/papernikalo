export type ExamChoice = {
  id: string;
  name: string;
  posts: string;
  langs: string;
};

export const examBodies = [
  { id: "ssc-chsl", name: "SSC CHSL", posts: "LDC / JSA, DEO skill test", langs: "English · Hindi" },
  { id: "ssc-cgl", name: "SSC CGL", posts: "Data Entry Speed Test (DEST)", langs: "English" },
  { id: "dhc", name: "Delhi High Court", posts: "JJA, SPA, Personal Assistant", langs: "English · Hindi" },
  { id: "sci", name: "Supreme Court", posts: "Junior Court Assistant", langs: "English" },
  { id: "aiims", name: "AIIMS", posts: "LDC, UDC, Stenographer", langs: "English · Hindi" },
  { id: "dsssb", name: "DSSSB", posts: "LDC, Junior Assistant", langs: "English · Hindi" },
  { id: "rrb", name: "RRB NTPC", posts: "Clerk, Typist posts", langs: "English · Hindi" },
  { id: "other", name: "Other / Custom", posts: "Set your own time and rules", langs: "English · Hindi" },
] as const;

export type ExamBodyId = (typeof examBodies)[number]["id"];

export function examBodyName(id: string | undefined, extra: { id: string; name: string }[] = []) {
  return examBodies.find((item) => item.id === id)?.name ?? extra.find((item) => item.id === id)?.name ?? "";
}
