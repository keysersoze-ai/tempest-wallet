// File Version: 2.0
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native Keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve({ username: 'test', password: 'test' })),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet'
  },
  AUTHENTICATION_TYPE: {
    BIOMETRICS: 'Biometrics'
  }
}));

// Mock Alchemy SDK
jest.mock('@alchemy/aa-alchemy', () => ({
  createAlchemySmartAccountClient: jest.fn(() => ({
    sendTransaction: jest.fn(() => Promise.resolve('0x123')),
    getAddress: jest.fn(() => '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1')
  }))
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    Wallet: {
      createRandom: jest.fn(() => ({
        address: '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1',
        privateKey: '0x1234567890abcdef',
        mnemonic: { phrase: 'test mnemonic phrase' }
      })),
      fromPhrase: jest.fn(() => ({
        address: '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1',
        privateKey: '0x1234567890abcdef'
      }))
    },
    AlchemyProvider: jest.fn(() => ({
      getBalance: jest.fn(() => Promise.resolve(BigInt('1000000000000000000'))),
      getFeeData: jest.fn(() => Promise.resolve({
        gasPrice: BigInt('20000000000'),
        maxFeePerGas: BigInt('30000000000'),
        maxPriorityFeePerGas: BigInt('2000000000')
      })),
      getBlock: jest.fn(() => Promise.resolve({
        timestamp: Math.floor(Date.now() / 1000)
      }))
    })),
    parseEther: jest.fn((value) => BigInt(value) * BigInt('1000000000000000000')),
    formatEther: jest.fn((value) => (Number(value) / 1e18).toString()),
    formatUnits: jest.fn((value, unit) => {
      if (unit === 'gwei') {
        return (Number(value) / 1e9).toString();
      }
      return value.toString();
    })
  }
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(32))
}));

// Silence console.warn for tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('deprecated') ||
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

// Global test timeout
jest.setTimeout(10000);