import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	fetchCurrentUser,
	loginUser,
	logoutUser,
	registerUser,
	type UserProfile,
} from "../services/authApi";
import { useSettingsStore } from "../stores/settingsStore";

interface AuthContextType {
	user: UserProfile | null;
	isLoading: boolean;
	authEnabled: boolean;
	login: (email: string, pass: string) => Promise<void>;
	register: (email: string, pass: string) => Promise<void>;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [authEnabled, setAuthEnabled] = useState(true);
	const [isLoading, setIsLoading] = useState(true);

	const refreshUser = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetchCurrentUser();
			setUser(res.user);
			setAuthEnabled(res.authEnabled);
			if (res.user) {
				void useSettingsStore.getState().loadServerKeys(true);
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refreshUser();
	}, [refreshUser]);

	const login = async (email: string, pass: string) => {
		const u = await loginUser(email, pass);
		setUser(u);
		await useSettingsStore.getState().loadServerKeys(true);
	};

	const register = async (email: string, pass: string) => {
		const u = await registerUser(email, pass);
		setUser(u);
		await useSettingsStore.getState().loadServerKeys(true);
	};

	const logout = async () => {
		await logoutUser();
		setUser(null);
		useSettingsStore.setState({
			hasConfiguredKey: false,
			serverKeys: { llm: [], search: [] },
		});
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				authEnabled,
				login,
				register,
				logout,
				refreshUser,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

// biome-ignore lint/style/useComponentExportOnlyModules: context hook
export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return ctx;
}
