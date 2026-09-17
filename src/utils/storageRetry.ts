/**
 * getDownloadURL() called immediately after an upload resolves can throw
 * storage/object-not-found — a known react-native-firebase / Firebase Storage
 * timing quirk where the uploaded object's metadata isn't queryable yet for a
 * brief moment after the upload itself completes. Retry a few times before
 * treating it as a real failure.
 */
export const withDownloadUrlRetry = async (
  getUrl: () => Promise<string>,
  maxAttempts = 4,
  delayMs = 750,
): Promise<string> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getUrl();
    } catch (err: any) {
      if (err?.code !== 'storage/object-not-found' || attempt === maxAttempts) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Failed to get download URL after retries.');
};
