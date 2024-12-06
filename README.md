# UP ONLY

Up Only NFTs are a set of experimental NFTs designed to only go up in price!!!

The `uponly.sol` contract overrides the OpenZeppelin ERC-721 contract's `transferFrom` function to ensure that only transfers that increase the NFT's price are allowed. Maps of tokenId to offers (price), offerers (payable address), and last (price) are kept to ensure the transfer is executed at a price greater than or equal to the last price. NFTs can only be transferred with a valid offer. Offers must be greater than the last price and any current offer. Offerers can revoke the offer if it has not been accepted by the owner of the NFT by executing a `transferFrom` call. Royalty fees are executed on `transfer` and `revoke`.

## Installation

- Clone the repository (TODO: link to git repo for clone)

  `git clone https://github.com/coding4kicks/up-only`

- Change directory into the cloned repo

  `cd up-only`

- Install dependencies

  `npm install`

## Command Line

- Run project tests

  `npm test`

- Clean the cache of compiled artifacts

  `npm run clean`

- Get hardhat help

  `npx hardhat help`

- Other hardhat commands

  `REPORT_GAS=true npx hardhat test`
  `npx hardhat node`
  `npx hardhat run scripts/deploy.ts`

=============

Current Goal: Finish Up Only Project

TODOs Today:

- Figure Out Deploy

Today Details:

- Publish to IPFS - Pinata
- Deploy to Test Net

TODOs Next:

- Finish Dev Deploy
- Build Trading Site
- Prod Deploy (deploy images, deploy trading site, get IPFS, get site URL, finalize and deploy metadata, deploy contracts, deploy site)
