import {
  time,
  loadFixture
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const MINT_PRICE = ethers.parseEther('0.1'); // point one eth

describe('UpOnly', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    // Contracts are deployed using the first signer/account by default
    const [owner, addr1, addr2] = await ethers.getSigners();

    const UpOnly = await ethers.getContractFactory('UpOnly');
    const upOnly = await UpOnly.deploy();

    return { upOnly, owner, addr1, addr2 };
  }

  describe('Deployment', function () {
    it('Should set the correct name', async function () {
      const { upOnly, owner } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.name()).to.equal('Test Flight');
    });

    it('Should set the correct symbol', async function () {
      const { upOnly, owner } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.symbol()).to.equal('UP');
    });
  });

  describe('Minting', function () {
    it('Should mint a new token and assign it to owner', async function () {
      const { upOnly, owner } = await loadFixture(deployOneYearLockFixture);
      const ownerAddress = await owner.getAddress();
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      await upOnly.mint(1, { value: MINT_PRICE });
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(1);
      expect(await upOnly.ownerOf(0)).to.equal(ownerAddress);
    });

    it('Should allow minting for set price', async function () {
      const { upOnly, owner } = await loadFixture(deployOneYearLockFixture);
    });

    it('Should not allow minting for below set price', async function () {});
  });

  describe('Transfers', function () {
    it('Should allow transfers (TODO: fix)', async function () {});
  });
});
