// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IERC7572 {
  function contractURI() external view returns (string memory);

  event ContractURIUpdated();
}

contract UpOnly is ERC721, IERC7572, ReentrancyGuard {
    using Strings for uint256;
    
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
    uint16 public maxMintAmount = 10;
    uint8 public royalty = 3;
    
    string public baseURI = "ipfs://bafybeie3xrh2gngkin2jr53cb2nn24ayx2hne2tztwhyynu3mf63ijzfam";
    string public contractURI = "ipfs://bafybeie3xrh2gngkin2jr53cb2nn24ayx2hne2tztwhyynu3mf63ijzfam/up-only.json";
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

    // New function to get available tokens
    function _getAvailableTokens(uint256 amount) private view returns (uint256[] memory) {
        require(amount <= maxSupply, "Amount exceeds max supply");
        
        uint256[] memory available = new uint256[](maxSupply);
        uint256 count = 0;
        
        for (uint256 i = 0; i < maxSupply; i++) {
            if (tokenData[i].lastPrice == 0) {
                available[count] = i;
                count++;
            }
        }
        
        require(count >= amount, "Not enough tokens available");
        return available;
    }

    // New function to get random number - Note: Not cryptographically secure
    function _random(uint256 seed, uint256 max) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            seed
        ))) % max;
    }

    // Updated mint function to handle specific token ID or random minting
    function mint(uint256 mintAmount, uint256 tokenId) public payable nonReentrant {
        if (mintAmount == 0) revert ZeroMintAmount();
        if (mintAmount + balanceOf(msg.sender) > maxMintAmount) revert ExceedsMaxMintAmount();
        if (supply + mintAmount > maxSupply) revert ExceedsMaxSupply();
        if (msg.value < cost * mintAmount) revert InsufficientPayment();

        // If tokenId is 0, mint random tokens
        if (tokenId == 0) {
            uint256[] memory available = _getAvailableTokens(mintAmount);
            uint256 availableCount = 0;
            for (uint256 i = 0; i < maxSupply; i++) {
                if (tokenData[i].lastPrice == 0) availableCount++;
            }

            unchecked {
                for (uint256 i = 0; i < mintAmount; i++) {
                    uint256 randomIndex = _random(i, availableCount - i);
                    uint256 selectedToken = available[randomIndex];
                    
                    // Swap the selected token with the last available token
                    available[randomIndex] = available[availableCount - i - 1];
                    
                    tokenData[selectedToken].lastPrice = cost;
                    _safeMint(msg.sender, selectedToken);
                    
                    // Emit event for each token
                    emit Mint(selectedToken, msg.sender, 1, msg.value / mintAmount, supply + i + 1);
                }
                supply = uint32(supply + mintAmount);
            }
        } else {
            // Mint specific token
            if (mintAmount != 1) revert("Can only mint 1 token when specifying ID");
            if (tokenId >= maxSupply) revert("Token ID exceeds max supply");
            if (tokenData[tokenId].lastPrice != 0) revert("Token already minted");
            
            tokenData[tokenId].lastPrice = cost;
            _safeMint(msg.sender, tokenId);
            
            unchecked {
                supply = uint32(supply + 1);
            }
            
            emit Mint(tokenId, msg.sender, 1, msg.value, supply);
        }

        // External call after state changes
        (bool success, ) = royaltyAddress.call{value: msg.value}("");
        require(success, "Failed to pay mint");
    }

    // Update overloaded mint function
    function mint(uint256 mintAmount) public payable {
        mint(mintAmount, 0); // Use 0 for random minting
    }

    // Override transferFrom of OZ ERC-721. 
    // Ignore `to` address and send token to `offerer` after verification & payment
    function transferFrom(address from, address to, uint256 tokenId) public override {
        address offerer = tokenData[tokenId].offerer;
        _payout(tokenId);
        super.transferFrom(from, offerer, tokenId);
    }

    // Offer a higher price for a token and set who gets the token or refund
    function offer(uint256 tokenId, address payable recipient) public payable nonReentrant {
        if (msg.value <= tokenData[tokenId].lastPrice) revert OfferTooLow();
        if (recipient == address(0)) revert ZeroAddress();
        
        // Handle FTX token easter egg validation first
        if (tokenId == 12) {
            uint256 buffer = tokenData[tokenId].lastPrice * 5 / 100;
            if (msg.value <= tokenData[tokenId].lastPrice + buffer) revert OfferTooLow();
            // Handle easter egg in separate function to avoid reentrancy lock
            _handleEasterEggOffer(tokenId, recipient);
            return;
        }
        
        // Capture old state
        address payable currentOfferer = tokenData[tokenId].offerer;
        uint256 currentOffer = tokenData[tokenId].currentOffer;
        
        // Update all state first
        tokenData[tokenId].offerer = recipient;
        tokenData[tokenId].currentOffer = msg.value;
        
        emit Offer(tokenId, recipient, ownerOf(tokenId), msg.value);

        if (currentOfferer != address(0)) {
            uint256 fee = currentOffer / 100;
            emit Revoke(tokenId, currentOfferer, ownerOf(tokenId), currentOffer, fee);
            
            // External calls after all state changes
            (bool success, ) = currentOfferer.call{value: currentOffer - fee}("");
            require(success, "Failed to return previous offer");
            
            (success, ) = royaltyAddress.call{value: fee}("");
            require(success, "Failed to pay royalties for revoke");
        }
    }

    // New function to handle easter egg token separately
    function _handleEasterEggOffer(uint256 tokenId, address payable recipient) private {
        address owner = ownerOf(tokenId);
        
        // Update state
        tokenData[tokenId].lastPrice = msg.value; // Set as completed price instead of offer
        tokenData[tokenId].currentOffer = 0; // Clear offer since we're doing direct transfer
        tokenData[tokenId].offerer = payable(address(0)); // Clear offerer
        
        emit Offer(tokenId, recipient, owner, msg.value);
        
        // Calculate and pay royalty fee
        uint256 fee = msg.value * royalty / 100;
        uint256 payment = msg.value - fee;
        
        // Pay the owner
        (bool success, ) = payable(owner).call{value: payment}("");
        require(success, "Failed to pay owner");
        
        // Pay royalty
        (success, ) = royaltyAddress.call{value: fee}("");
        require(success, "Failed to pay royalties");
        
        // Handle the transfer directly
        super._setApprovalForAll(owner, recipient, true);
        super.transferFrom(owner, recipient, tokenId); // Use super.transferFrom to skip _payout
        super._setApprovalForAll(owner, recipient, false);
        
        emit Payout(tokenId, recipient, owner, msg.value, fee);
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

    // Add this function after the constructor
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        // Use ownerOf which will revert if token doesn't exist
        ownerOf(tokenId); // This will revert with appropriate message if token doesn't exist
        
        return string(abi.encodePacked(baseURI, "/", Strings.toString(tokenId), baseExtension));
    }

}

