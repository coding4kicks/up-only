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
const COST_TWO = ethers.parseEther('0.2');
const COST_THREE = ethers.parseEther('0.3');
const COST_FOUR = ethers.parseEther('0.4');
const MAX_SUPPLY = 33;
const MAX_MINT_AMOUNT = 3;

describe('UpOnly', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function upOnlyFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, addr1, addr2, ...addresses] = await ethers.getSigners();

    const UpOnly = await ethers.getContractFactory('UpOnly');
    const upOnly = await UpOnly.deploy();

    return { upOnly, owner, addr1, addr2, addresses };
  }

  describe('Deployment', function () {
    it('Should set the correct name', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.name()).to.equal('Test Flight');
    });

    it('Should set the correct symbol', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.symbol()).to.equal('UP');
    });

    it('Should set the correct base uri', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.baseURI()).to.equal(BASE_URI);
    });

    it('Should set the correct base extension', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.baseExtension()).to.equal(BASE_EXTENSION);
    });

    it('Should set the correct cost or mint price', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.cost()).to.equal(COST);
    });

    it('Should set the correct supply', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.supply()).to.equal(0);
    });

    it('Should set the correct max supply', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it('Should set the correct max mint amount', async function () {
      const { upOnly } = await loadFixture(upOnlyFixture);
      expect(await upOnly.maxMintAmount()).to.equal(MAX_MINT_AMOUNT);
    });
  });

  describe('Minting', function () {
    it('Should mint a new token and assign it to owner for cost price', async function () {
      const { upOnly, owner } = await loadFixture(upOnlyFixture);
      const ownerAddress = await owner.getAddress();
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      await upOnly.mint(1, { value: COST });
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(1);
      expect(await upOnly.ownerOf(0)).to.equal(ownerAddress);
    });

    it('Should not mint a new token and assign it to owner if below cost price', async function () {
      const { upOnly, owner } = await loadFixture(upOnlyFixture);
      const BELOW_COST = ethers.parseEther('0.099');
      const ownerAddress = await owner.getAddress();
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      await expect(upOnly.mint(1, { value: BELOW_COST })).to.be.reverted;
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      await expect(upOnly.ownerOf(0)).to.be.reverted;
    });

    it('Should mint tokens to multiple people', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(upOnlyFixture);
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();

      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      await upOnly.mint(1, { value: COST });
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(1);
      expect(await upOnly.ownerOf(0)).to.equal(ownerAddress);

      expect(await upOnly.balanceOf(addr1Address)).to.equal(0);
      await upOnly.connect(addr1).mint(1, { value: COST });
      expect(await upOnly.balanceOf(addr1Address)).to.equal(1);
      expect(await upOnly.ownerOf(1)).to.equal(addr1Address);

      expect(await upOnly.balanceOf(addr2Address)).to.equal(0);
      await upOnly.connect(addr2).mint(1, { value: COST });
      expect(await upOnly.balanceOf(addr2Address)).to.equal(1);
      expect(await upOnly.ownerOf(2)).to.equal(addr2Address);
    });

    it('Should allow minting up to max mint amount tokens per wallet', async function () {
      const { upOnly, owner, addr1, addr2 } = await loadFixture(upOnlyFixture);
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();
      const addr2Address = await addr2.getAddress();

      for (let i = 0; i < MAX_MINT_AMOUNT; i++) {
        console.log(i);
        expect(await upOnly.balanceOf(ownerAddress)).to.equal(i);
        await upOnly.mint(1, { value: COST });
        expect(await upOnly.balanceOf(ownerAddress)).to.equal(i + 1);
        expect(await upOnly.ownerOf(i)).to.equal(ownerAddress);
      }

      expect(await upOnly.balanceOf(addr1Address)).to.equal(0);
      await upOnly.connect(addr1).mint(2, { value: COST_TWO });
      expect(await upOnly.balanceOf(addr1Address)).to.equal(2);
      expect(await upOnly.ownerOf(MAX_MINT_AMOUNT)).to.equal(addr1Address);
      expect(await upOnly.ownerOf(MAX_MINT_AMOUNT + 1)).to.equal(addr1Address);

      expect(await upOnly.balanceOf(addr2Address)).to.equal(0);
      await upOnly.connect(addr2).mint(3, { value: COST_THREE });
      expect(await upOnly.balanceOf(addr2Address)).to.equal(3);
      expect(await upOnly.ownerOf(MAX_MINT_AMOUNT + 2)).to.equal(addr2Address);
      expect(await upOnly.ownerOf(MAX_MINT_AMOUNT + 3)).to.equal(addr2Address);
      expect(await upOnly.ownerOf(MAX_MINT_AMOUNT + 4)).to.equal(addr2Address);
    });

    it('Should not allow minting more than max mint amount tokens per wallet', async function () {
      const { upOnly, owner, addr1 } = await loadFixture(upOnlyFixture);
      const ownerAddress = await owner.getAddress();
      const addr1Address = await addr1.getAddress();

      for (let i = 0; i < MAX_MINT_AMOUNT; i++) {
        expect(await upOnly.balanceOf(ownerAddress)).to.equal(i);
        await upOnly.mint(1, { value: COST });
        expect(await upOnly.balanceOf(ownerAddress)).to.equal(i + 1);
        expect(await upOnly.ownerOf(i)).to.equal(ownerAddress);
      }

      expect(await upOnly.balanceOf(ownerAddress)).to.equal(MAX_MINT_AMOUNT);
      await expect(upOnly.mint(1, { value: COST })).to.be.reverted;
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(MAX_MINT_AMOUNT);

      expect(await upOnly.balanceOf(addr1Address)).to.equal(0);
      await expect(upOnly.connect(addr1).mint(4, { value: COST_FOUR })).to.be
        .reverted;
      expect(await upOnly.balanceOf(addr1Address)).to.equal(0);
    });

    it('Should not allow minting multiple tokens for the price of one', async function () {
      const { upOnly, owner } = await loadFixture(upOnlyFixture);
      const ownerAddress = await owner.getAddress();
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      await expect(upOnly.mint(2, { value: COST })).to.be.reverted;
      expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
    });

    it('Should increment supply when minting a token', async function () {
      const { upOnly, owner } = await loadFixture(upOnlyFixture);
      const ownerAddress = await owner.getAddress();
      expect(await upOnly.supply()).to.equal(0);
      await upOnly.mint(1, { value: COST });
      expect(await upOnly.supply()).to.equal(1);
    });

    it('Should allow minting up to max supply tokens', async function () {
      // const { upOnly, owner, addresses } = await loadFixture(upOnlyFixture);
      // const ownerAddress = await owner.getAddress();
      // for (let i = 0; i < MAX_SUPPLY; i++) {
      //   console.log(addresses[i]);
      //   await upOnly.connect(addresses[i]).mint(1, { value: COST });
      // }
      // expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
      // await expect(upOnly.mint(1, { value: COST })).to.be.reverted;
      // expect(await upOnly.balanceOf(ownerAddress)).to.equal(0);
    });

    it('Should not allow minting more than max supply tokens per wallet', async function () {});
  });

  describe('Transfers', function () {
    it('Should allow transfers (TODO: fix)', async function () {});
  });
});
