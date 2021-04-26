// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../libraries/SafeERC20.sol";
import "./ERC20.sol";

contract OpenDefiVault is ERC20 {
    using SafeERC20 for IERC20;
    using Address for address;
    
    uint256 public constant opTOKEN_REVISION = 0x1;
    address public underlyingToken; //  store the underlying token contract address (for example DAI)
    
    constructor(
        address _underlyingToken
    )
        public
        ERC20(
            string(abi.encodePacked("op ", ERC20(_underlyingToken).name(), " Open", " Vault")),
            string(abi.encodePacked("op", ERC20(_underlyingToken).symbol(), "OpenVault"))
        )
    {
        
    }
    
    function getRevision() internal pure virtual returns (uint256) {
        return opTOKEN_REVISION;
    }
    
    function initialize(
        address _underlyingToken
    ) external virtual {
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        _setName(string(abi.encodePacked("op ", ERC20(_underlyingToken).name(), " Open", " Vault")));
        _setSymbol(string(abi.encodePacked("op", ERC20(_underlyingToken).symbol(), "OpenVault")));
        _setDecimals(ERC20(_underlyingToken).decimals());
    }

    function setToken(address _underlyingToken) public returns (bool _success) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        underlyingToken = _underlyingToken;
        _success = true;
    }

    /**
     * @dev Function to get the underlying token balance of OptyVault Contract
     */
    function balance() public view returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }
    
    function userDeposit(uint256 _amount) public returns (bool _success) {
        require(_amount > 0, "!(_amount>0)");
        uint256 _tokenBalance = balance();
        uint256 shares = 0;

        if (_tokenBalance == 0 || totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div((_tokenBalance));
        }
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, shares);
        return true;
    }
}