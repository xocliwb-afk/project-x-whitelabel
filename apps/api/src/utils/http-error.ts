export type HttpError = Error & {
  status: number;
  statusCode?: number;
  code?: string;
};

export function createHttpError(
  status: number,
  message: string,
  code?: string,
): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  error.statusCode = status;
  if (code) {
    error.code = code;
  }
  return error;
}
