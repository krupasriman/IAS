import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../../src/utils/logger.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

let encryptionKey: Buffer | null = null;

function loadEncryptionKey(): Buffer {
	if (encryptionKey) return encryptionKey;

	const fromEnv = process.env.ENCRYPTION_KEY;
	if (fromEnv) {
		try {
			const decoded = Buffer.from(fromEnv, "base64");
			if (decoded.length === KEY_LENGTH) {
				encryptionKey = decoded;
				return encryptionKey;
			}
			logger.warn(
				`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} base64 chars). Using generated fallback key.`,
			);
		} catch {
			// fallback to generated
		}
	}

	// Dev / Serverless fallback paths
	const possiblePaths = [
		path.join(__dirname, "../../data/.encryption.key"),
		"/tmp/.encryption.key",
	];

	for (const keyFile of possiblePaths) {
		try {
			if (fs.existsSync(keyFile)) {
				encryptionKey = Buffer.from(fs.readFileSync(keyFile, "utf8"), "base64");
				return encryptionKey;
			}
		} catch {
			// ignore read error
		}
	}

	const generated = randomBytes(KEY_LENGTH);
	for (const keyFile of possiblePaths) {
		try {
			fs.mkdirSync(path.dirname(keyFile), { recursive: true });
			fs.writeFileSync(keyFile, generated.toString("base64"), { mode: 0o600 });
			encryptionKey = generated;
			return encryptionKey;
		} catch {
			// ignore write errors in read-only environments
		}
	}

	// In-memory fallback for read-only environments
	encryptionKey = generated;
	return encryptionKey;
}

export function encryptSecret(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, loadEncryptionKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();
	return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
	const [ivB64, tagB64, dataB64] = payload.split(".");
	if (!ivB64 || !tagB64 || !dataB64) {
		throw new Error("Malformed encrypted payload");
	}
	const decipher = createDecipheriv(
		ALGORITHM,
		loadEncryptionKey(),
		Buffer.from(ivB64, "base64"),
	);
	decipher.setAuthTag(Buffer.from(tagB64, "base64"));
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(dataB64, "base64")),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}
