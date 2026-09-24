const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const envPath = path.join(__dirname, "..", ".env");

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) {
    databaseUrl = match[1];
  }
}

const isSqlite = !databaseUrl || databaseUrl.startsWith("file:") || databaseUrl.startsWith("sqlite:");
const targetProvider = isSqlite ? "sqlite" : "postgresql";

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, "utf-8");
  const currentProviderMatch = schema.match(/provider\s*=\s*["']([^"']+)["']/);
  if (currentProviderMatch && currentProviderMatch[1] !== targetProvider) {
    schema = schema.replace(
      /provider\s*=\s*["'][^"']+["']/,
      `provider = "${targetProvider}"`
    );
    fs.writeFileSync(schemaPath, schema, "utf-8");
    console.log(`[Prisma] Updated schema.prisma provider to: ${targetProvider}`);
  }
}
