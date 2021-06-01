// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { SafeERC20, IERC20, SafeMath, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { OPTYStakingVaultStorage } from "./OPTYStakingVaultStorage.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { IOPTYMinter } from "../../interfaces/opty/IOPTYMinter.sol";
import { IOPTYStakingRateBalancer } from "../../interfaces/opty/IOPTYStakingRateBalancer.sol";
import { IOPTYStakingVault } from "../../interfaces/opty/IOPTYStakingVault.sol";

/**
 * @dev Opty.Fi's Staking Vault contract for OPTY
 */
contract OPTYStakingVault is IOPTYStakingVault, ERC20, Modifiers, ReentrancyGuard, OPTYStakingVaultStorage {
    using SafeERC20 for IERC20;
    using Address for address;

    /**
     * @dev
     *  - Constructor used to initialise the Opty.Fi token name, symbol, decimals for token (for example DAI)
     *  - Storing the underlying token contract address (for example DAI)
     */
    constructor(
        address _registry,
        address _underlyingToken,
        uint256 _timelock,
        string memory _numberOfDays
    )
        public
        ERC20(
            string(abi.encodePacked("opty ", _numberOfDays, " Staking Vault")),
            string(abi.encodePacked("StkOPTY", _numberOfDays))
        )
        Modifiers(_registry)
    {
        setToken(_underlyingToken); /* underlying token contract address (for example DAI) */
        setTimelockPeriod(_timelock);
    }

    modifier onlyStakingRateBalancer() {
        require(
            msg.sender == registryContract.getOPTYStakingRateBalancer(),
            "caller is not the optyStakingRateBalancer"
        );
        _;
    }

    function setOptyRatePerSecond(uint256 _rate) external override onlyStakingRateBalancer returns (bool _success) {
        optyRatePerSecond = _rate;
        _success = true;
    }

    function userStakeAll() external override returns (bool) {
        _userStake(IERC20(token).balanceOf(msg.sender));
    }

    function userStake(uint256 _amount) external override returns (bool) {
        _userStake(_amount);
    }

    function userUnstakeAll() external override returns (bool) {
        _userUnstake(balanceOf(msg.sender));
    }

    function userUnstake(uint256 _redeemAmount) external override returns (bool) {
        _userUnstake(_redeemAmount);
    }

    /* solhint-disable no-empty-blocks */
    function discontinue() external onlyRegistry {}

    function setUnpaused(bool _unpaused) external onlyRegistry {}

    /* solhint-disable no-empty-blocks */

    function getPricePerFullShare() external view override returns (uint256) {
        if (totalSupply() != 0) {
            return balance().div(totalSupply());
        }
        return uint256(0);
    }

    function balanceInOpty(address _user) external view override returns (uint256) {
        if (balanceOf(_user) != uint256(0)) {
            uint256 _balanceInOpty =
                balanceOf(_user).mul(balance().add(optyRatePerSecond.mul(getBlockTimestamp().sub(lastPoolUpdate)))).div(
                    totalSupply()
                );
            return _balanceInOpty;
        }
        return uint256(0);
    }

    function setTimelockPeriod(uint256 _timelock) public override onlyOperator returns (bool _success) {
        require(_timelock >= uint256(86400), "Timelock should be at least 1 day.");
        timelockPeriod = _timelock;
        _success = true;
    }

    function setToken(address _underlyingToken) public override onlyOperator returns (bool _success) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        token = _underlyingToken;
        _success = true;
    }

    function updatePool() public override ifNotPaused(address(this)) returns (bool _success) {
        if (lastPoolUpdate == uint256(0)) {
            lastPoolUpdate = getBlockTimestamp();
        } else {
            uint256 _deltaBlocks = getBlockTimestamp().sub(lastPoolUpdate);
            uint256 optyAccrued = _deltaBlocks.mul(optyRatePerSecond);
            lastPoolUpdate = getBlockTimestamp();
            IOPTYMinter _optyMinterContract = IOPTYMinter(registryContract.getOptyMinter());
            _optyMinterContract.mintOpty(address(this), optyAccrued);
        }
        require(
            IOPTYStakingRateBalancer(registryContract.getOPTYStakingRateBalancer()).updateOptyRates(),
            "stakingVault:updatePool"
        );
        _success = true;
    }

    /**
     * @dev Function to get the underlying token balance of OptyPool Contract
     */
    function balance() public view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getBlockTimestamp() public view override returns (uint256) {
        return block.timestamp;
    }

    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function _userStake(uint256 _amount)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        require(_amount > 0, "!(_amount>0)");
        uint256 _tokenBalanceBefore = balance();
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _tokenBalanceAfter = balance();
        uint256 _tokenBalanceDiff = _tokenBalanceAfter.sub(_tokenBalanceBefore);
        uint256 shares;
        if (_tokenBalanceBefore == 0 || totalSupply() == 0) {
            shares = _tokenBalanceDiff;
        } else {
            shares = (_tokenBalanceDiff.mul(totalSupply())).div((_tokenBalanceBefore));
        }
        _mint(msg.sender, shares);
        require(
            IOPTYStakingRateBalancer(registryContract.getOPTYStakingRateBalancer()).updateStakedOPTY(
                msg.sender,
                _tokenBalanceDiff
            ),
            "stakingVault:userStake"
        );
        updatePool();
        userLastUpdate[msg.sender] = getBlockTimestamp();
        _success = true;
    }

    /**
     * @dev Function to queu withdraw of the lp tokens from the liquidity pool (for example opDAI)
     *
     * Requirements:
     *  -   contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the  liquidity pool. Its uints are:
     *      in  weth uints i.e. 1e18
     */
    function _userUnstake(uint256 _redeemAmount)
        internal
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        require(
            getBlockTimestamp().sub(userLastUpdate[msg.sender]) > timelockPeriod,
            "you can't unstake until timelockPeriod has ended"
        );
        require(_redeemAmount > 0, "!_redeemAmount>0");
        require(
            IOPTYStakingRateBalancer(registryContract.getOPTYStakingRateBalancer()).updateUnstakedOPTY(
                msg.sender,
                _redeemAmount
            ),
            "stakingVault:userUnstake"
        );
        updatePool();
        uint256 redeemAmountInToken = (balance().mul(_redeemAmount)).div(totalSupply());
        _burn(msg.sender, _redeemAmount);
        if (totalSupply() == 0) {
            lastPoolUpdate = uint256(0);
        }
        IERC20(token).safeTransfer(msg.sender, redeemAmountInToken);
        userLastUpdate[msg.sender] = getBlockTimestamp();
        _success = true;
    }
}
