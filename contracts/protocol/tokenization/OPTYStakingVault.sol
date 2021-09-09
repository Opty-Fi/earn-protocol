// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// helper contracts
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { OPTYStakingVaultStorage } from "./OPTYStakingVaultStorage.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

// interfaces
import { IOPTYDistributor } from "../../interfaces/opty/IOPTYDistributor.sol";
import { IOPTYStakingRateBalancer } from "../../interfaces/opty/IOPTYStakingRateBalancer.sol";
import { IOPTYStakingVault } from "../../interfaces/opty/IOPTYStakingVault.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title $OPTY staking vault
 * @author opty.fi
 * @notice Implementation of the staking vault
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
        setToken(_underlyingToken); // underlying token like $OPTY
        setTimelockPeriod(_timelock);
    }

    /**
     * @dev Modifier to protect function getting called by caller
     *      other than staking rate balancer contract
     */
    modifier onlyStakingRateBalancer() {
        require(
            msg.sender == registryContract.getOPTYStakingRateBalancer(),
            "caller is not the optyStakingRateBalancer"
        );
        _;
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function setOptyRatePerSecond(uint256 _rate) external override onlyStakingRateBalancer returns (bool) {
        optyRatePerSecond = _rate;
        return true;
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function userStakeAll() external override returns (bool) {
        _userStake(IERC20(token).balanceOf(msg.sender));
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function userStake(uint256 _amount) external override returns (bool) {
        _userStake(_amount);
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function userUnstakeAll() external override returns (bool) {
        _userUnstake(balanceOf(msg.sender));
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function userUnstake(uint256 _redeemAmount) external override returns (bool) {
        _userUnstake(_redeemAmount);
    }

    /* solhint-disable no-empty-blocks */
    function discontinue() external onlyRegistry {}

    function setUnpaused(bool _unpaused) external onlyRegistry {}

    /* solhint-disable no-empty-blocks */

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function getPricePerFullShare() public view override returns (uint256) {
        if (totalSupply() != 0) {
            return balance().div(totalSupply());
        }
        return uint256(0);
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function balanceInOpty(address _user) public view override returns (uint256) {
        if (balanceOf(_user) != uint256(0)) {
            uint256 _balanceInOpty =
                balanceOf(_user).mul(balance().add(optyRatePerSecond.mul(getBlockTimestamp().sub(lastPoolUpdate)))).div(
                    totalSupply()
                );
            return _balanceInOpty;
        }
        return uint256(0);
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function setTimelockPeriod(uint256 _timelock) public override onlyOperator returns (bool) {
        require(_timelock >= uint256(86400), "Timelock should be at least 1 day.");
        timelockPeriod = _timelock;
        return true;
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function setToken(address _underlyingToken) public override onlyOperator returns (bool) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        token = _underlyingToken;
        return true;
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function updatePool() external override returns (bool) {
        _isUnpaused(address(this));
        return _updatePool();
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function balance() public view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @inheritdoc IOPTYStakingVault
     */
    function getBlockTimestamp() public view override returns (uint256) {
        return block.timestamp;
    }

    /**
     * @dev staking OPTY token
     * @param _amount of $OPTY to stake in wei
     * @return _success returns true on successful stake
     */
    function _userStake(uint256 _amount)
        internal
        ifNotPausedAndDiscontinued(address(this))
        nonReentrant
        returns (bool)
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
        _updatePool();
        userLastUpdate[msg.sender] = getBlockTimestamp();
        return true;
    }

    /**
     * @dev Unstake account's previously staked $OPTY
     * @param _redeemAmount Amount of $OPTY to unstake
     * @return _success returns true on successful unstake
     */
    function _userUnstake(uint256 _redeemAmount) internal nonReentrant returns (bool) {
        _isUnpaused(address(this));
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
        require(_updatePool(), "_updatePool");
        uint256 redeemAmountInToken = (balance().mul(_redeemAmount)).div(totalSupply());
        _burn(msg.sender, _redeemAmount);
        if (totalSupply() == 0) {
            lastPoolUpdate = uint256(0);
        }
        IERC20(token).safeTransfer(msg.sender, redeemAmountInToken);
        userLastUpdate[msg.sender] = getBlockTimestamp();
        return true;
    }

    /**
     * @dev Modify the state during stake/unstake of $OPTY
     * @return _success returns true on successful vault update
     */
    function _updatePool() internal returns (bool) {
        if (lastPoolUpdate == uint256(0)) {
            lastPoolUpdate = getBlockTimestamp();
        } else {
            uint256 _deltaBlocks = getBlockTimestamp().sub(lastPoolUpdate);
            uint256 optyAccrued = _deltaBlocks.mul(optyRatePerSecond);
            lastPoolUpdate = getBlockTimestamp();
            IOPTYDistributor _optyDistributorContract = IOPTYDistributor(registryContract.getOPTYDistributor());
            _optyDistributorContract.mintOpty(address(this), optyAccrued);
        }
        require(
            IOPTYStakingRateBalancer(registryContract.getOPTYStakingRateBalancer()).updateOptyRates(),
            "stakingVault:updatePool"
        );
        return true;
    }
}
