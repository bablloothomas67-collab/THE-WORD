import { describe, expect, it } from 'vitest';
import { validateLogin, validateRegister } from '../../src/utils/validation';

describe('validateLogin', () => {
  it('requires email and password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'auth.errors.emailRequired',
      password: 'auth.errors.passwordRequired',
    });
  });
  it('rejects a malformed email', () => {
    expect(validateLogin({ email: 'not-an-email', password: 'x' }).email).toBe('auth.errors.emailInvalid');
  });
  it('accepts valid input', () => {
    expect(validateLogin({ email: 'reader@example.com', password: 'secret' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const valid = { displayName: 'Anna', email: 'anna@example.com', password: 'password1', confirmPassword: 'password1' };

  it('accepts valid input', () => {
    expect(validateRegister(valid)).toEqual({});
  });
  it('requires a name', () => {
    expect(validateRegister({ ...valid, displayName: '   ' }).displayName).toBe('auth.errors.nameRequired');
  });
  it('enforces minimum password length', () => {
    expect(validateRegister({ ...valid, password: 'short', confirmPassword: 'short' }).password).toBe(
      'auth.errors.passwordShort',
    );
  });
  it('requires matching passwords', () => {
    expect(validateRegister({ ...valid, confirmPassword: 'different1' }).confirmPassword).toBe(
      'auth.errors.passwordMismatch',
    );
  });
});
