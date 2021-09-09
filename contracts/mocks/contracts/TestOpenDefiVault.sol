// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { SafeERC20, IERC20, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ODEFIVaultBooster } from "../../protocol/partnership/ODEFIVaultBooster.sol";
import { IncentivisedERC20 } from "../../protocol/tokenization/IncentivisedERC20.sol";

contract TestOpenDefiVault is IncentivisedERC20 {
    using SafeERC20 for IERC20;
    using Address for address;

    uint256 public constant opTOKEN_REVISION = 0x1;
    address public underlyingToken; //  store the underlying token contract address (for example DAI)
    ODEFIVaultBooster public odefiVaultBoosterContract;

    /* solhint-disable no-empty-blocks */
    constructor(address _underlyingToken)
        public
        IncentivisedERC20(
            string(abi.encodePacked("op ", ERC20(_underlyingToken).name(), " Open", " Vault")),
            string(abi.encodePacked("op", ERC20(_underlyingToken).symbol(), "OpenVault"))
        )
    {}

    /* solhint-disable no-empty-blocks */

    function initialize(address _underlyingToken, address _odefiVaultBoosterContract) external virtual {
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        _setName(string(abi.encodePacked("op ", ERC20(_underlyingToken).name(), " Open", " Vault")));
        _setSymbol(string(abi.encodePacked("op", ERC20(_underlyingToken).symbol(), "OpenVault")));
        _setDecimals(ERC20(_underlyingToken).decimals());
        odefiVaultBoosterContract = ODEFIVaultBooster(_odefiVaultBoosterContract);
    }

    function userDeposit(uint256 _amount) external returns (bool) {
        require(_amount > 0, "!(_amount>0)");
        uint256 _tokenBalance = balance();
        uint256 shares = 0;

        if (_tokenBalance == 0 || totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div((_tokenBalance));
        }
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        odefiVaultBoosterContract.updateUserRewards(address(this), msg.sender);
        _mint(msg.sender, shares);
        odefiVaultBoosterContract.updateOdefiVaultRatePerSecondAndVaultToken(address(this));
        odefiVaultBoosterContract.updateOdefiVaultIndex(address(this));
        odefiVaultBoosterContract.updateUserStateInVault(address(this), msg.sender);
        return true;
    }

    function setToken(address _underlyingToken) public returns (bool) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        underlyingToken = _underlyingToken;
        return true;
    }

    /**
     * @dev Function to get the underlying token balance of OptyVault Contract
     */
    function balance() public view returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }

    function getRevision() internal pure virtual returns (uint256) {
        return opTOKEN_REVISION;
    }
}
