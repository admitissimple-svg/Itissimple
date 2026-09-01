export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('its_simple_oauth_token');
  if (token) return token;
  return null;
}

export async function googleSignIn(): Promise<{ accessToken: string }> {
  const simulatedToken = `simulated-oauth-token-${Date.now()}`;
  if (typeof window !== 'undefined') {
    localStorage.setItem('its_simple_oauth_token', simulatedToken);
  }
  return { accessToken: simulatedToken };
}
