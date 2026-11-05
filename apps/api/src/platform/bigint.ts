/**
 * Recursively transforms any BigInt values in an object or array into strings.
 * This ensures clean JSON serialization without throw or loss of precision.
 */
export function serializeBigInts<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'bigint') {
    return data.toString() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeBigInts(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeBigInts(value);
    }
    return result as T;
  }

  return data;
}
