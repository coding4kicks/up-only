import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      // Configure output selection to reduce warnings
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'] // Select only essential outputs
        }
      }
    }
  },
  networks: {
    hardhat: {
      accounts: {
        count: 50 // Specify the number of test addresses you want
      }
    }
  }
};

export default config;
