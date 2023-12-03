import {
  time,
  loadFixture
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const BASE_URI = 'IPFS:todo';
const BASE_EXTENSION = '.json';
const COST = ethers.parseEther('0.1');
const MAX_SUPPLY = 33;
const MAX_MINT_AMOUNT = 3;

describe('UpOnly', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, addr1, addr2] = await ethers.getSigners();

    const UpOnly = await ethers.getContractFactory('UpOnly');
    const upOnly = await UpOnly.deploy();

    return { upOnly, owner, addr1, addr2 };
  }

  describe('Deployment', function () {
    it('Should set the correct name', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.name()).to.equal('Test Flight');
    });

    it('Should set the correct symbol', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.symbol()).to.equal('UP');
    });

    it('Should set the correct base uri', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.baseURI()).to.equal(BASE_URI);
    });

    it('Should set the correct base extension', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.baseExtension()).to.equal(BASE_EXTENSION);
    });

    it('Should set the correct cost or mint price', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.cost()).to.equal(COST);
    });

    it('Should set the correct supply', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.supply()).to.equal(0);
    });

    it('Should set the correct max supply', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it('Should set the correct max mint amount', async function () {
      const { upOnly } = await loadFixture(deployOneYearLockFixture);
      expect(await upOnly.maxMintAmount()).to.equal(MAX_MINT_AMOUNT);
    });
  });

  describe('Minting', function () {
    it('Should mint a new token and assign it to owner', async function () {
      const { upOnly, owner } = await loadFixture(deployOneYearLockFixture);
      const ownerAddress = await owner.getAddress();
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      await upOnly.mint(1, { value: COST });
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
