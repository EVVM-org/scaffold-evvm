// Polyfill for @react-native-async-storage/async-storage
// This is needed because MetaMask SDK imports it but we're in a browser environment

const AsyncStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => {},
  removeItem: async (_key: string): Promise<void> => {},
  clear: async (): Promise<void> => {},
  getAllKeys: async (): Promise<readonly string[]> => [],
  multiGet: async (_keys: readonly string[]): Promise<readonly [string, string | null][]> => [],
  multiSet: async (_keyValuePairs: readonly [string, string][]): Promise<void> => {},
  multiRemove: async (_keys: readonly string[]): Promise<void> => {},
};

export default AsyncStorage;
