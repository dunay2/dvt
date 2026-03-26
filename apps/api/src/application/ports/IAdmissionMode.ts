export const ADMISSION_MODE = {
  off: 'off',
  observe: 'observe',
  enforce: 'enforce',
} as const;

export type AdmissionMode = (typeof ADMISSION_MODE)[keyof typeof ADMISSION_MODE];
