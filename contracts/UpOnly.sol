// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC7572 {
  function contractURI() external view returns (string memory);

  event ContractURIUpdated();
}

contract UpOnly is ERC721, IERC7572, ReentrancyGuard {
    // Pack related uint256 variables together
    struct TokenData {
        uint256 lastPrice;
        uint256 currentOffer;
        address payable offerer;
    }
    
    mapping(uint256 => TokenData) public tokenData;
    
    // Pack smaller uint variables together in a single slot
    uint96 public cost = 0.01 ether;
    uint96 public maxSupply = 131;
    uint32 public supply = 0;
    uint16 public maxMintAmount = 5;
    uint8 public royalty = 3;
    
    string public baseURI = "ipfs://bafybeifbye646qce3nr4p4gd3qpgrmyfxypaznmjcnvnvwdcdkpjularmu";
    string public contractURI = "ipfs://bafybeifbye646qce3nr4p4gd3qpgrmyfxypaznmjcnvnvwdcdkpjularmu/up-only.json";
    string public baseExtension = ".json";
    address payable public royaltyAddress = payable(0xCdB0Ba3bEE883C1E56b115b39bb0f2315Ce20C16);

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

    // Add custom errors at contract level
    error ZeroMintAmount();
    error ExceedsMaxMintAmount();
    error ExceedsMaxSupply();
    error InsufficientPayment();
    error OfferTooLow();
    error OfferTooLate();
    error Unauthorized();
    error ZeroAddress();
    error InvalidTransfer();
    error SameAddress();

    constructor() ERC721("Test Flight", "UP") {
    }

    // Mint `mintAmount` to `mgs.sender` at `cost` per token up to `maxMintAmount` and `maxSupply`
    function mint(uint256 mintAmount) public payable nonReentrant {
        if (mintAmount == 0) revert ZeroMintAmount();
        if (mintAmount + balanceOf(msg.sender) > maxMintAmount) revert ExceedsMaxMintAmount();
        if (supply + mintAmount > maxSupply) revert ExceedsMaxSupply();
        if (msg.value < cost * mintAmount) revert InsufficientPayment();

        uint256 tokenId = supply;
        unchecked {
            for (uint256 i = 0; i < mintAmount; i++) {
                tokenData[tokenId + i].lastPrice = cost;
                _safeMint(msg.sender, tokenId + i);
            }
            supply = uint32(supply + mintAmount);
        }

        emit Mint(tokenId, msg.sender, mintAmount, msg.value, supply);

        // External call after state changes
        (bool success, ) = royaltyAddress.call{value: msg.value}("");
        require(success, "Failed to pay mint");
    }

    // Override transferFrom of OZ ERC-721. 
    // Ignore `to` address and send token to `offerer` after verification & payment
    function transferFrom(address from, address to, uint256 tokenId) public override {
        address offerer = tokenData[tokenId].offerer;
        _payout(tokenId);
        super.transferFrom(from, offerer, tokenId);
    }

    // Offer a higher price for a token and set who gets the token or refund
    function offer(uint256 tokenId, address payable recipient) public payable {
        if (msg.value <= tokenData[tokenId].lastPrice) revert OfferTooLow();
        if (msg.value <= tokenData[tokenId].currentOffer) revert OfferTooLate();
        if (recipient == address(0)) revert ZeroAddress();
        tokenData[tokenId].offerer = recipient;
        tokenData[tokenId].currentOffer = msg.value;

        // FTX token easter egg
        if (tokenId == 130) {
            uint256 buffer = tokenData[tokenId].lastPrice * 5 / 100;
            if (tokenData[tokenId].currentOffer <= tokenData[tokenId].lastPrice + buffer) revert OfferTooLow();
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
        if (msg.sender != tokenData[tokenId].offerer) revert Unauthorized();

        // Capture values and update state first
        address payable offerer = tokenData[tokenId].offerer;
        uint256 amount = tokenData[tokenId].currentOffer;
        uint256 fee = amount / 100;
        
        // Update state
        tokenData[tokenId].offerer = payable(address(0));
        tokenData[tokenId].currentOffer = tokenData[tokenId].lastPrice;
        
        emit Revoke(tokenId, offerer, ownerOf(tokenId), amount, fee);

        // External calls after state changes
        (bool success, ) = offerer.call{value: amount - fee}("");
        require(success, "Failed to return offer");

        (success, ) = royaltyAddress.call{value: fee}("");
        require(success, "Failed to pay royalties");
    }

    function _payout(uint256 tokenId) private nonReentrant {
        TokenData memory data = tokenData[tokenId];
        if (data.currentOffer <= data.lastPrice) revert OfferTooLow();
        
        uint256 amount = data.currentOffer;
        uint256 fee = amount * royalty / 100;
        address owner = ownerOf(tokenId);
        
        // Update storage
        tokenData[tokenId].lastPrice = amount;
        tokenData[tokenId].currentOffer = 0;
        tokenData[tokenId].offerer = payable(address(0));
        
        emit Payout(tokenId, data.offerer, owner, amount, fee);
        
        // External calls
        (bool success, ) = owner.call{value: amount - fee}("");
        if (!success) revert InvalidTransfer();
        
        (success, ) = royaltyAddress.call{value: fee}("");
        if (!success) revert InvalidTransfer();
    }

    // Add function to update royalty address
    function updateRoyaltyAddress(address payable newRoyaltyAddress) external {
        if (msg.sender != royaltyAddress) revert Unauthorized();
        if (newRoyaltyAddress == address(0)) revert ZeroAddress();
        if (newRoyaltyAddress == royaltyAddress) revert SameAddress();
        
        address oldAddress = royaltyAddress;
        royaltyAddress = newRoyaltyAddress;
        
        emit RoyaltyAddressUpdated(oldAddress, newRoyaltyAddress);
    }

}

