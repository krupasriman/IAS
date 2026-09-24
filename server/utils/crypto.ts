import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../../src/utils/logger";

function getDirname(): string {
	try {
		if (typeof import.meta !== "undefined" && import.meta?.url) {
			return path.dirname(fileURLToPath(import.meta.url));
		}
	} catch {
		// Ignore
	}
	return typeof __dirname !== "undefined" ? __dirname : process.cwd();
}

const moduleDir = getDirname();

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

	// Strictly prohibit ephemeral keys in production
	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"FATAL: ENCRYPTION_KEY must be configured in production (32-byte base64 string). Ephemeral key generation is strictly forbidden in production.",
		);
	}

	// Dev fallback paths
	const possiblePaths = [
		path.join(moduleDir, "../../data/.encryption.key"),
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

	// In-memory fallback for read-only dev environments
	encryptionKey = generated;
	return encryptionKey;
}

/**
 * Encrypts sensitive credentials using AES-256-GCM with key versioning.
 * Format: v1:<ivB64>:<tagB64>:<dataB64>
 */
export function encryptSecret(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, loadEncryptionKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();
	return [
		"v1",
		iv.toString("base64"),
		authTag.toString("base64"),
		encrypted.toString("base64"),
	].join(":");
}

/**
 * Decrypts sensitive credentials, supporting both v1 versioned payloads and legacy dot-delimited payloads.
 */
export function decryptSecret(payload: string): string {
	let ivB64: string;
	let tagB64: string;
	let dataB64: string;

	if (payload.startsWith("v1:")) {
		const parts = payload.split(":");
		if (parts.length !== 4) throw new Error("Malformed v1 encrypted payload");
		[, ivB64, tagB64, dataB64] = parts;
	} else if (payload.includes(".")) {
		const parts = payload.split(".");
		if (parts.length !== 3)
			throw new Error("Malformed legacy encrypted payload");
		[ivB64, tagB64, dataB64] = parts;
	} else {
		throw new Error("Unrecognized encrypted payload format");
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
