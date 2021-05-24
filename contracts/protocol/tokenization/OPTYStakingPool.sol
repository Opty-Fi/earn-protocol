// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { SafeERC20, IERC20, SafeMath, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { RiskManager } from "../configuration/RiskManager.sol";
import { OPTYStakingPoolStorage } from "./OPTYStakingPoolStorage.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { OPTYMinter } from "./OPTYMinter.sol";
import { IOPTYStakingRateBalancer } from "../../interfaces/opty/IOPTYStakingRateBalancer.sol";

/**
 * @dev Opty.Fi's Staking Pool contract for OPTY
 */
contract OPTYStakingPool is ERC20, Modifiers, ReentrancyGuard, OPTYStakingPoolStorage {
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
        address _optyMinter,
        uint256 _timelock,
        address _optyStakingRateBalancer,
        string memory _numberOfDays
    )
        public
        ERC20(
            string(abi.encodePacked("opty ", _numberOfDays, " Staking Pool")),
            string(abi.encodePacked("StkOPTY", _numberOfDays))
        )
        Modifiers(_registry)
    {
        setToken(_underlyingToken); /* underlying token contract address (for example DAI) */
        setOPTYMinter(_optyMinter);
        setTimelockPeriod(_timelock);
        setOPTYStakingRateBalancer(_optyStakingRateBalancer);
    }

    modifier onlyStakingRateBalancer() {
        require(msg.sender == optyStakingRateBalancer, "caller is not the optyStakingRateBalancer");
        _;
    }

    function setTimelockPeriod(uint256 _timelock) public onlyOperator returns (bool _success) {
        require(_timelock >= uint256(86400), "Timelock should be at least 1 day.");
        timelockPeriod = _timelock;
        _success = true;
    }

    function setOPTYMinter(address _optyMinter) public onlyOperator returns (bool _success) {
        require(_optyMinter != address(0), "!_optyMinter");
        require(_optyMinter.isContract(), "!_optyMinter.isContract");
        optyMinterContract = OPTYMinter(_optyMinter);
        _success = true;
    }

    function setToken(address _underlyingToken) public onlyOperator returns (bool _success) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        token = _underlyingToken;
        _success = true;
    }

    function setOptyRatePerSecond(uint256 _rate) public onlyStakingRateBalancer returns (bool _success) {
        optyRatePerSecond = _rate;
        _success = true;
    }

    function setOPTYStakingRateBalancer(address _optyStakingRateBalancer) public onlyOperator returns (bool _success) {
        require(_optyStakingRateBalancer.isContract(), "!_optyStakingRateBalancer.isContract");
        optyStakingRateBalancer = _optyStakingRateBalancer;
        _success = true;
    }

    /**
     * @dev Function to get the underlying token balance of OptyPool Contract
     */
    function balance() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function userStakeAll() external returns (bool) {
        _userStake(IERC20(token).balanceOf(msg.sender));
    }

    function userStake(uint256 _amount) external returns (bool) {
        _userStake(_amount);
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
        uint256 _tokenBalance = balance();
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 shares;
        if (_tokenBalance == 0 || totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div((_tokenBalance));
        }
        _mint(msg.sender, shares);
        require(
            IOPTYStakingRateBalancer(optyStakingRateBalancer).updateStakedOPTY(msg.sender, _amount),
            "stakingpool:userStake"
        );
        updatePool();
        userLastUpdate[msg.sender] = getBlockTimestamp();
        _success = true;
    }

    function userUnstakeAll() external returns (bool) {
        _userUnstake(balanceOf(msg.sender));
    }

    function userUnstake(uint256 _redeemAmount) external returns (bool) {
        _userUnstake(_redeemAmount);
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
            IOPTYStakingRateBalancer(optyStakingRateBalancer).updateUnstakedOPTY(msg.sender, _redeemAmount),
            "stakingpool:userUnstake"
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

    function updatePool() public ifNotPaused(address(this)) returns (bool _success) {
        if (lastPoolUpdate == uint256(0)) {
            lastPoolUpdate = getBlockTimestamp();
        } else {
            uint256 _deltaBlocks = getBlockTimestamp().sub(lastPoolUpdate);
            uint256 optyAccrued = _deltaBlocks.mul(optyRatePerSecond);
            lastPoolUpdate = getBlockTimestamp();
            optyMinterContract.mintOpty(address(this), optyAccrued);
        }
        require(IOPTYStakingRateBalancer(optyStakingRateBalancer).updateOptyRates(), "stakingpool:updatePool");
        _success = true;
    }

    function getPricePerFullShare() public view returns (uint256) {
        if (totalSupply() != 0) {
            return balance().div(totalSupply());
        }
        return uint256(0);
    }

    function balanceInOpty(address _user) public view returns (uint256) {
        if (balanceOf(_user) != uint256(0)) {
            uint256 _balanceInOpty =
                balanceOf(_user).mul(balance().add(optyRatePerSecond.mul(getBlockTimestamp().sub(lastPoolUpdate)))).div(
                    totalSupply()
                );
            return _balanceInOpty;
        }
        return uint256(0);
    }

    function getBlockTimestamp() public view returns (uint256) {
        return block.timestamp;
    }

    /* solhint-disable no-empty-blocks */
    function discontinue() public onlyRegistry {}

    function setUnpaused(bool _unpaused) public onlyRegistry {}
    /* solhint-disable no-empty-blocks */
}
