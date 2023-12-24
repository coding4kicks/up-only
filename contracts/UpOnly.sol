// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract UpOnly is ERC721 {

  string public baseURI = "IPFS:todo";
  string public baseExtension = ".json";
  uint256 public cost = 0.1 ether;
  uint256 public supply = 0;
  uint256 public maxSupply = 99;
  uint256 public maxMintAmount = 5;
  uint256 public royalty = 3; // percent
  address payable public royaltyAddress = payable(0xCdB0Ba3bEE883C1E56b115b39bb0f2315Ce20C16); // VetDAO - TODO: multisig
  mapping(uint256 => uint256) public last;
  mapping(uint256 => uint256) public offers;
  mapping(uint256 => address payable) public offerers;

  constructor() ERC721("Test Flight", "UP") {
  }

  function mint(uint256 _mintAmount) public payable {
    require(_mintAmount > 0, "WHY ZERO");
    require(_mintAmount + balanceOf(msg.sender) <= maxMintAmount, "TOO GREEDY");
    require(supply + _mintAmount <= maxSupply, "ALL GONE");
    require(msg.value >= cost * _mintAmount, "LOW VALUE");

    for (uint256 i = 1; i <= _mintAmount; i++) {
      uint256 tokenId = supply;
      supply++;
      last[tokenId] = cost;
      _safeMint(msg.sender, tokenId);
    }

    // send royalties
    (bool success, ) = royaltyAddress.call{value: msg.value}("");
    require(success, "Failed to pay mint");
  }

  function transferFrom(address from, address to, uint256 tokenId) public override {
    address offerer = offerers[tokenId];
    _verifyAndPay(tokenId);
    super.transferFrom(from, offerer, tokenId);
  }

  function offer(uint256 tokenId, address payable recipient) public payable {
    require(msg.value > last[tokenId], "TOO CHEAP");
    require(msg.value > offers[tokenId], "TOO LATE");
    require(recipient != address(0));
    offerers[tokenId] = recipient;
    offers[tokenId] = msg.value;
  }

  function offer(uint256 tokenId) public payable {
    offer(tokenId, payable(msg.sender));
  }

  function revoke(uint256 tokenId) public payable {
    require(msg.sender == offerers[tokenId], "NOT YOU");

    // capture values and reset
    address payable offerer = offerers[tokenId];
    uint256 amount = offers[tokenId];
    uint256 fee = amount / 100; // 1% royalty on revoke
    offerers[tokenId] = payable(address(0));
    offers[tokenId] = last[tokenId];

    // return offer
    (bool success, ) = offerer.call{value: amount - fee}("");
    require(success, "Failed to return offer");

    // send royalties
    (success, ) = royaltyAddress.call{value: fee}("");
    require(success, "Failed to pay royalties");
  }

  function _verifyAndPay(uint256 tokenId) private {
    require(offers[tokenId] > last[tokenId], 'NOT POSSIBLE');
    last[tokenId] = offers[tokenId];

    // capture values and reset
    uint256 amount = offers[tokenId];
    uint256 fee = amount * royalty / 100; // 3% royalty on transfer
    offerers[tokenId] = payable(address(0));
    
    // send eth revert on fail (watch for re-entrancy -> keep transfer eth)
    (bool success, ) = ownerOf(tokenId).call{value: amount - fee}("");
    require(success, "Failed to send payment");

    // send royalties
    (success, ) = royaltyAddress.call{value: fee}("");
    require(success, "Failed to pay royalties");
  }
}

