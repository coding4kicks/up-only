// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract UpOnly is ERC721 {

  string public baseURI = "IPFS:todo";
  string public baseExtension = ".json";
  uint256 public cost = 0.1 ether;
  uint256 public supply = 0;
  uint256 public maxSupply = 33;
  uint256 public maxMintAmount = 3;

  constructor() ERC721("Test Flight", "UP") {
  }

  // public
  function mint(uint256 _mintAmount) public payable {
    require(_mintAmount > 0);
    require(_mintAmount <= maxMintAmount);
    require(supply + _mintAmount <= maxSupply);
    require(msg.value >= cost * _mintAmount);

    for (uint256 i = 1; i <= _mintAmount; i++) {
      uint256 tokenId = supply;
      supply++;
      _safeMint(msg.sender, tokenId);
    }
  }

}

