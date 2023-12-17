// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract UpOnly is ERC721 {

  string public baseURI = "IPFS:todo";
  string public baseExtension = ".json";
  string public royaltyAddress = "0xCdB0Ba3bEE883C1E56b115b39bb0f2315Ce20C16"; // VetDAO - TODO: switch to multisig
  uint256 public cost = 0.1 ether;
  uint256 public supply = 0;
  uint256 public maxSupply = 99;
  uint256 public maxMintAmount = 5;

  constructor() ERC721("Test Flight", "UP") {
  }

  // public
  function mint(uint256 _mintAmount) public payable {
    require(_mintAmount > 0, "WHY ZERO");
    require(_mintAmount + balanceOf(msg.sender) <= maxMintAmount, "TOO GREEDY");
    require(supply + _mintAmount <= maxSupply, "ALL GONE");
    require(msg.value >= cost * _mintAmount, "CHEAP VALUE");

    for (uint256 i = 1; i <= _mintAmount; i++) {
      uint256 tokenId = supply;
      supply++;
      _safeMint(msg.sender, tokenId);
    }
  }

}

