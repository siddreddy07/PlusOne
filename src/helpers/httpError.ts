// A normal Error that also carries an HTTP status code (404, 409, ...).
// Services throw it, the error handler middleware turns it into a response.

export type HttpError = Error & { status: number };

export function makeHttpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && typeof (error as HttpError).status === "number";
}
