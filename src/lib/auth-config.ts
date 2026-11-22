/** Access keys last 5 minutes. The browser asks the server to check the refresh key on that same interval. */
export const ACCESS_SECONDS = 5 * 60;

/** Refresh keys last 14 days, then the person has to sign in again. */
export const REFRESH_SECONDS = 14 * 24 * 60 * 60;

export const AUTH_CHECK_MS = ACCESS_SECONDS * 1000;

export const ACCESS_COOKIE = "pn_access";
export const REFRESH_COOKIE = "pn_refresh";

export type PublicUser = {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  photo: string;
};

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
