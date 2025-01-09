import { ethers, network } from 'hardhat';
import { verify } from './verify';

async function main() {
  // Log deployment info
  console.log('Deploying to network:', network.name);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Deploy contract
  const UpOnly = await ethers.getContractFactory('UpOnly');
  const upOnly = await UpOnly.deploy();
  await upOnly.waitForDeployment();

  const address = await upOnly.getAddress();
  console.log('UpOnly deployed to:', address);

  // Verify on Etherscan if not on localhost
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('Waiting for block confirmations...');
    await upOnly.deploymentTransaction()?.wait(6);

    await verify(address, []);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
