import type {
  BrandAssetInitRequest,
  BrandAssetType,
} from '@project-x/shared-types';

type AssetPolicy = {
  maxBytes: number;
  allowedContentTypes: Record<string, readonly string[]>;
};

type UploadPolicyFailure = {
  valid: false;
  code: string;
  message: string;
  errors: string[];
};

type UploadPolicySuccess = {
  valid: true;
  request: ValidatedBrandAssetUploadRequest;
};

export type ValidatedBrandAssetUploadRequest = BrandAssetInitRequest & {
  extension: string;
};

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const FAVICON_MAX_BYTES = 512 * 1024;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

const ASSET_POLICIES: Record<BrandAssetType, AssetPolicy> = {
  logo: {
    maxBytes: LOGO_MAX_BYTES,
    allowedContentTypes: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
  },
  favicon: {
    maxBytes: FAVICON_MAX_BYTES,
    allowedContentTypes: {
      'image/png': ['.png'],
      'image/x-icon': ['.ico'],
      'image/vnd.microsoft.icon': ['.ico'],
    },
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalidRequest(errors: string[]): UploadPolicyFailure {
  return {
    valid: false,
    code: 'VALIDATION_ERROR',
    message: 'Invalid brand asset upload request',
    errors,
  };
}

function invalidFilename(errors: string[]): UploadPolicyFailure {
  return {
    valid: false,
    code: 'UPLOAD_INVALID_FILENAME',
    message: 'Invalid upload filename',
    errors,
  };
}

function invalidContentType(assetType: BrandAssetType, contentType: string): UploadPolicyFailure {
  return {
    valid: false,
    code: 'UPLOAD_CONTENT_TYPE_NOT_ALLOWED',
    message: `Unsupported ${assetType} content type`,
    errors: [`contentType: ${contentType} is not allowed for ${assetType} uploads`],
  };
}

function fileTooLarge(assetType: BrandAssetType, maxBytes: number): UploadPolicyFailure {
  return {
    valid: false,
    code: 'UPLOAD_FILE_TOO_LARGE',
    message: `${assetType} upload exceeds size limit`,
    errors: [`fileSizeBytes: Must be ${maxBytes} bytes or fewer for ${assetType} uploads`],
  };
}

function normalizeContentType(value: string): string {
  return value.split(';', 1)[0]!.trim().toLowerCase();
}

function parseFileName(
  value: unknown,
  assetType: BrandAssetType,
  contentType: string,
  allowedExtensions: readonly string[],
): { valid: true; fileName: string; extension: string } | UploadPolicyFailure {
  if (typeof value !== 'string') {
    return invalidRequest(['fileName: Must be a string']);
  }

  const fileName = value.trim();
  if (!fileName) {
    return invalidFilename(['fileName: Must not be empty']);
  }

  if (fileName.includes('/') || fileName.includes('\\')) {
    return invalidFilename(['fileName: Path separators are not allowed']);
  }

  if (CONTROL_CHAR_PATTERN.test(fileName)) {
    return invalidFilename(['fileName: Control characters are not allowed']);
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return invalidFilename(['fileName: A valid file extension is required']);
  }

  const extension = fileName.slice(dotIndex).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return invalidFilename([
      `fileName: Extension ${extension} is not allowed for contentType ${contentType} on ${assetType} uploads`,
    ]);
  }

  return {
    valid: true,
    fileName,
    extension,
  };
}

function parseFileSizeBytes(value: unknown, assetType: BrandAssetType, maxBytes: number): UploadPolicyFailure | number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return invalidRequest(['fileSizeBytes: Must be a positive integer']);
  }

  if (value > maxBytes) {
    return fileTooLarge(assetType, maxBytes);
  }

  return value;
}

export function validateBrandAssetUploadRequest(
  assetType: BrandAssetType,
  body: unknown,
): UploadPolicySuccess | UploadPolicyFailure {
  if (!isPlainObject(body)) {
    return invalidRequest(['body: Must be an object']);
  }

  const allowedKeys = new Set(['fileName', 'contentType', 'fileSizeBytes']);
  const unexpectedKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (unexpectedKeys.length > 0) {
    return invalidRequest(unexpectedKeys.map((key) => `body.${key}: Unsupported field`));
  }

  const missingFields = ['fileName', 'contentType', 'fileSizeBytes'].filter((key) => !(key in body));
  if (missingFields.length > 0) {
    return invalidRequest(missingFields.map((key) => `${key}: Field is required`));
  }

  if (typeof body.contentType !== 'string') {
    return invalidRequest(['contentType: Must be a string']);
  }

  const contentType = normalizeContentType(body.contentType);
  if (!contentType) {
    return invalidRequest(['contentType: Must not be empty']);
  }

  const policy = ASSET_POLICIES[assetType];
  const allowedExtensions = policy.allowedContentTypes[contentType];
  if (!allowedExtensions) {
    return invalidContentType(assetType, contentType);
  }

  const fileNameResult = parseFileName(body.fileName, assetType, contentType, allowedExtensions);
  if (!fileNameResult.valid) {
    return fileNameResult;
  }

  const fileSizeBytes = parseFileSizeBytes(body.fileSizeBytes, assetType, policy.maxBytes);
  if (typeof fileSizeBytes !== 'number') {
    return fileSizeBytes;
  }

  return {
    valid: true,
    request: {
      assetType,
      fileName: fileNameResult.fileName,
      contentType,
      fileSizeBytes,
      extension: fileNameResult.extension,
    },
  };
}
