![Up Only NFTs Banner](./UpOnlyNFTs/assets/banner_image.png)

# UP ONLY NFTs

Up Only NFTs are a unique collection of experimental NFTs with an innovative price mechanism that ensures tokens can only increase in value. This project implements a novel approach to NFT trading where each transfer must be at a higher price than the previous one.

## Overview

The `UpOnly.sol` smart contract introduces several key features:

- Price can only go up - each sale must be higher than the previous price
- Built-in offer system with automatic price enforcement
- Royalty mechanism for sustainable project economics
- Special "FTX token" easter egg on token #12
- Gas-optimized storage and operations
- Comprehensive security measures

### Key Features

1. **Price Mechanism**

   - Overridden `transferFrom` function ensures price increases
   - Automated offer system with price validation
   - Built-in royalty distribution

2. **Security Features**

   - Reentrancy protection
   - Checks-Effects-Interactions pattern
   - Comprehensive error handling
   - Gas optimization

3. **Trading System**
   - Make offers above current price
   - Revoke offers with partial refund
   - Automatic royalty distribution
   - Owner-controlled transfers

## Installation

1. Clone the repository

```bash
git clone https://github.com/coding4kicks/up-only
cd up-only
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables (create .env file)

```env
PRIVATE_KEY=your_wallet_private_key
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Development

1. Run tests

```bash:README.md
npm test
```

2. Run local node

```bash
npx hardhat node
```

3. Deploy locally

```bash
npx hardhat run scripts/deploy.ts
```

## Deployment

### Testnet (Sepolia)

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

### Testnet (Holesky)

```bash
npx hardhat run scripts/deploy.ts --network holesky
```

### Mainnet

```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

### Contract Verification

Automatic verification will occur after deployment. Manual verification:

```bash
npx hardhat verify --network <network> <deployed_contract_address>
```

## Contract Architecture

### Storage

- `TokenData`: Struct containing price history and offer details
- Packed variables for gas optimization
- Efficient mapping structures

### Key Functions

- `mint`: Create new tokens
- `offer`: Make offers on tokens
- `revoke`: Cancel existing offers
- `transferFrom`: Execute trades with price validation
- `_payout`: Handle payment distribution

## Security Considerations

1. **Before Deployment**

   - Run full test suite
   - Conduct security audit
   - Test on testnet
   - Verify contract code

2. **Production Deployment**
   - Use hardware wallet
   - Verify all parameters
   - Monitor initial transactions
   - Have emergency procedures ready

## Gas Optimization

The contract implements several gas optimization techniques:

- Custom errors instead of strings
- Packed storage variables
- Efficient state updates
- Minimal storage operations

## Trading Interface

The contract supports the following trading operations:

1. Make offers above current price
2. Accept offers through transfers
3. Revoke offers with fee
4. Automatic royalty distribution

## Development Commands

```bash
# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Clean artifacts
npm run clean

# Get help
npx hardhat help
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## Test Flight

Test Flight contract address: [0x5837B7De4149E57705d5765d59D6235D5134D808](https://sepolia.etherscan.io/address/0x5837B7De4149E57705d5765d59D6235D5134D808)

## License

MIT License

Copyright (c) 2024 Up Only NFTs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contact

Project Link: [https://github.com/coding4kicks/up-only](https://github.com/coding4kicks/up-only)
