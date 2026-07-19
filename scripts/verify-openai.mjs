import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MODEL?.trim() || "gpt-5";

if (!apiKey) {
  console.error("OPENAI_API_KEY is not configured.");
  process.exit(1);
}

try {
  const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
  const response = await client.responses.create({
    model,
    input: "Reply with the word ok.",
    store: false
  });

  const output = response.output_text?.trim();
  if (!output) {
    console.error("OpenAI verification returned no output.");
    process.exit(1);
  }

  console.log(`OpenAI verification succeeded with model ${model}.`);
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown OpenAI verification error.";
  console.error(`OpenAI verification failed: ${message}`);
  process.exit(1);
}
