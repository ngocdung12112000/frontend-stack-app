/**
 * RFC 7807 ProblemDetails -> user-facing form result. Raw `detail`/`title` are never shown;
 * the service-prefixed `code` selects a friendly message, and `errors` become field errors.
 * (Messages are plain English until next-intl lands; keys are the API codes.)
 */
export type FieldErrors = Record<string, string[]>;

export type ActionFailure = {
  ok: false;
  /** Form-level message, safe to render. */
  formError?: string;
  /** API error code, for callers with special UX (e.g. SESSION_EXPIRED). */
  code?: string;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
};

/** Success carries optional `undefined` failure keys so callers can read them without narrowing. */
export type ActionResult<T = undefined> =
  | {
      ok: true;
      data?: T;
      code?: undefined;
      formError?: undefined;
      fieldErrors?: undefined;
      retryAfterSeconds?: undefined;
    }
  | ActionFailure;

export const SESSION_EXPIRED = "SESSION_EXPIRED";
export const NETWORK_ERROR = "NETWORK_ERROR";

export const errorMessages: Record<string, string> = {
  IDENTITY_EMAIL_TAKEN: "An account with this email already exists. Try logging in instead.",
  IDENTITY_INVALID_CREDENTIALS: "Incorrect email or password.",
  IDENTITY_LOCKED_OUT:
    "Your account is temporarily locked after too many failed attempts. Please try again later.",
  IDENTITY_TOO_MANY_ATTEMPTS: "Too many attempts. Please wait a moment and try again.",
  IDENTITY_WEAK_PASSWORD:
    "Choose a stronger password: at least 8 characters, with at least one letter and one number.",
  IDENTITY_TOKEN_INVALID: "This link is invalid or has expired. Please request a new one.",
  IDENTITY_INVALID_CURRENT_PASSWORD: "Your current password is incorrect.",
  IDENTITY_VALIDATION_FAILED: "Please check the highlighted fields and try again.",
  IDENTITY_SESSION_NOT_FOUND: "That session no longer exists.",
  [SESSION_EXPIRED]: "Your session has expired. Please sign in again.",
  [NETWORK_ERROR]: "We could not reach the server. Please try again in a moment.",
};

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function messageForCode(code: string | undefined, status?: number): string {
  if (code && errorMessages[code]) return errorMessages[code];
  if (status === 429) return errorMessages.IDENTITY_TOO_MANY_ATTEMPTS ?? GENERIC_MESSAGE;
  return GENERIC_MESSAGE;
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** Parses a Retry-After header given in seconds (HTTP-date form is ignored). */
export function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function lowerFirst(key: string): string {
  return key.charAt(0).toLowerCase() + key.slice(1);
}

/**
 * Maps the `errors` dictionary to form field names. Keys come back camel- or PascalCase and
 * sometimes dotted; `aliases` renames server fields to the form's (e.g. password -> newPassword).
 */
export function mapFieldErrors(
  errors: unknown,
  aliases: Record<string, string> = {},
): FieldErrors | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  const out: FieldErrors = {};
  for (const [rawKey, value] of Object.entries(errors as Record<string, unknown>)) {
    const key = lowerFirst(rawKey);
    const field = aliases[key] ?? key;
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (m): m is string => typeof m === "string" && m.length > 0,
    );
    if (messages.length) out[field] = [...(out[field] ?? []), ...messages];
  }
  return Object.keys(out).length ? out : undefined;
}

type ProblemLike = { code?: unknown; errors?: unknown; status?: unknown } | undefined | null;

/** Builds the failure result for an API error response. */
export function fromProblem(
  problem: unknown,
  response?: { status: number; headers: { get(name: string): string | null } },
  options: { fieldAliases?: Record<string, string> } = {},
): ActionFailure {
  const p = (problem && typeof problem === "object" ? problem : null) as ProblemLike;
  const status = response?.status ?? (typeof p?.status === "number" ? p.status : undefined);
  const code = typeof p?.code === "string" ? p.code : undefined;
  let fieldErrors = mapFieldErrors(p?.errors, options.fieldAliases);

  // A policy failure gets our own copy, not the server's message, on the password field.
  if (code === "IDENTITY_WEAK_PASSWORD") {
    const field = (fieldErrors && Object.keys(fieldErrors)[0]) || options.fieldAliases?.password || "password";
    fieldErrors = { [field]: [errorMessages.IDENTITY_WEAK_PASSWORD ?? GENERIC_MESSAGE] };
  }

  const retryAfterSeconds = parseRetryAfter(response?.headers.get("retry-after"));
  let formError = messageForCode(code, status);
  if (retryAfterSeconds && (code === "IDENTITY_TOO_MANY_ATTEMPTS" || status === 429)) {
    formError = `Too many attempts. Please try again in ${formatRetryAfter(retryAfterSeconds)}.`;
  }
  // Field errors speak for themselves except for generic failures.
  if (fieldErrors && (code === "IDENTITY_WEAK_PASSWORD" || code === "IDENTITY_VALIDATION_FAILED")) {
    formError = code === "IDENTITY_VALIDATION_FAILED" ? formError : "";
  }
  if (status === 401 && !code) {
    return { ok: false, code: SESSION_EXPIRED, formError: errorMessages[SESSION_EXPIRED] };
  }

  return {
    ok: false,
    code,
    ...(formError ? { formError } : {}),
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

export function networkFailure(): ActionFailure {
  return { ok: false, code: NETWORK_ERROR, formError: errorMessages[NETWORK_ERROR] };
}
