// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

// helper contracts
import { ExponentialNoError } from "../../dependencies/compound/ExponentialNoError.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { OPTYDistributorStorage } from "./OPTYDistributorStorage.sol";

// interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IOPTYStakingVault } from "../../interfaces/opty/IOPTYStakingVault.sol";
import { IOPTY } from "../../interfaces/opty/IOPTY.sol";
import { IOPTYDistributor } from "../../interfaces/opty/IOPTYDistributor.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title OPTYDistributor inspired from compound.finance
 * @author opty.fi
 * @notice This contract distributes $OPTY to opty.fi's earn protocol users
 * @dev This contract keeps accounts of, claim and stake $OPTY tokens.
 */

contract OPTYDistributor is IOPTYDistributor, OPTYDistributorStorage, ExponentialNoError, Modifiers {
    constructor(
        address _registry,
        address _opty,
        uint256 _maxUnlockClaimOPTYTimestamp
    ) public Modifiers(_registry) {
        _setOptyAddress(_opty);
        maxUnlockClaimOPTYTimestamp = _maxUnlockClaimOPTYTimestamp;
    }

    /**
     * @dev Modifier to check caller is staking vault or not
     */
    modifier onlyStakingVault() {
        require(stakingVaults[msg.sender] == true, "caller is not a staking vault");
        _;
    }

    /**
     * @dev Modifier to restrict operator to set the token lock
     *      more than current time stamp
     */
    modifier isOperatorTimeLockPeriodEnded() {
        require(
            _getBlockTimestamp() > operatorUnlockClaimOPTYTimestamp,
            "you should wait until operatorUnlockClaimOPTYTimestamp"
        );
        _;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function setOperatorUnlockClaimOPTYTimestamp(uint256 _operatorUnlockClaimOPTYTimestamp)
        external
        override
        onlyOperator
        returns (bool)
    {
        require(
            _operatorUnlockClaimOPTYTimestamp <= maxUnlockClaimOPTYTimestamp,
            "operatorUnlockClaimOPTYTimestamp > maxUnlockClaimOPTYTimestamp"
        );
        operatorUnlockClaimOPTYTimestamp = _operatorUnlockClaimOPTYTimestamp;
        return true;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function setStakingVault(address _stakingVault, bool _enable) external override onlyOperator returns (bool) {
        require(_stakingVault != address(0), "Invalid address");
        stakingVaults[_stakingVault] = _enable;
        return true;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function claimAndStake(address _stakingVault) external override isOperatorTimeLockPeriodEnded {
        address[] memory holders = new address[](1);
        holders[0] = msg.sender;
        uint256 _amount = _claimOpty(holders, allOptyVaults);
        IOPTYStakingVault _optyStakingVaultContract = IOPTYStakingVault(_stakingVault);
        _optyStakingVaultContract.userStake(_amount);
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function claimOpty(address _holder) external override isOperatorTimeLockPeriodEnded returns (uint256) {
        address[] memory holders = new address[](1);
        holders[0] = _holder;
        return _claimOpty(holders, allOptyVaults);
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function claimOpty(address _holder, address[] memory _vaults)
        external
        override
        isOperatorTimeLockPeriodEnded
        returns (uint256)
    {
        address[] memory holders = new address[](1);
        holders[0] = _holder;
        return _claimOpty(holders, _vaults);
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function claimOpty(address[] memory _holders, address[] memory _vaults)
        external
        override
        isOperatorTimeLockPeriodEnded
        returns (uint256)
    {
        return _claimOpty(_holders, _vaults);
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function updateUserStateInVault(address _vault, address _user) external override {
        if (optyVaultRatePerSecond[_vault] > 0) {
            optyUserStateInVault[_vault][_user].index = optyVaultState[_vault].index;
            optyUserStateInVault[_vault][_user].timestamp = optyVaultState[_vault].timestamp;
        }
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function updateOptyVaultRatePerSecondAndVaultToken(address _vault) external override returns (bool) {
        if (optyVaultRatePerSecond[_vault] > 0) {
            optyVaultRatePerSecondAndVaultToken[_vault] = IERC20(_vault).totalSupply() > 0
                ? div_(mul_(optyVaultRatePerSecond[_vault], 1e18), IERC20(_vault).totalSupply())
                : uint256(0);
        }
        return true;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function updateOptyVaultIndex(address _vault) external override returns (uint224) {
        if (optyVaultRatePerSecond[_vault] > 0) {
            if (optyVaultState[_vault].index == uint224(0)) {
                optyVaultStartTimestamp[_vault] = _getBlockTimestamp();
                optyVaultState[_vault].timestamp = uint32(optyVaultStartTimestamp[_vault]);
                optyVaultState[_vault].index = uint224(optyVaultRatePerSecondAndVaultToken[_vault]);
                return optyVaultState[_vault].index;
            } else {
                uint256 _deltaSeconds = sub_(_getBlockTimestamp(), uint256(optyVaultState[_vault].timestamp));
                if (_deltaSeconds > 0) {
                    uint256 _deltaSecondsSinceStart = sub_(_getBlockTimestamp(), optyVaultStartTimestamp[_vault]);
                    uint256 _supplyTokens = IERC20(_vault).totalSupply();
                    uint256 _optyAccrued = mul_(_deltaSeconds, optyVaultRatePerSecond[_vault]);
                    uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_optyAccrued, 1e18), _supplyTokens) : uint256(0);
                    uint256 _index =
                        div_(
                            add_(
                                mul_(
                                    optyVaultState[_vault].index,
                                    sub_(uint256(optyVaultState[_vault].timestamp), optyVaultStartTimestamp[_vault])
                                ),
                                _ratio
                            ),
                            _deltaSecondsSinceStart
                        );
                    optyVaultState[_vault] = DataTypes.RewardsState({
                        index: safe224(_index, "new index exceeds 224 bits"),
                        timestamp: safe32(_getBlockTimestamp(), "block number exceeds 32 bits")
                    });
                }
                return optyVaultState[_vault].index;
            }
        }
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function mintOpty(address _user, uint256 _amount) external override onlyStakingVault returns (uint256) {
        return _mintOpty(_user, _amount);
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function setOptyVaultRate(address _vault, uint256 _rate) external override onlyOperator returns (bool) {
        optyVaultRatePerSecond[_vault] = _rate;
        return true;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function addOptyVault(address _vault) external override onlyOperator returns (bool) {
        for (uint256 i = 0; i < allOptyVaults.length; i++) {
            require(allOptyVaults[i] != _vault, "optyVault already added");
        }
        allOptyVaults.push(_vault);
        return true;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function setOptyVault(address _vault, bool _enable) external override onlyOperator returns (bool) {
        optyVaultEnabled[_vault] = _enable;
        return true;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function claimableOpty(address _holder) external view override returns (uint256) {
        return claimableOpty(_holder, allOptyVaults);
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function updateUserRewards(address _vault, address _user) public override {
        if (optyVaultRatePerSecond[_vault] > 0) {
            if (IERC20(_vault).balanceOf(_user) > 0 && lastUserUpdate[_vault][_user] != _getBlockTimestamp()) {
                uint256 _deltaSecondsVault = sub_(_getBlockTimestamp(), optyVaultStartTimestamp[_vault]);
                uint256 _deltaSecondsUser;
                if (
                    lastUserUpdate[_vault][_user] != uint256(0) &&
                    lastUserUpdate[_vault][_user] > optyVaultStartTimestamp[_vault]
                ) {
                    _deltaSecondsUser = sub_(lastUserUpdate[_vault][_user], optyVaultStartTimestamp[_vault]);
                } else {
                    _deltaSecondsUser = sub_(
                        optyUserStateInVault[_vault][_user].timestamp,
                        optyVaultStartTimestamp[_vault]
                    );
                }
                uint256 _userTokens = IERC20(_vault).balanceOf(_user);
                uint256 _currentOptyVaultIndex = currentOptyVaultIndex(_vault);
                uint256 _userDelta =
                    mul_(
                        _userTokens,
                        sub_(
                            mul_(_currentOptyVaultIndex, _deltaSecondsVault),
                            mul_(optyUserStateInVault[_vault][_user].index, _deltaSecondsUser)
                        )
                    );
                uint256 _userAccrued = add_(optyAccrued[_user], _userDelta);
                optyAccrued[_user] = _userAccrued;
            }
            lastUserUpdate[_vault][_user] = _getBlockTimestamp();
        }
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function getOptyAddress() public view override returns (address) {
        return optyAddress;
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function claimableOpty(address _holder, address[] memory _vaults) public view override returns (uint256) {
        uint256 claimableOptyAmount;
        for (uint256 i = 0; i < _vaults.length; i++) {
            address _vault = _vaults[i];
            if (optyVaultEnabled[_vault] == true) {
                uint256 _deltaSecondsUser;
                if (
                    lastUserUpdate[_vault][_holder] != uint256(0) &&
                    lastUserUpdate[_vault][_holder] > optyVaultStartTimestamp[_vault]
                ) {
                    _deltaSecondsUser = sub_(lastUserUpdate[_vault][_holder], optyVaultStartTimestamp[_vault]);
                } else {
                    _deltaSecondsUser = sub_(
                        optyUserStateInVault[_vault][_holder].timestamp,
                        optyVaultStartTimestamp[_vault]
                    );
                }
                uint256 _currentOptyVaultIndex = currentOptyVaultIndex(_vault);
                uint256 _userDelta =
                    mul_(
                        IERC20(_vault).balanceOf(_holder),
                        sub_(
                            mul_(_currentOptyVaultIndex, sub_(_getBlockTimestamp(), optyVaultStartTimestamp[_vault])),
                            mul_(optyUserStateInVault[_vault][_holder].index, _deltaSecondsUser)
                        )
                    );
                claimableOptyAmount = add_(claimableOptyAmount, _userDelta);
            }
        }
        return div_(add_(claimableOptyAmount, optyAccrued[_holder]), 1e18);
    }

    /**
     * @inheritdoc IOPTYDistributor
     */
    function currentOptyVaultIndex(address _vault) public view override returns (uint256) {
        uint256 _deltaSecondsSinceStart = sub_(_getBlockTimestamp(), optyVaultStartTimestamp[_vault]);
        uint256 _deltaSeconds = sub_(_getBlockTimestamp(), uint256(optyVaultState[_vault].timestamp));
        uint256 _supplyTokens = IERC20(_vault).totalSupply();
        uint256 _optyAccrued = mul_(_deltaSeconds, optyVaultRatePerSecond[_vault]);
        uint256 _ratio = _supplyTokens > 0 ? div_(mul_(_optyAccrued, 1e18), _supplyTokens) : uint256(0);
        return
            div_(
                add_(
                    mul_(
                        optyVaultState[_vault].index,
                        sub_(uint256(optyVaultState[_vault].timestamp), optyVaultStartTimestamp[_vault])
                    ),
                    _ratio
                ),
                _deltaSecondsSinceStart
            );
    }

    /**
     * @notice Transfer OPTY to the user
     * @dev Note: If there is not enough OPTY, we do not perform the transfer at all.
     * @param _user The address of the user to transfer OPTY to
     * @param _amount The amount of OPTY to (possibly) transfer
     * @return _mintAmount The amount of OPTY which was transferred to the user
     */
    function _mintOpty(address _user, uint256 _amount) internal returns (uint256) {
        IOPTY _opty = IOPTY(getOptyAddress());
        require(_amount > 0 && _user != address(0), "Insufficient amount or invalid address");
        _opty.mint(_user, _amount);
        return _amount;
    }

    /**
     * @dev Assign the $OPTY address
     * @param _opty The address of the $OPTY ERC20 token
     */
    function _setOptyAddress(address _opty) internal {
        require(_opty != address(0), "Invalid address");
        optyAddress = _opty;
    }

    /**
     * @notice Claim all opty accrued by the holders
     * @param _holders The addresses to claim OPTY for
     * @param _vaults The list of vaults to claim OPTY in
     * @return _total amount of claimed OPTY tokens
     */
    function _claimOpty(address[] memory _holders, address[] memory _vaults)
        internal
        isOperatorTimeLockPeriodEnded
        returns (uint256 _total)
    {
        for (uint256 i = 0; i < _vaults.length; i++) {
            address _vault = _vaults[i];
            require(optyVaultEnabled[_vault], "optyVault must be enabled");
            for (uint256 j = 0; j < _holders.length; j++) {
                updateUserRewards(address(_vault), _holders[j]);
                uint256 _amount = div_(optyAccrued[_holders[j]], 1e18);
                optyAccrued[_holders[j]] = uint256(0);
                _mintOpty(_holders[j], _amount);
                _total = add_(_total, _amount);
            }
        }
    }

    /**
     * @dev Retrieve the current block timestamp from the chain
     * @return _timestamp current block timestamp in seconds since unix epoch
     */
    function _getBlockTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }
}
