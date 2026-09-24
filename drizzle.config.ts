import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config();

const url =
	process.env.DATABASE_URL ||
	"postgresql://postgres:postgres@localhost:5432/ias";

export default defineConfig({
	schema: "./server/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url,
	},
});
