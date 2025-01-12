import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, ContractTransactionResponse } from 'ethers';
import { UpOnly } from '../typechain-types';

// Constants
const METADATA = {
  BASE_URI:
    'ipfs://bafybeie3xrh2gngkin2jr53cb2nn24ayx2hne2tztwhyynu3mf63ijzfam',
  CONTRACT_URI:
    'ipfs://bafybeie3xrh2gngkin2jr53cb2nn24ayx2hne2tztwhyynu3mf63ijzfam/up-only.json',
  BASE_EXTENSION: '.json'
};

const COSTS = {
  MINT: ethers.parseEther('0.01'),
  EASTER_EGG: ethers.parseEther('0.01051'),
  EASTER_EGG_FAIL: ethers.parseEther('0.0105'),
  TWO: ethers.parseEther('0.02'),
  FIVE: ethers.parseEther('0.05'),
  SIX: ethers.parseEther('0.06')
};

const LIMITS = {
  MAX_SUPPLY: 131,
  MAX_MINT_AMOUNT: 10
};

const ROYALTY = {
  PERCENTAGE: 3,
  ADDRESS: '0xCdB0Ba3bEE883C1E56b115b39bb0f2315Ce20C16'
};

describe('UpOnly', function () {
  // Fixture that deploys contract and returns useful objects
  async function deployFixture() {
    const [owner, addr1, addr2, ...addresses] = await ethers.getSigners();
    const UpOnly = await ethers.getContractFactory('UpOnly');
    const upOnly = await UpOnly.deploy();
    return { upOnly, owner, addr1, addr2, addresses };
  }

  // Helper function to mint tokens for testing
  async function mintTokens(
    contract: UpOnly & { deploymentTransaction(): ContractTransactionResponse },
    amount: number,
    signer: any
  ) {
    const tx = await contract
      .connect(signer)
      ['mint(uint256,uint256)'](amount, 0, {
        value: COSTS.MINT * BigInt(amount)
      });
    return tx;
  }

  // Helper to setup royalty signer
  async function setupRoyaltySigner(funder: any) {
    const signer = await ethers.getImpersonatedSigner(ROYALTY.ADDRESS);
    await funder.sendTransaction({
      to: ROYALTY.ADDRESS,
      value: ethers.parseEther('1.0')
    });
    return signer;
  }

  // Helper to get token ID from mint transaction
  async function getTokenIdFromMintTx(tx: any) {
    const receipt = await tx.wait();
    const mintEvent = receipt?.logs.find(
      (log: any) => log.fragment?.name === 'Mint'
    );
    return mintEvent?.args?.token;
  }

  describe('Deployment', function () {
    it('Should initialize with correct values', async function () {
      const { upOnly } = await loadFixture(deployFixture);

      expect(await upOnly.name()).to.equal('Test Flight');
      expect(await upOnly.symbol()).to.equal('UP');
      expect(await upOnly.baseURI()).to.equal(METADATA.BASE_URI);
      expect(await upOnly.contractURI()).to.equal(METADATA.CONTRACT_URI);
      expect(await upOnly.baseExtension()).to.equal(METADATA.BASE_EXTENSION);
      expect(await upOnly.cost()).to.equal(COSTS.MINT);
      expect(await upOnly.supply()).to.equal(0);
      expect(await upOnly.maxSupply()).to.equal(LIMITS.MAX_SUPPLY);
      expect(await upOnly.maxMintAmount()).to.equal(LIMITS.MAX_MINT_AMOUNT);
      expect(await upOnly.royalty()).to.equal(ROYALTY.PERCENTAGE);
      expect(await upOnly.royaltyAddress()).to.equal(ROYALTY.ADDRESS);
    });
  });

  describe('Minting', function () {
    it('Should mint tokens correctly', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);
      const ownerAddress = await owner.getAddress();

      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      const tx = await upOnly['mint(uint256,uint256)'](1, 0, {
        value: COSTS.MINT
      });
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(1);

      const tokenId = await getTokenIdFromMintTx(tx);
      expect(await upOnly.ownerOf(tokenId)).to.equal(ownerAddress);
    });

    it('Should enforce minimum price', async function () {
      const { upOnly } = await loadFixture(deployFixture);
      const belowCost = COSTS.MINT - BigInt(1);

      await expect(
        upOnly['mint(uint256,uint256)'](1, 0, {
          value: belowCost
        })
      ).to.be.revertedWithCustomError(upOnly, 'InsufficientPayment');
    });

    it('Should mint tokens to multiple addresses', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);

      // First mint
      const tx1 = await upOnly.connect(owner)['mint(uint256,uint256)'](1, 0, {
        value: COSTS.MINT
      });
      const ownerTokenId = await getTokenIdFromMintTx(tx1);
      expect(await upOnly.ownerOf(ownerTokenId)).to.equal(owner.address);

      // Second mint
      const tx2 = await upOnly.connect(addr1)['mint(uint256,uint256)'](1, 0, {
        value: COSTS.MINT
      });
      const addr1TokenId = await getTokenIdFromMintTx(tx2);
      expect(await upOnly.ownerOf(addr1TokenId)).to.equal(addr1.address);

      // Third mint
      const tx3 = await upOnly.connect(addr2)['mint(uint256,uint256)'](1, 0, {
        value: COSTS.MINT
      });
      const addr2TokenId = await getTokenIdFromMintTx(tx3);
      expect(await upOnly.ownerOf(addr2TokenId)).to.equal(addr2.address);
    });

    it('Should allow minting up to max mint amount per wallet', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);

      await upOnly['mint(uint256,uint256)'](LIMITS.MAX_MINT_AMOUNT, 0, {
        value: COSTS.MINT * BigInt(LIMITS.MAX_MINT_AMOUNT)
      });

      expect(await upOnly.balanceOf(owner.address)).to.equal(
        LIMITS.MAX_MINT_AMOUNT
      );

      await expect(
        upOnly['mint(uint256,uint256)'](1, 0, { value: COSTS.MINT })
      ).to.be.revertedWithCustomError(upOnly, 'ExceedsMaxMintAmount');
    });

    it('Should enforce max supply limit', async function () {
      const { upOnly, addresses } = await loadFixture(deployFixture);

      // Mint 130 tokens (13 addresses * 10 tokens each)
      for (let i = 0; i < 13; i++) {
        await mintTokens(upOnly, LIMITS.MAX_MINT_AMOUNT, addresses[i]);
      }

      // Mint the last token
      await mintTokens(upOnly, 1, addresses[13]);

      // Try to mint one more
      await expect(
        mintTokens(upOnly, 1, addresses[14])
      ).to.be.revertedWithCustomError(upOnly, 'ExceedsMaxSupply');
    });

    it('Should transfer mint value to royalty wallet', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);

      const royaltyBalanceBefore = await ethers.provider.getBalance(
        ROYALTY.ADDRESS
      );
      await mintTokens(upOnly, 1, owner);
      const royaltyBalanceAfter = await ethers.provider.getBalance(
        ROYALTY.ADDRESS
      );

      expect(royaltyBalanceAfter).to.be.greaterThan(royaltyBalanceBefore);
    });

    it('Should emit Mint event with correct parameters', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);

      const tx = await upOnly['mint(uint256,uint256)'](1, 0, {
        value: COSTS.MINT
      });
      const receipt = await tx.wait();

      // Find the Mint event
      const mintEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'Mint'
      );
      expect(mintEvent).to.not.be.undefined;

      // Get the actual minted token ID
      const tokenId = await getTokenIdFromMintTx(tx);

      // Verify event parameters
      expect(mintEvent?.args?.token).to.equal(tokenId);
      expect(mintEvent?.args?.owner).to.equal(owner.address);
      expect(mintEvent?.args?.amount).to.equal(1);
      expect(mintEvent?.args?.cost).to.equal(COSTS.MINT);
      expect(mintEvent?.args?.supply).to.equal(1);
    });

    it('Should mint specific token ID', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);
      const tokenId = 42;

      await upOnly.mint(1, tokenId, { value: COSTS.MINT });
      expect(await upOnly.ownerOf(tokenId)).to.equal(owner.address);
    });

    it('Should reject minting already minted token', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);
      const tokenId = 42;

      await upOnly.mint(1, tokenId, { value: COSTS.MINT });
      await expect(
        upOnly.mint(1, tokenId, { value: COSTS.MINT })
      ).to.be.revertedWith('Token already minted');
    });

    it('Should mint multiple random tokens', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);
      const mintAmount = 5;

      const tx = await upOnly['mint(uint256,uint256)'](mintAmount, 0, {
        value: COSTS.MINT * BigInt(mintAmount)
      });
      expect(await upOnly.balanceOf(owner.address)).to.equal(mintAmount);

      // Get receipt and find all Mint events
      const receipt = await tx.wait();
      const mintEvents = receipt?.logs.filter(
        (log: any) => log.fragment?.name === 'Mint'
      );

      // Verify tokens are unique
      const tokenIds = new Set(
        mintEvents.map((event: any) => event.args.token)
      );
      expect(tokenIds.size).to.equal(mintAmount);

      // Verify ownership of each token
      for (const tokenId of tokenIds) {
        expect(await upOnly.ownerOf(tokenId)).to.equal(owner.address);
      }
    });

    it('Should allow minting up to new max mint amount per wallet', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);

      // Mint max amount
      await upOnly['mint(uint256,uint256)'](LIMITS.MAX_MINT_AMOUNT, 0, {
        value: COSTS.MINT * BigInt(LIMITS.MAX_MINT_AMOUNT)
      });

      expect(await upOnly.balanceOf(owner.address)).to.equal(
        LIMITS.MAX_MINT_AMOUNT
      );

      // Try to mint one more
      await expect(
        upOnly['mint(uint256,uint256)'](1, 0, { value: COSTS.MINT })
      ).to.be.revertedWithCustomError(upOnly, 'ExceedsMaxMintAmount');
    });
  });

  describe('Offers', function () {
    it('Should handle offers correctly', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      const contractAddress = await upOnly.getAddress();
      const contractBalanceBefore = await ethers.provider.getBalance(
        contractAddress
      );
      await upOnly
        .connect(addr1)
        ['offer(uint256)'](tokenId, { value: COSTS.TWO });

      expect(
        await ethers.provider.getBalance(contractAddress)
      ).to.be.greaterThan(contractBalanceBefore);
    });

    it('Should allow owners to make offers to themselves', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      const contractAddress = await upOnly.getAddress();
      const balanceBefore = await ethers.provider.getBalance(contractAddress);

      await upOnly['offer(uint256)'](tokenId, { value: COSTS.TWO });

      expect(
        await ethers.provider.getBalance(contractAddress)
      ).to.be.greaterThan(balanceBefore);
    });

    it('Should reject offers below previous price', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      await expect(
        upOnly.connect(addr1)['offer(uint256)'](tokenId, { value: COSTS.MINT })
      ).to.be.revertedWithCustomError(upOnly, 'OfferTooLow');
    });

    it('Should allow offer revocation', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      await upOnly
        .connect(addr1)
        ['offer(uint256)'](tokenId, { value: COSTS.TWO });

      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      await upOnly.connect(addr1).revoke(tokenId);

      expect(await ethers.provider.getBalance(addr1.address)).to.be.greaterThan(
        balanceBefore
      );
    });

    it('Should prevent unauthorized offer revocation', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      await upOnly
        .connect(addr1)
        ['offer(uint256)'](tokenId, { value: COSTS.TWO });

      await expect(
        upOnly.connect(addr2).revoke(tokenId)
      ).to.be.revertedWithCustomError(upOnly, 'Unauthorized');
    });
  });

  describe('Transfers', function () {
    it('Should handle transfers with valid offers', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      await upOnly
        .connect(addr1)
        ['offer(uint256)'](tokenId, { value: COSTS.TWO });
      await upOnly.transferFrom(owner.address, addr1.address, tokenId);

      expect(await upOnly.ownerOf(tokenId)).to.equal(addr1.address);
    });

    it('Should handle approved transfers with valid offers', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      await upOnly
        .connect(addr1)
        ['offer(uint256)'](tokenId, { value: COSTS.TWO });
      await upOnly.approve(addr2.address, tokenId);

      await upOnly
        .connect(addr2)
        .transferFrom(owner.address, addr1.address, tokenId);
      expect(await upOnly.ownerOf(tokenId)).to.equal(addr1.address);
    });

    it('Should handle operator transfers with valid offers', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);
      const tx = await mintTokens(upOnly, 1, owner);
      const tokenId = await getTokenIdFromMintTx(tx);

      await upOnly
        .connect(addr1)
        ['offer(uint256)'](tokenId, { value: COSTS.TWO });
      await upOnly.setApprovalForAll(addr2.address, true);

      await upOnly
        .connect(addr2)
        .transferFrom(owner.address, addr1.address, tokenId);
      expect(await upOnly.ownerOf(tokenId)).to.equal(addr1.address);
    });

    it('Should handle easter egg forced transfer', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      const tx = await upOnly.mint(1, 12, { value: COSTS.MINT }); // Mint token 12 specifically

      await upOnly
        .connect(addr1)
        ['offer(uint256)'](12, { value: COSTS.EASTER_EGG });
      expect(await upOnly.ownerOf(12)).to.equal(addr1.address);
    });

    it('Should reject easter egg transfer with insufficient premium', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      const tx = await upOnly.mint(1, 12, { value: COSTS.MINT }); // Mint token 12 specifically

      await expect(
        upOnly
          .connect(addr1)
          ['offer(uint256)'](12, { value: COSTS.EASTER_EGG_FAIL })
      ).to.be.revertedWithCustomError(upOnly, 'OfferTooLow');
    });
  });

  describe('Royalty Management', function () {
    it('Should allow royalty address updates', async function () {
      const { upOnly, addr1, addr2 } = await loadFixture(deployFixture);
      const royaltySigner = await setupRoyaltySigner(addr1);

      await expect(
        upOnly.connect(royaltySigner).updateRoyaltyAddress(addr2.address)
      )
        .to.emit(upOnly, 'RoyaltyAddressUpdated')
        .withArgs(ROYALTY.ADDRESS, addr2.address);

      expect(await upOnly.royaltyAddress()).to.equal(addr2.address);
    });

    it('Should reject unauthorized royalty address updates', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);

      await expect(
        upOnly.connect(owner).updateRoyaltyAddress(addr1.address)
      ).to.be.revertedWithCustomError(upOnly, 'Unauthorized');
    });

    it('Should reject invalid royalty address updates', async function () {
      const { upOnly, addr1 } = await loadFixture(deployFixture);
      const royaltySigner = await setupRoyaltySigner(addr1);

      await expect(
        upOnly.connect(royaltySigner).updateRoyaltyAddress(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(upOnly, 'ZeroAddress');

      await expect(
        upOnly.connect(royaltySigner).updateRoyaltyAddress(ROYALTY.ADDRESS)
      ).to.be.revertedWithCustomError(upOnly, 'SameAddress');
    });

    it('Should direct royalties to new address after update', async function () {
      const { upOnly, addr1, addr2 } = await loadFixture(deployFixture);
      const royaltySigner = await setupRoyaltySigner(addr1);

      await upOnly.connect(royaltySigner).updateRoyaltyAddress(addr2.address);

      const balanceBefore = await ethers.provider.getBalance(addr2.address);
      await mintTokens(upOnly, 1, addr1);

      expect(await ethers.provider.getBalance(addr2.address)).to.be.greaterThan(
        balanceBefore
      );
    });
  });
});
