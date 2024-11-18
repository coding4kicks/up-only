// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract UpOnly is ERC721 {

  string public baseURI = "IPFS:todo"; // TODO: Collection details
  string public baseExtension = ".json";
  uint256 public cost = 0.1 ether;
  uint256 public supply = 0;
  uint256 public maxSupply = 131;
  uint256 public maxMintAmount = 5;
  uint256 public royalty = 3; // percent
  address payable public royaltyAddress = payable(0xCdB0Ba3bEE883C1E56b115b39bb0f2315Ce20C16); // VetDAO - TODO: multisig, allow update later
  mapping(uint256 => uint256) public last;
  mapping(uint256 => uint256) public offers;
  mapping(uint256 => address payable) public offerers;

  // Mint event documenting first minted token ID, new token owner, mint amount, total cost, and remaining supply
  event Mint(uint256 indexed token, address indexed owner, uint256 amount, uint256 cost, uint256 supply);

  // Offer event documenting token ID, recipient, token owner, and offer amount
  event Offer(uint256 indexed token, address indexed recipient, address indexed owner, uint256 offer);

  // Revoke event documenting the tokenId, the refund recipient, token owner, refund total amount, and royalty fee.
  event Revoke(uint256 indexed token, address indexed recipient, address indexed owner, uint256 refund, uint256 fee);

  // Payout event documenting the tokenId, the offerer, the owner to be paid, the accepted offer amount, and royalty fee.
  event Payout(uint256 indexed token, address indexed offerer, address indexed payee, uint256 offer, uint256 fee);

  constructor() ERC721("Test Flight", "UP") {
  }

  // Mint `mintAmount` to `mgs.sender` at `cost` per token up to `maxMintAmount` and `maxSupply`
  function mint(uint256 mintAmount) public payable {
    require(mintAmount > 0, "WHY ZERO");
    require(mintAmount + balanceOf(msg.sender) <= maxMintAmount, "TOO GREEDY");
    require(supply + mintAmount <= maxSupply, "ALL GONE");
    require(msg.value >= cost * mintAmount, "TOO CHEAP");

    uint256 tokenId = supply;
    for (uint256 i = 0; i < mintAmount; i++) {
      last[tokenId] = cost;
      _safeMint(msg.sender, tokenId + i);
    }
    supply = supply + mintAmount;

    // send royalties - whitelist address or add re-entrency protection
    (bool success, ) = royaltyAddress.call{value: msg.value}("");
    require(success, "Failed to pay mint");

    emit Mint(tokenId, msg.sender, mintAmount, msg.value, supply);
  }

  // Override transferFrom of OZ ERC-721. 
  // Ignore `to` address and send token to `offerer` after verification & payment
  function transferFrom(address from, address to, uint256 tokenId) public override {
    address offerer = offerers[tokenId];
    _payout(tokenId);
    super.transferFrom(from, offerer, tokenId);
  }

  // Offer a higher price for a token and set who gets the token or refund
  function offer(uint256 tokenId, address payable recipient) public payable {
    require(msg.value > last[tokenId], "TOO CHEAP");
    require(msg.value > offers[tokenId], "TOO LATE");
    require(recipient != address(0));
    offerers[tokenId] = recipient;
    offers[tokenId] = msg.value;

    // TODO: FTX token
    // // Let the (extra) tokens be free (way to create more like this after?)
    // if (tokenId >= MaxSupply) super.approve(recipient)

    emit Offer(tokenId, recipient, ownerOf(tokenId), msg.value);
  }

  function offer(uint256 tokenId) public payable {
    offer(tokenId, payable(msg.sender));
  }

  // Revoke an offer and get a refund minus a fee
  function revoke(uint256 tokenId) public payable {
    require(msg.sender == offerers[tokenId], "NOT YOU");

    // capture values and reset
    address payable offerer = offerers[tokenId];
    uint256 amount = offers[tokenId];
    uint256 fee = amount / 100; // 1% royalty on revoke
    offerers[tokenId] = payable(address(0));
    offers[tokenId] = last[tokenId];

    // return offer - TODO: could this grief with a failure
    (bool success, ) = offerer.call{value: amount - fee}("");
    require(success, "Failed to return offer");

    // send royalties
    (success, ) = royaltyAddress.call{value: fee}("");
    require(success, "Failed to pay royalties");

    emit Revoke(tokenId, offerer, ownerOf(tokenId), amount, fee);
  }

  function _payout(uint256 tokenId) private {
    require(offers[tokenId] > last[tokenId], 'NOT POSSIBLE');
    last[tokenId] = offers[tokenId];

    // capture values and reset
    uint256 amount = offers[tokenId];
    uint256 fee = amount * royalty / 100; // 3% royalty on transfer
    address offerer = offerers[tokenId];
    address owner = ownerOf(tokenId);
    offerers[tokenId] = payable(address(0));
    
    // send eth revert on fail (watch for re-entrancy -> keep transfer eth) - TODO: could this grief with a failure
    (bool success, ) = owner.call{value: amount - fee}("");
    require(success, "Failed to send payment");

    // send royalties
    (success, ) = royaltyAddress.call{value: fee}("");
    require(success, "Failed to pay royalties");

    emit Payout(tokenId, offerer, owner, amount, fee);
  }
}

