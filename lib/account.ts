/** The shared demo account: anyone can log in with it, so it can never be deleted. */
export const DEMO_EMAIL = "demo@reloop.app";

export const isDemoAccount = (email: string | undefined | null) => (email ?? "").trim().toLowerCase() === DEMO_EMAIL;
