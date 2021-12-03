// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

//  libraries
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

//  helper contracts
import { ODEFIVaultBoosterStorage } from "./ODEFIVaultBoosterStorage.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ExponentialNoError } from "../../dependencies/compound/ExponentialNoError.sol";

//  interfaces
import { IODEFIVaultBooster } from "../../interfaces/opty/IODEFIVaultBooster.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ODEFIVaultBooster Contract
 * @author Opty.fi inspired by Compound.finance
 * @notice Contract for managing the ODEFI rewards
 * @dev Contract contains math for calculating the ODEFI rewards for all the users
 */
contract ODEFIVaultBooster is IODEFIVaultBooster, ODEFIVaultBoosterStorage, ExponentialNoError, Modifiers {
    using SafeERC20 for IERC20;
    using Address for address;

    constructor(address _registry, address _odefi) public Modifiers(_registry) {
        _setODEFIAddress(_odefi);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function claimODEFI(address _holder) external override returns (uint256) {
        address[] memory holders = new address[](1);
        holders[0] = _holder;
        _claimODEFI(holders, allOdefiVaults);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function updateUserStateInVault(address _odefiVault, address _user) external override {
        require(_odefiVault.isContract(), "!isContract");
        if (odefiVaultRatePerSecond[_odefiVault] > 0) {
            odefiUserStateInVault[_odefiVault][_user].index = odefiVaultState[_odefiVault].index;
            odefiUserStateInVault[_odefiVault][_user].timestamp = odefiVaultState[_odefiVault].timestamp;
        }
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function updateOdefiVaultRatePerSecondAndVaultToken(address _odefiVault) external override returns (bool) {
        require(_odefiVault.isContract(), "!isContract");
        if (odefiVaultRatePerSecond[_odefiVault] > 0) {
            odefiVaultRatePerSecondAndVaultToken[_odefiVault] = IERC20(_odefiVault).totalSupply() > 0
                ? div_(mul_(odefiVaultRatePerSecond[_odefiVault], 1e18), IERC20(_odefiVault).totalSupply())
                : uint256(0);
        }
        return true;
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function updateOdefiVaultIndex(address _odefiVault) external override returns (uint224) {
        require(_odefiVault.isContract(), "!isContract");
        if (odefiVaultRatePerSecond[_odefiVault] > 0) {
            if (odefiVaultState[_odefiVault].index == uint224(0)) {
                odefiVaultStartTimestamp[_odefiVault] = _getBlockTimestamp();
                odefiVaultState[_odefiVault].timestamp = uint32(odefiVaultStartTimestamp[_odefiVault]);
                odefiVaultState[_odefiVault].index = uint224(odefiVaultRatePerSecondAndVaultToken[_odefiVault]);
                return odefiVaultState[_odefiVault].index;
            } else {
                uint256 _deltaSeconds = sub_(_getBlockTimestamp(), uint256(odefiVaultState[_odefiVault].timestamp));
                if (_deltaSeconds > 0) {
                    uint256 _deltaSecondsSinceStart = sub_(_getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault]);
                    uint256 _supplyTokens = IERC20(_odefiVault).totalSupply();
                    uint256 _odefiAccrued = mul_(_deltaSeconds, odefiVaultRatePerSecond[_odefiVault]);
                    uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_odefiAccrued, 1e18), _supplyTokens) : uint256(0);
                    uint256 _index =
                        div_(
                            add_(
                                mul_(
                                    odefiVaultState[_odefiVault].index,
                                    sub_(
                                        uint256(odefiVaultState[_odefiVault].timestamp),
                                        odefiVaultStartTimestamp[_odefiVault]
                                    )
                                ),
                                _ratio
                            ),
                            _deltaSecondsSinceStart
                        );
                    odefiVaultState[_odefiVault] = DataTypes.RewardsState({
                        index: safe224(_index, "new index exceeds 224 bits"),
                        timestamp: safe32(_getBlockTimestamp(), "block number exceeds 32 bits")
                    });
                }
                return odefiVaultState[_odefiVault].index;
            }
        }
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function setOdefiVaultRate(address _odefiVault, uint256 _rate) external override returns (bool) {
        require(_odefiVault.isContract(), "!isContract");
        require(msg.sender == rewarders[_odefiVault], "!rewarder");
        odefiVaultRatePerSecond[_odefiVault] = _rate;
        return true;
    }

    function setODEFIRewarder(address _odefiVault, address _rewarder) external onlyOperator returns (bool) {
        require(_odefiVault.isContract(), "!isContract");
        require(_rewarder != address(0), "!_rewarder.address(0)");
        rewarders[_odefiVault] = _rewarder;
        return true;
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function addOdefiVault(address _odefiVault) external override onlyOperator returns (bool) {
        require(_odefiVault.isContract(), "!isContract");
        for (uint256 i = 0; i < allOdefiVaults.length; i++) {
            require(allOdefiVaults[i] != _odefiVault, "odefiVault already added");
        }
        allOdefiVaults.push(_odefiVault);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function setOdefiVault(address _odefiVault, bool _enable) external override onlyOperator returns (bool) {
        require(_odefiVault.isContract(), "!isContract");
        odefiVaultEnabled[_odefiVault] = _enable;
        return true;
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function claimODEFI(address _holder, address[] memory _odefiVaults) external override returns (uint256) {
        address[] memory holders = new address[](1);
        holders[0] = _holder;
        _claimODEFI(holders, _odefiVaults);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function claimODEFI(address[] memory _holders, address[] memory _odefiVaults) external override returns (uint256) {
        _claimODEFI(_holders, _odefiVaults);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function updateUserRewards(address _odefiVault, address _user) public override {
        if (odefiVaultRatePerSecond[_odefiVault] > 0) {
            if (
                IERC20(_odefiVault).balanceOf(_user) > 0 && lastUserUpdate[_odefiVault][_user] != _getBlockTimestamp()
            ) {
                uint256 _deltaSecondsVault = sub_(_getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault]);
                uint256 _deltaSecondsUser;
                if (
                    lastUserUpdate[_odefiVault][_user] != uint256(0) &&
                    lastUserUpdate[_odefiVault][_user] > odefiVaultStartTimestamp[_odefiVault]
                ) {
                    _deltaSecondsUser = sub_(lastUserUpdate[_odefiVault][_user], odefiVaultStartTimestamp[_odefiVault]);
                } else {
                    _deltaSecondsUser = sub_(
                        odefiUserStateInVault[_odefiVault][_user].timestamp,
                        odefiVaultStartTimestamp[_odefiVault]
                    );
                }
                uint256 _userTokens = IERC20(_odefiVault).balanceOf(_user);
                uint256 _currentOdefiVaultIndex = currentOdefiVaultIndex(_odefiVault);
                uint256 _userDelta =
                    mul_(
                        _userTokens,
                        sub_(
                            mul_(_currentOdefiVaultIndex, _deltaSecondsVault),
                            mul_(odefiUserStateInVault[_odefiVault][_user].index, _deltaSecondsUser)
                        )
                    );
                uint256 _userAccrued = add_(odefiAccrued[_user], _userDelta);
                odefiAccrued[_user] = _userAccrued;
            }
            lastUserUpdate[_odefiVault][_user] = _getBlockTimestamp();
        }
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function rewardDepletionSeconds() public view override returns (uint256) {
        uint256 totalOdefiRate;
        for (uint256 i = 0; i < allOdefiVaults.length; i++) {
            add_(totalOdefiRate, odefiVaultRatePerSecond[allOdefiVaults[i]]);
        }
        return div_(balance(), totalOdefiRate);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function claimableODEFI(address _holder, address[] memory _odefiVaults) public view override returns (uint256) {
        uint256 claimableOdefiAmount;
        for (uint256 i = 0; i < _odefiVaults.length; i++) {
            address _odefiVault = _odefiVaults[i];
            if (odefiVaultEnabled[_odefiVault] == true) {
                uint256 _deltaSecondsUser;
                if (
                    lastUserUpdate[_odefiVault][_holder] != uint256(0) &&
                    lastUserUpdate[_odefiVault][_holder] > odefiVaultStartTimestamp[_odefiVault]
                ) {
                    _deltaSecondsUser = sub_(
                        lastUserUpdate[_odefiVault][_holder],
                        odefiVaultStartTimestamp[_odefiVault]
                    );
                } else {
                    _deltaSecondsUser = sub_(
                        odefiUserStateInVault[_odefiVault][_holder].timestamp,
                        odefiVaultStartTimestamp[_odefiVault]
                    );
                }
                uint256 _currentODEFIVaultIndex = currentOdefiVaultIndex(_odefiVault);
                uint256 _userDelta =
                    mul_(
                        IERC20(_odefiVault).balanceOf(_holder),
                        sub_(
                            mul_(
                                _currentODEFIVaultIndex,
                                sub_(_getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault])
                            ),
                            mul_(odefiUserStateInVault[_odefiVault][_holder].index, _deltaSecondsUser)
                        )
                    );
                claimableOdefiAmount = add_(claimableOdefiAmount, _userDelta);
            }
        }
        return div_(add_(claimableOdefiAmount, odefiAccrued[_holder]), 1e18);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function currentOdefiVaultIndex(address _odefiVault) public view override returns (uint256) {
        uint256 _deltaSecondsSinceStart = sub_(_getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault]);
        uint256 _deltaSeconds = sub_(_getBlockTimestamp(), uint256(odefiVaultState[_odefiVault].timestamp));
        uint256 _supplyTokens = IERC20(_odefiVault).totalSupply();
        uint256 _odefiAccrued = mul_(_deltaSeconds, odefiVaultRatePerSecond[_odefiVault]);
        uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_odefiAccrued, 1e18), _supplyTokens) : uint256(0);
        uint256 _index =
            div_(
                add_(
                    mul_(
                        odefiVaultState[_odefiVault].index,
                        sub_(uint256(odefiVaultState[_odefiVault].timestamp), odefiVaultStartTimestamp[_odefiVault])
                    ),
                    _ratio
                ),
                _deltaSecondsSinceStart
            );
        return _index;
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function getOdefiAddress() public view override returns (address) {
        return odefiAddress;
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function claimableODEFI(address _holder) public view override returns (uint256) {
        return claimableODEFI(_holder, allOdefiVaults);
    }

    /**
     * @inheritdoc IODEFIVaultBooster
     */
    function balance() public view override returns (uint256) {
        return IERC20(odefiAddress).balanceOf(address(this));
    }

    /**
     * @notice Claim all odefi accrued by the holders
     * @param _holders The addresses to claim ODEFI for
     * @param _odefiVaults The list of vaults to claim ODEFI in
     * @return _total amount of claimed ODEFI tokens
     */
    function _claimODEFI(address[] memory _holders, address[] memory _odefiVaults) internal returns (uint256 _total) {
        for (uint256 i = 0; i < _odefiVaults.length; i++) {
            address _odefiVault = _odefiVaults[i];
            require(odefiVaultEnabled[_odefiVault], "odefiVault must be enabled");
            for (uint256 j = 0; j < _holders.length; j++) {
                updateUserRewards(address(_odefiVault), _holders[j]);
                uint256 _amount = div_(odefiAccrued[_holders[j]], 1e18);
                odefiAccrued[_holders[j]] = uint256(0);
                IERC20(odefiAddress).safeTransfer(_holders[j], _amount);
                _total = add_(_total, _amount);
            }
        }
    }

    /**
     * @notice Set the ODEFI token's contract address
     * @param _odefi Address of ODEFI Contract
     * @return A boolean value indicating whether the operation succeeded
     */
    function _setODEFIAddress(address _odefi) internal returns (bool) {
        require(_odefi != address(0), "!zeroAddress");
        odefiAddress = _odefi;
        return true;
    }

    /**
     * @notice Get the current block timestamp
     * @return Returns the current block timestamp
     */
    function _getBlockTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }
}
