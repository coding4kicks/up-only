// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC7572 {
  function contractURI() external view returns (string memory);

  event ContractURIUpdated();
}

contract UpOnly is ERC721, IERC7572, ReentrancyGuard {

  string public baseURI = "ipfs://bafybeifbye646qce3nr4p4gd3qpgrmyfxypaznmjcnvnvwdcdkpjularmu";
  string public contractURI = "ipfs://bafybeifbye646qce3nr4p4gd3qpgrmyfxypaznmjcnvnvwdcdkpjularmu/up-only.json";
  string public baseExtension = ".json";
  uint256 public cost = 0.1 ether;
  uint256 public supply = 0;
  uint256 public maxSupply = 131;
  uint256 public maxMintAmount = 5;
  uint256 public royalty = 3; // percent
  address payable public royaltyAddress = payable(0xCdB0Ba3bEE883C1E56b115b39bb0f2315Ce20C16);
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

  // Add event for royalty address updates
  event RoyaltyAddressUpdated(address indexed oldAddress, address indexed newAddress);

  constructor() ERC721("Test Flight", "UP") {
  }

  // Mint `mintAmount` to `mgs.sender` at `cost` per token up to `maxMintAmount` and `maxSupply`
  function mint(uint256 mintAmount) public payable nonReentrant {
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

    emit Mint(tokenId, msg.sender, mintAmount, msg.value, supply);

    // External call after state changes
    (bool success, ) = royaltyAddress.call{value: msg.value}("");
    require(success, "Failed to pay mint");
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

    // FTX token easter egg
    if (tokenId == 130) {
      // Throw a Too Cheap if not > 5% over last to cover royalties & fees
      uint256 buffer = last[tokenId] * 5 / 100;
      require(offers[tokenId] > last[tokenId] + buffer, 'TOO CHEAP');
      // Approve offerer to transfer all tokens of owner
      address owner = ownerOf(tokenId);
      super._setApprovalForAll(owner, recipient, true);
      transferFrom(owner, recipient, tokenId);
      // Remove approval for offerer to transfer all tokens of owner
      super._setApprovalForAll(owner, recipient, false);
    }


    emit Offer(tokenId, recipient, ownerOf(tokenId), msg.value);
  }

  function offer(uint256 tokenId) public payable {
    offer(tokenId, payable(msg.sender));
  }

  // Revoke an offer and get a refund minus a fee
  function revoke(uint256 tokenId) public payable nonReentrant {
    require(msg.sender == offerers[tokenId], "NOT YOU");

    // Capture values and update state first
    address payable offerer = offerers[tokenId];
    uint256 amount = offers[tokenId];
    uint256 fee = amount / 100;
    
    // Update state
    offerers[tokenId] = payable(address(0));
    offers[tokenId] = last[tokenId];
    
    emit Revoke(tokenId, offerer, ownerOf(tokenId), amount, fee);

    // External calls after state changes
    (bool success, ) = offerer.call{value: amount - fee}("");
    require(success, "Failed to return offer");

    (success, ) = royaltyAddress.call{value: fee}("");
    require(success, "Failed to pay royalties");
  }

  function _payout(uint256 tokenId) private nonReentrant {
    require(offers[tokenId] > last[tokenId], 'NOT POSSIBLE');
    
    // Capture and update state first
    uint256 amount = offers[tokenId];
    uint256 fee = amount * royalty / 100;
    address offerer = offerers[tokenId];
    address owner = ownerOf(tokenId);
    
    // Update state
    last[tokenId] = offers[tokenId];
    offerers[tokenId] = payable(address(0));
    
    emit Payout(tokenId, offerer, owner, amount, fee);

    // External calls after state changes
    (bool success, ) = owner.call{value: amount - fee}("");
    require(success, "Failed to send payment");
    
    (success, ) = royaltyAddress.call{value: fee}("");
    require(success, "Failed to pay royalties");
  }

  // Add function to update royalty address
  function updateRoyaltyAddress(address payable newRoyaltyAddress) external {
    require(msg.sender == royaltyAddress, "NOT AUTHORIZED");
    require(newRoyaltyAddress != address(0), "ZERO ADDRESS");
    require(newRoyaltyAddress != royaltyAddress, "SAME ADDRESS");
    
    address oldAddress = royaltyAddress;
    royaltyAddress = newRoyaltyAddress;
    
    emit RoyaltyAddressUpdated(oldAddress, newRoyaltyAddress);
  }

}

