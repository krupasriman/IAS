import { logger } from "../../src/utils/logger";
import { getOrCreateLocalUser } from "../services/auth";
import { getSeedTopics, replaceAllTopics } from "../services/topics";
import { pool } from "./index";

async function main() {
	logger.info("Starting fresh multi-tenant database seed...");
	try {
		const admin = await getOrCreateLocalUser();
		logger.info(
			{ userId: admin.id, username: admin.username },
			"Tenant user verified",
		);

		const seeds = getSeedTopics();
		if (seeds.length === 0) {
			logger.warn("No seed topics found in public/data/topics.json");
			process.exit(0);
		}

		await replaceAllTopics(seeds, admin.id);
		logger.info(
			{ userId: admin.id, topicsSeeded: seeds.length },
			"Fresh seed completed successfully!",
		);
	} catch (err) {
		logger.error({ err }, "Seeding failed");
		process.exit(1);
	} finally {
		await pool.end();
	}
}

void main();
