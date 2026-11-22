import Cookies from "js-cookie";
import type { Tokens } from "surrealdb";

export type AuthCookie = {
	name: string;
	options: Cookies.CookieAttributes;
};

export const DEFAULT_AUTH_COOKIE: AuthCookie = {
	name: "auth",
	options: {
		expires: 30,
		secure: true,
		sameSite: "strict",
	},
};

const listeners = new Set<() => void>();

export const subscribeAuthCookie = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const notify = () => {
	listeners.forEach((listener) => listener());
};

export const getAuthCookie = (cookie: AuthCookie) => {
	return Cookies.get(cookie.name);
};

export const readAuthCookie = (cookie: AuthCookie) => {
	const value = getAuthCookie(cookie);
	if (!value) return undefined;

	try {
		return JSON.parse(value) as Tokens;
	} catch {
		return undefined;
	}
};

export const setAuthCookie = (cookie: AuthCookie, value: string) => {
	Cookies.set(cookie.name, value, cookie.options);
	notify();
};

export const removeAuthCookie = (cookie: AuthCookie) => {
	Cookies.remove(cookie.name, cookie.options);
	notify();
};
