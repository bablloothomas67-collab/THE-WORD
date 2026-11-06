export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns translation keys for errors, so messages stay localised. */
export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues extends LoginValues {
  displayName: string;
  confirmPassword: string;
}

function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'auth.errors.emailRequired';
  if (!EMAIL_PATTERN.test(value)) return 'auth.errors.emailInvalid';
  return undefined;
}

export function validateLogin(values: LoginValues): FieldErrors<keyof LoginValues> {
  const errors: FieldErrors<keyof LoginValues> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = 'auth.errors.passwordRequired';
  return errors;
}

export function validateRegister(values: RegisterValues): FieldErrors<keyof RegisterValues> {
  const errors: FieldErrors<keyof RegisterValues> = {};
  if (!values.displayName.trim()) errors.displayName = 'auth.errors.nameRequired';
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = 'auth.errors.passwordRequired';
  else if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = 'auth.errors.passwordShort';
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'auth.errors.passwordMismatch';
  return errors;
}
