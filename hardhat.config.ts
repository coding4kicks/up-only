import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      accounts: {
        count: 50 // Specify the number of test addresses you want
      }
    }
  }
};

export default config;
