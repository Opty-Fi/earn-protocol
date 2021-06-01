// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { VaultBoosterStorage } from "./VaultBoosterStorage.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ExponentialNoError } from "../../dependencies/compound/ExponentialNoError.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";

contract VaultBooster is VaultBoosterStorage, ExponentialNoError, Modifiers {
    using SafeERC20 for IERC20;

    constructor(address _registry, address _odefi) public Modifiers(_registry) {
        _setODEFIAddress(_odefi);
    }

    /**
     * @notice Claim all the ODEFI accrued by holder in all markets
     * @param _holder The address to claim ODEFI for
     */
    function claimODEFI(address _holder) external returns (uint256) {
        claimODEFI(_holder, allOdefiVaults);
    }

    function updateUserStateInVault(address _odefiVault, address _user) external {
        odefiUserStateInVault[_odefiVault][_user].index = odefiVaultState[_odefiVault].index;
        odefiUserStateInVault[_odefiVault][_user].timestamp = odefiVaultState[_odefiVault].timestamp;
    }

    /**
     * @notice Set the ODEFI rate for a specific pool
     * @return The amount of ODEFI which was NOT transferred to the user
     */
    function updateOdefiVaultRatePerSecondAndVaultToken(address _odefiVault) external returns (bool) {
        odefiVaultRatePerSecondAndVaultToken[_odefiVault] = IERC20(_odefiVault).totalSupply() > 0
            ? div_(mul_(odefiVaultRatePerSecond[_odefiVault], 1e18), IERC20(_odefiVault).totalSupply())
            : uint256(0);
        return true;
    }

    /**
     * @notice Accrue ODEFI to the market by updating the supply index
     * @param _odefiVault The market whose index to update
     */
    function updateOdefiVaultIndex(address _odefiVault) external returns (uint224) {
        if (odefiVaultState[_odefiVault].index == uint224(0)) {
            odefiVaultStartTimestamp[_odefiVault] = getBlockTimestamp();
            odefiVaultState[_odefiVault].timestamp = uint32(odefiVaultStartTimestamp[_odefiVault]);
            odefiVaultState[_odefiVault].index = uint224(odefiVaultRatePerSecondAndVaultToken[_odefiVault]);
            return odefiVaultState[_odefiVault].index;
        } else {
            uint256 _deltaSeconds = sub_(getBlockTimestamp(), uint256(odefiVaultState[_odefiVault].timestamp));
            if (_deltaSeconds > 0) {
                uint256 _deltaSecondsSinceStart = sub_(getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault]);
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
                odefiVaultState[_odefiVault] = DataTypes.ODEFIState({
                    index: safe224(_index, "new index exceeds 224 bits"),
                    timestamp: safe32(getBlockTimestamp(), "block number exceeds 32 bits")
                });
            }
            return odefiVaultState[_odefiVault].index;
        }
    }

    /**
     * @notice Set the ODEFI rate for a specific pool
     * @return The amount of ODEFI which was NOT transferred to the user
     */
    function setRewardRate(address _odefiVault, uint256 _rate) external returns (bool) {
        require(msg.sender == rewarders[_odefiVault], "!rewarder");
        odefiVaultRatePerSecond[_odefiVault] = _rate;
        return true;
    }

    function setRewarder(address _odefiVault, address _rewarder) external onlyOperator returns (bool) {
        rewarders[_odefiVault] = _rewarder;
        return true;
    }

    function addOdefiVault(address _odefiVault) external onlyOperator returns (bool) {
        for (uint256 i = 0; i < allOdefiVaults.length; i++) {
            require(allOdefiVaults[i] != _odefiVault, "odefiVault already added");
        }
        allOdefiVaults.push(_odefiVault);
    }

    function setOdefiVault(address _odefiVault, bool _enable) external onlyOperator returns (bool) {
        odefiVaultEnabled[_odefiVault] = _enable;
        return true;
    }

    function getOdefiAddress() external view returns (address) {
        return odefiAddress;
    }

    function rewardDepletionSeconds(address _odefiVault) external view returns (uint256) {
        return div_(balance(), odefiVaultRatePerSecond[_odefiVault]);
    }

    /**
     * @notice Claim all the odefi accrued by holder in all markets
     * @param _holder The address to claim ODEFI for
     */
    function claimableODEFI(address _holder) external view returns (uint256) {
        return claimableODEFI(_holder, allOdefiVaults);
    }

    /**
     * @notice Claim all the ODEFI accrued by holder in the specified markets
     * @param _holder The address to claim ODEFI for
     * @param _odefiVaults The list of vaults to claim ODEFI in
     */
    function claimODEFI(address _holder, address[] memory _odefiVaults) public returns (uint256) {
        address[] memory holders = new address[](1);
        holders[0] = _holder;
        claimODEFI(holders, _odefiVaults);
    }

    /**
     * @notice Claim all odefi accrued by the holders
     * @param _holders The addresses to claim ODEFI for
     * @param _odefiVaults The list of vaults to claim ODEFI in
     */
    function claimODEFI(address[] memory _holders, address[] memory _odefiVaults) public returns (uint256) {
        uint256 _total;
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
        return _total;
    }

    /**
     * @notice Calculate additional accrued ODEFI for a contributor since last accrual
     * @param _user The address to calculate contributor rewards for
     */
    function updateUserRewards(address _odefiVault, address _user) public {
        if (IERC20(_odefiVault).balanceOf(_user) > 0 && lastUserUpdate[_odefiVault][_user] != getBlockTimestamp()) {
            uint256 _deltaSecondsVault = sub_(getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault]);
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
        lastUserUpdate[_odefiVault][_user] = getBlockTimestamp();
    }

    /**
     * @notice Claim all the odefi accrued by holder in the specified markets
     * @param _holder The address to claim ODEFI for
     * @param _odefiVaults The list of vaults to claim ODEFI in
     */
    function claimableODEFI(address _holder, address[] memory _odefiVaults) public view returns (uint256) {
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
                                sub_(getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault])
                            ),
                            mul_(odefiUserStateInVault[_odefiVault][_holder].index, _deltaSecondsUser)
                        )
                    );
                claimableOdefiAmount = add_(claimableOdefiAmount, _userDelta);
            }
        }
        return div_(add_(claimableOdefiAmount, odefiAccrued[_holder]), 1e18);
    }

    function currentOdefiVaultIndex(address _odefiVault) public view returns (uint256) {
        uint256 _deltaSecondsSinceStart = sub_(getBlockTimestamp(), odefiVaultStartTimestamp[_odefiVault]);
        uint256 _deltaSeconds = sub_(getBlockTimestamp(), uint256(odefiVaultState[_odefiVault].timestamp));
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

    function balance() public view returns (uint256) {
        return IERC20(odefiAddress).balanceOf(address(this));
    }

    function getBlockTimestamp() public view returns (uint256) {
        return block.timestamp;
    }

    function _setODEFIAddress(address _odefi) internal {
        require(_odefi != address(0), "!zeroAddress");
        odefiAddress = _odefi;
    }
}
