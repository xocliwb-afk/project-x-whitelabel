export type HttpError = Error & {
  status: number;
  statusCode?: number;
  code?: string;
  validationErrors?: string[];
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

export function createValidationHttpError(
  message: string,
  validationErrors: string[],
  code = 'VALIDATION_ERROR',
): HttpError {
  const error = createHttpError(400, message, code);
  error.validationErrors = validationErrors;
  return error;
}
