// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract UpOnly is ERC721 {

  string public baseURI = "IPFS:todo";
  string public baseExtension = ".json";
  string public royaltyAddress = "0xCdB0Ba3bEE883C1E56b115b39bb0f2315Ce20C16"; // VetDAO - TODO: switch to multisig
  uint256 public cost = 0.1 ether;
  uint256 public supply = 0;
  uint256 public maxSupply = 99;
  uint256 public maxMintAmount = 5;
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

    // TODO: pay royalty as penalty to prevent griefers who outbid then revoke since we reset to last

    // capture values and reset
    address payable offerer = offerers[tokenId];
    uint256 amount = offers[tokenId];
    offerers[tokenId] = payable(address(0));
    offers[tokenId] = last[tokenId];

    // send eth revert on fail
    (bool success, ) = offerer.call{value: amount}("");
    require(success, "Failed to send Ether");
  }

  function _verifyAndPay(uint256 tokenId) private {
    require(offers[tokenId] > last[tokenId], 'NOT POSSIBLE');
    last[tokenId] = offers[tokenId];

    // capture values and reset
    uint256 amount = offers[tokenId];
    offerers[tokenId] = payable(address(0));

    // TODO: Pay Royalty
    
    // send eth revert on fail (watch for re-entrancy -> keep transfer eth)
    (bool success, ) = ownerOf(tokenId).call{value: amount}("");
    require(success, "Failed to send Ether");
  }
}

