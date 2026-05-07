const readEnvValue = (key: 'VITE_ADMIN_LOGIN_EMAIL' | 'VITE_ADMIN_LOGIN_PASSWORD') => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const getAdminLoginEmail = () => readEnvValue('VITE_ADMIN_LOGIN_EMAIL');

export const getAdminLoginPassword = () => readEnvValue('VITE_ADMIN_LOGIN_PASSWORD');

export const hasAdminLoginCredentials = () => Boolean(getAdminLoginEmail() && getAdminLoginPassword());

export const isAdminCredentialMatch = (email: string, password: string) => {
  const configuredEmail = getAdminLoginEmail();
  const configuredPassword = getAdminLoginPassword();

  if (!configuredEmail || !configuredPassword) {
    return false;
  }

  return email.trim().toLowerCase() === configuredEmail.toLowerCase() && password === configuredPassword;
};
