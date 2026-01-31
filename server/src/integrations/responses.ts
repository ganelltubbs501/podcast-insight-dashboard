export function supportedResponse<T>(data: T) {
  return { supported: true, data } as const;
}

export function unsupportedResponse(message: string, fallback: 'manual' | 'not_configured' = 'manual') {
  return { supported: false, fallback, message } as const;
}
