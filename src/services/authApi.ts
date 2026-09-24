export interface UserProfile {
	id: string;
	username: string; // User email or handle
	role: string;
}

export interface AuthStatusResponse {
	user: UserProfile | null;
	authEnabled: boolean;
}

const AUTH_BASE = "/api/auth";

export async function fetchCurrentUser(): Promise<AuthStatusResponse> {
	try {
		const res = await fetch(`${AUTH_BASE}/me`);
		if (!res.ok) {
			return { user: null, authEnabled: true };
		}
		const data = (await res.json()) as AuthStatusResponse;
		return {
			user: data.user ?? null,
			authEnabled: Boolean(data.authEnabled),
		};
	} catch {
		return { user: null, authEnabled: true };
	}
}

export async function loginUser(
	email: string,
	password: string,
): Promise<UserProfile> {
	const res = await fetch(`${AUTH_BASE}/login`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Requested-With": "XMLHttpRequest",
		},
		body: JSON.stringify({
			username: email.trim().toLowerCase(),
			password,
		}),
	});

	const data = (await res.json().catch(() => ({}))) as {
		user?: UserProfile;
		error?: string;
		message?: string;
	};

	if (!res.ok || !data.user) {
		const errMsg = data.error || data.message || `Login failed (${res.status})`;
		throw new Error(errMsg);
	}

	return data.user;
}

export async function registerUser(
	email: string,
	password: string,
): Promise<UserProfile> {
	const res = await fetch(`${AUTH_BASE}/register`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Requested-With": "XMLHttpRequest",
		},
		body: JSON.stringify({
			username: email.trim().toLowerCase(),
			password,
			role: "user",
		}),
	});

	const data = (await res.json().catch(() => ({}))) as {
		user?: UserProfile;
		error?: string;
		message?: string;
	};

	if (!res.ok || !data.user) {
		const errMsg =
			data.error || data.message || `Registration failed (${res.status})`;
		throw new Error(errMsg);
	}

	return data.user;
}

export async function logoutUser(): Promise<void> {
	try {
		await fetch(`${AUTH_BASE}/logout`, {
			method: "POST",
			headers: { "X-Requested-With": "XMLHttpRequest" },
		});
	} catch {
		// Ignore logout errors
	}
}
