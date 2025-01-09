import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract } from 'ethers';

// Constants
const METADATA = {
  BASE_URI:
    'ipfs://bafybeifbye646qce3nr4p4gd3qpgrmyfxypaznmjcnvnvwdcdkpjularmu',
  CONTRACT_URI:
    'ipfs://bafybeifbye646qce3nr4p4gd3qpgrmyfxypaznmjcnvnvwdcdkpjularmu/up-only.json',
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
  MAX_MINT_AMOUNT: 5
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
  async function mintTokens(contract: Contract, amount: number, signer: any) {
    await contract
      .connect(signer)
      .mint(amount, { value: COSTS.MINT * BigInt(amount) });
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
      await upOnly.mint(1, { value: COSTS.MINT });
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(1);
      expect(await upOnly.ownerOf(0)).to.equal(ownerAddress);
    });

    it('Should enforce minimum price', async function () {
      const { upOnly } = await loadFixture(deployFixture);
      const belowCost = COSTS.MINT - BigInt(1);

      await expect(
        upOnly.mint(1, { value: belowCost })
      ).to.be.revertedWithCustomError(upOnly, 'InsufficientPayment');
    });

    it('Should mint tokens to multiple addresses', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);

      // First mint
      await mintTokens(upOnly, 1, owner);
      expect(await upOnly.ownerOf(0)).to.equal(owner.address);

      // Second mint
      await mintTokens(upOnly, 1, addr1);
      expect(await upOnly.ownerOf(1)).to.equal(addr1.address);

      // Third mint
      await mintTokens(upOnly, 1, addr2);
      expect(await upOnly.ownerOf(2)).to.equal(addr2.address);
    });

    it('Should allow minting up to max mint amount per wallet', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);

      await upOnly.mint(LIMITS.MAX_MINT_AMOUNT, {
        value: COSTS.MINT * BigInt(LIMITS.MAX_MINT_AMOUNT)
      });

      expect(await upOnly.balanceOf(owner.address)).to.equal(
        LIMITS.MAX_MINT_AMOUNT
      );

      await expect(
        upOnly.mint(1, { value: COSTS.MINT })
      ).to.be.revertedWithCustomError(upOnly, 'ExceedsMaxMintAmount');
    });

    it('Should enforce max supply limit', async function () {
      const { upOnly, addresses } = await loadFixture(deployFixture);

      // Mint 130 tokens (26 addresses * 5 tokens each)
      for (let i = 0; i < 26; i++) {
        await mintTokens(upOnly, LIMITS.MAX_MINT_AMOUNT, addresses[i]);
      }

      // Mint the last token
      await mintTokens(upOnly, 1, addresses[26]);

      // Try to mint one more
      await expect(
        mintTokens(upOnly, 1, addresses[27])
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

      await expect(upOnly.mint(1, { value: COSTS.MINT }))
        .to.emit(upOnly, 'Mint')
        .withArgs(0, owner.address, 1, COSTS.MINT, 1);
    });
  });

  describe('Offers', function () {
    it('Should handle offers correctly', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      await mintTokens(upOnly, 1, owner);

      const contractAddress = await upOnly.getAddress();
      const contractBalanceBefore = await ethers.provider.getBalance(
        contractAddress
      );
      await upOnly.connect(addr1)['offer(uint256)'](0, { value: COSTS.TWO });

      expect(
        await ethers.provider.getBalance(contractAddress)
      ).to.be.greaterThan(contractBalanceBefore);
    });

    it('Should allow owners to make offers to themselves', async function () {
      const { upOnly, owner } = await loadFixture(deployFixture);

      await mintTokens(upOnly, 1, owner);
      const contractAddress = await upOnly.getAddress();
      const balanceBefore = await ethers.provider.getBalance(contractAddress);

      await upOnly['offer(uint256)'](0, { value: COSTS.TWO });

      expect(
        await ethers.provider.getBalance(contractAddress)
      ).to.be.greaterThan(balanceBefore);
    });

    it('Should reject offers below previous price', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);

      await mintTokens(upOnly, 1, owner);
      await expect(
        upOnly.connect(addr1)['offer(uint256)'](0, { value: COSTS.MINT })
      ).to.be.revertedWithCustomError(upOnly, 'OfferTooLow');
    });

    it('Should allow offer revocation', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);

      await mintTokens(upOnly, 1, owner);
      await upOnly.connect(addr1)['offer(uint256)'](0, { value: COSTS.TWO });

      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      await upOnly.connect(addr1).revoke(0);

      expect(await ethers.provider.getBalance(addr1.address)).to.be.greaterThan(
        balanceBefore
      );
    });

    it('Should prevent unauthorized offer revocation', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);

      await mintTokens(upOnly, 1, owner);
      await upOnly.connect(addr1)['offer(uint256)'](0, { value: COSTS.TWO });

      await expect(
        upOnly.connect(addr2).revoke(0)
      ).to.be.revertedWithCustomError(upOnly, 'Unauthorized');
    });
  });

  describe('Transfers', function () {
    it('Should handle transfers with valid offers', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(deployFixture);
      await mintTokens(upOnly, 1, owner);

      await upOnly.connect(addr1)['offer(uint256)'](0, { value: COSTS.TWO });
      await upOnly.transferFrom(owner.address, addr1.address, 0);

      expect(await upOnly.ownerOf(0)).to.equal(addr1.address);
    });

    it('Should handle approved transfers with valid offers', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);

      await mintTokens(upOnly, 1, owner);
      await upOnly.connect(addr1)['offer(uint256)'](0, { value: COSTS.TWO });
      await upOnly.approve(addr2.address, 0);

      await upOnly.connect(addr2).transferFrom(owner.address, addr1.address, 0);
      expect(await upOnly.ownerOf(0)).to.equal(addr1.address);
    });

    it('Should handle operator transfers with valid offers', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(deployFixture);

      await mintTokens(upOnly, 1, owner);
      await upOnly.connect(addr1)['offer(uint256)'](0, { value: COSTS.TWO });
      await upOnly.setApprovalForAll(addr2.address, true);

      await upOnly.connect(addr2).transferFrom(owner.address, addr1.address, 0);
      expect(await upOnly.ownerOf(0)).to.equal(addr1.address);
    });

    it('Should handle easter egg forced transfer', async function () {
      const { upOnly, owner, addr1, addresses } = await loadFixture(
        deployFixture
      );

      // Mint all tokens except the last one
      for (let i = 0; i < 26; i++) {
        await mintTokens(upOnly, LIMITS.MAX_MINT_AMOUNT, addresses[i]);
      }
      await mintTokens(upOnly, 1, owner);

      await upOnly
        .connect(addr1)
        ['offer(uint256)'](130, { value: COSTS.EASTER_EGG });
      expect(await upOnly.ownerOf(130)).to.equal(addr1.address);
    });

    it('Should reject easter egg transfer with insufficient premium', async function () {
      const { upOnly, owner, addr1, addresses } = await loadFixture(
        deployFixture
      );

      // Mint all tokens except the last one
      for (let i = 0; i < 26; i++) {
        await mintTokens(upOnly, LIMITS.MAX_MINT_AMOUNT, addresses[i]);
      }
      await mintTokens(upOnly, 1, owner);

      await expect(
        upOnly
          .connect(addr1)
          ['offer(uint256)'](130, { value: COSTS.EASTER_EGG_FAIL })
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
