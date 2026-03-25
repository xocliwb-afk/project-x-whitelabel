'use client';

import { create } from 'zustand';
import type {
  AdminBrandResponse,
  BrandAssetType,
  BrandValidateResponse,
  PatchAdminBrandRequest,
} from '@project-x/shared-types';

import {
  AdminBrandApiError,
  createFaviconUploadInit,
  createLogoUploadInit,
  getAdminBrand,
  inferBrandAssetContentType,
  patchAdminBrand,
  uploadBrandAssetToSignedUrl,
  validateAdminBrand,
  type AdminBrandRequestOptions,
} from '@/lib/admin-brand-api';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

type UploadStatus = {
  isUploading: boolean;
  error: string | null;
  success: string | null;
};

type UploadStatusByAsset = Record<BrandAssetType, UploadStatus>;

type AdminBrandStoreState = {
  original: AdminBrandResponse | null;
  draft: AdminBrandResponse | null;
  isLoading: boolean;
  isLoaded: boolean;
  isDirty: boolean;
  error: string | null;
  errorCode: string | null;
  validationErrors: string[];
  submitError: string | null;
  submitCode: string | null;
  saveSuccessMessage: string | null;
  validateSuccessMessage: string | null;
  isValidating: boolean;
  isSaving: boolean;
  uploadStatus: UploadStatusByAsset;
  hydrate: (brand: AdminBrandResponse) => void;
  updateDraft: (updater: (draft: AdminBrandResponse) => void) => void;
  resetDraft: () => void;
  loadCurrentBrand: () => Promise<void>;
  validateDraft: () => Promise<BrandValidateResponse | null>;
  saveDraft: () => Promise<boolean>;
  uploadAsset: (assetType: BrandAssetType, file: File) => Promise<boolean>;
  reset: () => void;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function brandsMatch(
  left: AdminBrandResponse | null,
  right: AdminBrandResponse | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

function createEmptyUploadStatus(): UploadStatus {
  return {
    isUploading: false,
    error: null,
    success: null,
  };
}

function createInitialUploadStatus(): UploadStatusByAsset {
  return {
    logo: createEmptyUploadStatus(),
    favicon: createEmptyUploadStatus(),
  };
}

function clearActionFeedback() {
  return {
    validationErrors: [],
    submitError: null,
    submitCode: null,
    saveSuccessMessage: null,
    validateSuccessMessage: null,
  };
}

function buildScopedPatch(
  original: AdminBrandResponse,
  draft: AdminBrandResponse,
): PatchAdminBrandRequest | null {
  const configPatch: NonNullable<PatchAdminBrandRequest['config']> = {};
  const contactPatch: Record<string, unknown> = {};
  const colorPatch: Record<string, string> = {};
  const typographyPatch: Record<string, string> = {};
  const assetPatch: NonNullable<PatchAdminBrandRequest['assets']> = {};

  let hasConfigChanges = false;
  let hasContactChanges = false;
  let hasColorChanges = false;
  let hasTypographyChanges = false;
  let hasAssetChanges = false;

  if (original.config.brandName !== draft.config.brandName) {
    configPatch.brandName = draft.config.brandName;
    hasConfigChanges = true;
  }

  if (original.config.brandTagline !== draft.config.brandTagline) {
    configPatch.brandTagline = draft.config.brandTagline ?? null;
    hasConfigChanges = true;
  }

  if (original.config.agentName !== draft.config.agentName) {
    configPatch.agentName = draft.config.agentName ?? null;
    hasConfigChanges = true;
  }

  if (original.config.contact.email !== draft.config.contact.email) {
    contactPatch.email = draft.config.contact.email;
    hasContactChanges = true;
  }

  if (original.config.contact.phone !== draft.config.contact.phone) {
    contactPatch.phone = draft.config.contact.phone ?? null;
    hasContactChanges = true;
  }

  if (original.config.contact.address !== draft.config.contact.address) {
    contactPatch.address = draft.config.contact.address ?? null;
    hasContactChanges = true;
  }

  if (hasContactChanges) {
    configPatch.contact = contactPatch as NonNullable<PatchAdminBrandRequest['config']>['contact'];
    hasConfigChanges = true;
  }

  if (original.config.theme.colors.primary !== draft.config.theme.colors.primary) {
    colorPatch.primary = draft.config.theme.colors.primary;
    hasColorChanges = true;
  }

  if (original.config.theme.colors.surface !== draft.config.theme.colors.surface) {
    colorPatch.surface = draft.config.theme.colors.surface;
    hasColorChanges = true;
  }

  if (original.config.theme.typography.fontFamily !== draft.config.theme.typography.fontFamily) {
    typographyPatch.fontFamily = draft.config.theme.typography.fontFamily;
    hasTypographyChanges = true;
  }

  if (hasColorChanges || hasTypographyChanges) {
    configPatch.theme = {
      ...(hasColorChanges ? { colors: colorPatch } : {}),
      ...(hasTypographyChanges ? { typography: typographyPatch } : {}),
    } as NonNullable<PatchAdminBrandRequest['config']>['theme'];
    hasConfigChanges = true;
  }

  if (original.assets.logoUrl !== draft.assets.logoUrl) {
    assetPatch.logoUrl = draft.assets.logoUrl;
    hasAssetChanges = true;
  }

  if (original.assets.faviconUrl !== draft.assets.faviconUrl) {
    assetPatch.faviconUrl = draft.assets.faviconUrl;
    hasAssetChanges = true;
  }

  if (!hasConfigChanges && !hasAssetChanges) {
    return null;
  }

  return {
    ...(hasConfigChanges ? { config: configPatch } : {}),
    ...(hasAssetChanges ? { assets: assetPatch } : {}),
  };
}

async function getAuthenticatedRequestOptions(): Promise<AdminBrandRequestOptions> {
  const authUser = useAuthStore.getState().user;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!authUser?.tenantId || !session?.access_token) {
    throw new Error('Authentication required');
  }

  return {
    accessToken: session.access_token,
    tenantId: authUser.tenantId,
  };
}

function currentUserKey(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `${user.id}:${user.tenantId}` : null;
}

const initialState = {
  original: null,
  draft: null,
  isLoading: false,
  isLoaded: false,
  isDirty: false,
  error: null,
  errorCode: null,
  validationErrors: [],
  submitError: null,
  submitCode: null,
  saveSuccessMessage: null,
  validateSuccessMessage: null,
  isValidating: false,
  isSaving: false,
  uploadStatus: createInitialUploadStatus(),
};

export const useAdminBrandStore = create<AdminBrandStoreState>((set, get) => ({
  ...initialState,

  hydrate: (brand) => {
    const original = cloneJson(brand);
    const draft = cloneJson(brand);

    set({
      original,
      draft,
      isLoaded: true,
      isLoading: false,
      isDirty: false,
      error: null,
      errorCode: null,
      ...clearActionFeedback(),
      uploadStatus: createInitialUploadStatus(),
    });
  },

  updateDraft: (updater) =>
    set((state) => {
      if (!state.draft) {
        return {};
      }

      const draft = cloneJson(state.draft);
      updater(draft);

      return {
        draft,
        ...clearActionFeedback(),
        isDirty: !brandsMatch(state.original, draft),
      };
    }),

  resetDraft: () =>
    set((state) => {
      if (!state.original) {
        return {
          ...initialState,
        };
      }

      const restored = cloneJson(state.original);
      return {
        draft: restored,
        isDirty: false,
        ...clearActionFeedback(),
        uploadStatus: createInitialUploadStatus(),
      };
    }),

  loadCurrentBrand: async () => {
    if (!useAuthStore.getState().user) {
      get().reset();
      return;
    }

    const userKey = currentUserKey();
    set({
      isLoading: true,
      error: null,
      errorCode: null,
      validationErrors: [],
    });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return;
      }

      const brand = await getAdminBrand(auth);
      if (currentUserKey() !== userKey) {
        return;
      }

      get().hydrate(brand);
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return;
      }

      set({
        isLoading: false,
        isLoaded: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load admin brand settings.',
        errorCode: error instanceof AdminBrandApiError ? error.code ?? null : null,
        ...clearActionFeedback(),
        validationErrors:
          error instanceof AdminBrandApiError ? error.validationErrors ?? [] : [],
      });
      throw error;
    }
  },

  validateDraft: async () => {
    const draft = get().draft;
    if (!draft) {
      return null;
    }

    const userKey = currentUserKey();
    set({
      isValidating: true,
      submitError: null,
      submitCode: null,
      saveSuccessMessage: null,
      validateSuccessMessage: null,
      validationErrors: [],
    });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return null;
      }

      const result = await validateAdminBrand(draft, auth);
      if (currentUserKey() !== userKey) {
        return null;
      }

      if (!result.valid) {
        set({
          validationErrors: result.errors,
          validateSuccessMessage: null,
          submitError: 'Fix validation errors before saving.',
          submitCode: 'VALIDATION_ERROR',
        });
        return result;
      }

      set({
        validationErrors: [],
        submitError: null,
        submitCode: null,
        validateSuccessMessage: 'Draft passed validation.',
      });
      return result;
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return null;
      }

      set({
        validationErrors:
          error instanceof AdminBrandApiError ? error.validationErrors ?? [] : [],
        submitError:
          error instanceof Error ? error.message : 'Failed to validate admin brand draft.',
        submitCode: error instanceof AdminBrandApiError ? error.code ?? null : null,
        validateSuccessMessage: null,
      });
      throw error;
    } finally {
      if (currentUserKey() === userKey) {
        set({ isValidating: false });
      }
    }
  },

  saveDraft: async () => {
    const original = get().original;
    const draft = get().draft;
    if (!original || !draft) {
      return false;
    }

    const patch = buildScopedPatch(original, draft);
    if (!patch) {
      return false;
    }

    const userKey = currentUserKey();
    set({
      isSaving: true,
      submitError: null,
      submitCode: null,
      saveSuccessMessage: null,
      validateSuccessMessage: null,
      validationErrors: [],
    });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return false;
      }

      const validation = await validateAdminBrand(draft, auth);
      if (currentUserKey() !== userKey) {
        return false;
      }

      if (!validation.valid) {
        set({
          validationErrors: validation.errors,
          submitError: 'Fix validation errors before saving.',
          submitCode: 'VALIDATION_ERROR',
        });
        return false;
      }

      const saved = await patchAdminBrand(patch, auth);
      if (currentUserKey() !== userKey) {
        return false;
      }

      get().hydrate(saved);
      set({
        saveSuccessMessage: 'Brand settings saved.',
        validateSuccessMessage: null,
      });
      return true;
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return false;
      }

      set({
        validationErrors:
          error instanceof AdminBrandApiError ? error.validationErrors ?? [] : [],
        submitError:
          error instanceof Error ? error.message : 'Failed to save brand settings.',
        submitCode: error instanceof AdminBrandApiError ? error.code ?? null : null,
        saveSuccessMessage: null,
      });
      throw error;
    } finally {
      if (currentUserKey() === userKey) {
        set({ isSaving: false });
      }
    }
  },

  uploadAsset: async (assetType, file) => {
    const draft = get().draft;
    if (!draft) {
      return false;
    }

    const userKey = currentUserKey();
    set((state) => ({
      submitError: null,
      submitCode: null,
      saveSuccessMessage: null,
      validateSuccessMessage: null,
      validationErrors: [],
      uploadStatus: {
        ...state.uploadStatus,
        [assetType]: {
          isUploading: true,
          error: null,
          success: null,
        },
      },
    }));

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return false;
      }

      const uploadInitInput = {
        fileName: file.name,
        contentType: inferBrandAssetContentType(file, assetType),
        fileSizeBytes: file.size,
      };

      const initialized = assetType === 'logo'
        ? await createLogoUploadInit(uploadInitInput, auth)
        : await createFaviconUploadInit(uploadInitInput, auth);

      if (currentUserKey() !== userKey) {
        return false;
      }

      await uploadBrandAssetToSignedUrl(initialized, file);
      if (currentUserKey() !== userKey) {
        return false;
      }

      set((state) => {
        if (!state.draft) {
          return {
            uploadStatus: {
              ...state.uploadStatus,
              [assetType]: {
                isUploading: false,
                error: null,
                success: null,
              },
            },
          };
        }

        const nextDraft = cloneJson(state.draft);
        if (assetType === 'logo') {
          nextDraft.assets.logoUrl = initialized.assetUrl;
        } else {
          nextDraft.assets.faviconUrl = initialized.assetUrl;
        }

        return {
          draft: nextDraft,
          isDirty: !brandsMatch(state.original, nextDraft),
          uploadStatus: {
            ...state.uploadStatus,
            [assetType]: {
              isUploading: false,
              error: null,
              success: 'Upload complete. Save changes to persist this override.',
            },
          },
        };
      });

      return true;
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return false;
      }

      const uploadMessage =
        error instanceof Error
          ? error.message
          : `Failed to upload ${assetType}.`;

      set((state) => ({
        uploadStatus: {
          ...state.uploadStatus,
          [assetType]: {
            isUploading: false,
            error: uploadMessage,
            success: null,
          },
        },
      }));
      throw error;
    }
  },

  reset: () =>
    set({
      ...initialState,
    }),
}));

let adminBrandAuthSubscriptionInstalled = false;

if (!adminBrandAuthSubscriptionInstalled) {
  adminBrandAuthSubscriptionInstalled = true;
  useAuthStore.subscribe((state, previousState) => {
    const currentKey = state.user ? `${state.user.id}:${state.user.tenantId}` : null;
    const previousKey = previousState.user
      ? `${previousState.user.id}:${previousState.user.tenantId}`
      : null;

    if (currentKey !== previousKey) {
      useAdminBrandStore.getState().reset();
    }
  });
}
