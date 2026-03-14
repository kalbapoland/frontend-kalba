let pendingOAuthUrl: string | null = null;

export const setPendingOAuthUrl = (url: string) => {
  pendingOAuthUrl = url;
};

export const consumePendingOAuthUrl = (): string | null => {
  const url = pendingOAuthUrl;
  pendingOAuthUrl = null;
  return url;
};
