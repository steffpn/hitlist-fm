#!/usr/bin/env node
// Prints platform theme snippets from tokens.json (dev tool, not a build step).
// Usage: node generate.mjs [swift|kotlin|css]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(path.join(dir, "tokens.json"), "utf8"));
const target = process.argv[2] ?? "css";

const hex = (v) => v.replace("#", "");
const entries = Object.entries(t.color).filter(([, v]) => v.startsWith("#"));

if (target === "swift") {
  for (const [name, v] of entries) {
    console.log(`static let ${name} = Color(hex: 0x${hex(v)})`);
  }
  console.log(`// gradient CTA: ${t.gradient.cta.join(" -> ")}`);
} else if (target === "kotlin") {
  for (const [name, v] of entries) {
    const n = name[0].toUpperCase() + name.slice(1);
    console.log(`val Oa${n} = Color(0xFF${hex(v).toUpperCase()})`);
  }
  console.log(`// gradient CTA: ${t.gradient.cta.join(" -> ")}`);
} else {
  console.log(":root {");
  for (const [name, v] of Object.entries(t.color)) {
    const kebab = name.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    console.log(`  --oa-${kebab}: ${v};`);
  }
  console.log("}");
}
