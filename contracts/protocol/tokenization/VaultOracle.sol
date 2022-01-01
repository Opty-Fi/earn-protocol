// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// helper contracts
import { MultiCall } from "../../utils/MultiCall.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { VersionedInitializable } from "../../dependencies/openzeppelin/VersionedInitializable.sol";
import { IncentivisedERC20 } from "./IncentivisedERC20.sol";
import { Modifiers } from "../earn-protocol-configuration/contracts/Modifiers.sol";
import { VaultStorageV2 } from "./VaultStorage.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { DataTypes } from "../earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";
import { Constants } from "../../utils/Constants.sol";
import { Errors } from "../../utils/Errors.sol";
import { StrategyBuilder } from "../configuration/StrategyBuilder.sol";

// interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAdapterFull } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterFull.sol";
import { IVaultOracle } from "../../interfaces/opty/IVaultOracle.sol";
import { IStrategyManager } from "../../interfaces/opty/IStrategyManager.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import {
    IInvestStrategyRegistry
} from "../earn-protocol-configuration/contracts/interfaces/opty/IInvestStrategyRegistry.sol";
import { IRiskManager } from "../earn-protocol-configuration/contracts/interfaces/opty/IRiskManager.sol";
import { IHarvestCodeProvider } from "../team-defi-adapters/contracts/1_ethereum/interfaces/IHarvestCodeProvider.sol";

/**
 * @title Vault contract inspired by AAVE V2's AToken.sol
 * @author opty.fi
 * @notice Implementation of the risk specific interest bearing vault
 */

contract VaultOracle is
    VersionedInitializable,
    IVaultOracle,
    IncentivisedERC20,
    MultiCall,
    Modifiers,
    ReentrancyGuard,
    VaultStorageV2
{
    using SafeERC20 for IERC20;
    using Address for address;
    using StrategyBuilder for DataTypes.StrategyStep[];

    /**
     * @dev The version of the Vault business logic
     */
    uint256 public constant opTOKEN_REVISION = 0x3;

    /* solhint-disable no-empty-blocks */
    constructor(
        address _registry,
        string memory _name,
        string memory _symbol,
        string memory _riskProfileName,
        string memory _riskProfileSymbol
    )
        public
        IncentivisedERC20(
            string(abi.encodePacked("op ", _name, " ", _riskProfileName)),
            string(abi.encodePacked("op", _symbol, _riskProfileSymbol))
        )
        Modifiers(_registry)
    {}

    /* solhint-enable no-empty-blocks */

    /**
     * @dev Initialize the vault
     * @param _registry the address of registry for helping get the protocol configuration
     * @param _underlyingToken The address of underlying asset of this vault
     * @param _name The name of the underlying asset
     * @param _symbol The symbol of the underlying  asset
     * @param _riskProfileCode Risk profile code of this vault
     */
    function initialize(
        address _registry,
        address _underlyingToken,
        string memory _name,
        string memory _symbol,
        uint256 _riskProfileCode
    ) external virtual initializer {
        require(bytes(_name).length > 0, "e1");
        require(bytes(_symbol).length > 0, "e2");
        registryContract = IRegistry(_registry);
        setRiskProfileCode(_riskProfileCode);
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        _setName(string(abi.encodePacked("op ", _name, " ", registryContract.getRiskProfile(_riskProfileCode).name)));
        _setSymbol(string(abi.encodePacked("op", _symbol, registryContract.getRiskProfile(_riskProfileCode).symbol)));
        _setDecimals(IncentivisedERC20(_underlyingToken).decimals());
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external override onlyGovernance {
        maxVaultValueJump = _maxVaultValueJump;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setDepositFeeFlatUT(uint256 _depositFeeFlatUT) external override onlyGovernance {
        depositFeeFlatUT = _depositFeeFlatUT;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setDepositFeePct(uint256 _depositFeePct) external override onlyGovernance {
        depositFeePct = _depositFeePct;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setWithdrawalFeeFlatUT(uint256 _withdrawalFeeFlatUT) external override onlyGovernance {
        withdrawalFeeFlatUT = _withdrawalFeeFlatUT;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setWithdrawalFeePct(uint256 _withdrawalFeePct) external override onlyGovernance {
        withdrawalFeePct = _withdrawalFeePct;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function harvest(bytes32 _investStrategyHash) external override onlyOperator {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _harvest(_investStrategyHash, _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function discontinue() external override onlyRegistry {
        _withdrawAll(registryContract.getStrategyManager());
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setUnpaused(bool _unpaused) external override onlyRegistry {
        if (!_unpaused) {
            _withdrawAll(registryContract.getStrategyManager());
        }
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function balance() public view override returns (uint256) {
        return _balance();
    }

    /**
     * @inheritdoc IVaultOracle
     * @notice read-only function to compute price per share of the vault
     *         Note : This function does not add amount of underlying tokens that
     *         are available in protocols like compound and Curve when reward tokens
     *         are claimed and swapped into vault's underlying token. If the protocol of the current
     *         strategy of the vault allows to read unclaimed reward token for free then a
     *         read call to this function shall add amount of underlying token available when
     *         unclaimed tokens are swapped into vault's underlying token.
     */
    function getPricePerFullShare() public view override returns (uint256) {
        if (totalSupply() != 0) {
            return
                _oraVaultValueInUnderlyingToken(registryContract.getStrategyManager()).mul(Constants.WEI_DECIMAL).div(
                    totalSupply()
                );
        } else {
            return uint256(0);
        }
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setRiskProfileCode(uint256 _riskProfileCode) public override onlyOperator {
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        require(_riskProfile.exists, "e3");
        riskProfileCode = _riskProfileCode;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setToken(address _underlyingToken) public override onlyOperator {
        require(_underlyingToken.isContract(), "e4");
        require(registryContract.isApprovedToken(_underlyingToken), "e5");
        underlyingToken = _underlyingToken;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) public view override returns (bool) {
        return (_diff.mul(10000)).div(_currentVaultValue) < maxVaultValueJump;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function adminCall(bytes[] memory _codes) external override onlyOperator {
        executeCodes(_codes, "e6");
    }

    /**
     * @dev Redeem all the assets deployed in the current vault invest strategy
     * @param _strategyManager StrategyManager contract address
     */
    function _withdrawAll(address _strategyManager) internal {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            uint256 _steps = IStrategyManager(_strategyManager).getWithdrawAllStepsCount(investStrategyHash);
            for (uint256 _i; _i < _steps; _i++) {
                uint256 _iterator = _steps - 1 - _i;
                executeCodes(
                    IStrategyManager(_strategyManager).getPoolWithdrawAllCodes(
                        payable(address(this)),
                        underlyingToken,
                        investStrategyHash,
                        _iterator,
                        _steps
                    ),
                    "e8"
                );
            }
        }
    }

    /**
     * @notice Perform vault reward strategy
     * @dev claim and swap the earned rewards into underlying asset
     * @param _investStrategyHash the current vault invest strategy
     * @param _vaultStrategyConfiguration the configuration for executing vault invest strategy
     */
    function _harvest(
        bytes32 _investStrategyHash,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal {
        address _rewardToken =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getRewardToken(_investStrategyHash);
        if (_rewardToken != address(0)) {
            // means rewards exists
            address[] memory _vaultRewardTokens = new address[](2);
            _vaultRewardTokens[0] = address(this);
            _vaultRewardTokens[1] = _rewardToken;
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolClaimAllRewardCodes(
                    payable(address(this)),
                    _investStrategyHash
                ),
                "e9"
            );
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolHarvestSomeRewardCodes(
                    payable(address(this)),
                    underlyingToken,
                    _investStrategyHash,
                    IRiskManager(_vaultStrategyConfiguration.riskManager).getVaultRewardTokenStrategy(
                        _vaultRewardTokens
                    )
                ),
                "e10"
            );
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getAddLiquidityCodes(
                    payable(address(this)),
                    underlyingToken,
                    _investStrategyHash
                ),
                "e11"
            );
        }
    }

    function _beforeTokenTransfer(
        address from,
        address,
        uint256
    ) internal override {
        // TODO VT can only be transferred to whitelisted users
        executeCodes(
            IStrategyManager(registryContract.getStrategyManager()).getUpdateUserRewardsCodes(address(this), from),
            "e21"
        );
        executeCodes(
            IStrategyManager(registryContract.getStrategyManager()).getUpdateRewardVaultRateAndIndexCodes(
                address(this)
            ),
            "e16"
        );
        executeCodes(
            IStrategyManager(registryContract.getStrategyManager()).getUpdateUserStateInVaultCodes(
                address(this),
                msg.sender
            ),
            "e17"
        );
    }

    /**
     * @dev This function computes the market value of shares
     * @param _strategyManager address of strategy manager contracts
     * @return _vaultValue the market value of the shares
     */
    function _oraVaultValueInUnderlyingToken(address _strategyManager) internal view returns (uint256 _vaultValue) {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            uint256 balanceInUnderlyingToken =
                IStrategyManager(_strategyManager).getBalanceInUnderlyingToken(
                    payable(address(this)),
                    underlyingToken,
                    investStrategyHash
                );
            _vaultValue = balanceInUnderlyingToken.add(_balance()).sub(depositQueue);
        } else {
            _vaultValue = _balance().sub(depositQueue);
        }
    }

    /**
     * @dev Internal function to get the underlying token balance of vault
     * @return underlying asset balance in this vault
     */
    function _balance() internal view returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }

    function getRevision() internal pure virtual override returns (uint256) {
        return opTOKEN_REVISION;
    }

    /**
     * @dev A helper function to calculate the absolute difference
     * @param _a value
     * @param _b value
     * @return _result absolute difference between _a and _b
     */
    function _abs(uint256 _a, uint256 _b) internal pure returns (uint256) {
        return _a > _b ? _a.sub(_b) : _b.sub(_a);
    }

    /**
     * @notice It checks the min/max balance of the first transaction of the current block
     *         with the value from the previous block.
     *         It is not a protection against flash loan attacks rather just an arbitrary sanity check.
     * @dev Mechanism to restrict the vault value deviating from maxVaultValueJump
     * @param _vaultValue The underlying token balance in the vault
     */
    function _emergencyBrake(uint256 _vaultValue) private {
        uint256 _blockTransactions = blockToBlockVaultValues[block.number].length;
        if (_blockTransactions > 0) {
            blockToBlockVaultValues[block.number].push(
                DataTypes.BlockVaultValue({
                    actualVaultValue: _vaultValue,
                    blockMinVaultValue: _vaultValue <
                        blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMinVaultValue
                        ? _vaultValue
                        : blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMinVaultValue,
                    blockMaxVaultValue: _vaultValue >
                        blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMaxVaultValue
                        ? _vaultValue
                        : blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMaxVaultValue
                })
            );
            require(
                isMaxVaultValueJumpAllowed(
                    _abs(
                        blockToBlockVaultValues[block.number][_blockTransactions].blockMinVaultValue,
                        blockToBlockVaultValues[block.number][_blockTransactions].blockMaxVaultValue
                    ),
                    _vaultValue
                ),
                "e23"
            );
        } else {
            blockToBlockVaultValues[block.number].push(
                DataTypes.BlockVaultValue({
                    actualVaultValue: _vaultValue,
                    blockMinVaultValue: _vaultValue,
                    blockMaxVaultValue: _vaultValue
                })
            );
        }
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function userDepositVault(uint256 _userDepositUT) external override nonReentrant {
        uint256 _oraBalanceUT = _oraVaultValueInUnderlyingToken(registryContract.getStrategyManager());
        // check balance before user token transfer
        uint256 _balanceBeforeUT = _balance();
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _userDepositUT);
        // check balance after user token transfer
        uint256 _balanceAfterUT = _balance();
        uint256 _actualDepositAmountUT = _balanceAfterUT.sub(_balanceBeforeUT);
        uint256 _depositFeeUT = calcDepositFeeUT(_actualDepositAmountUT);
        require(
            userDepositPermitted(msg.sender, _actualDepositAmountUT.sub(_depositFeeUT)),
            Errors.USER_DEPOSIT_NOT_PERMITTED
        );
        // transfer deposit fee to vaultFeeAddress
        if (_depositFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(vaultFeeAddress, _depositFeeUT);
        }
        if (_oraBalanceUT == 0) {
            _mint(msg.sender, _actualDepositAmountUT);
        } else {
            _mint(msg.sender, (_actualDepositAmountUT.mul(totalSupply())).div(_oraBalanceUT));
        }
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function userWithdrawVault(uint256 _userWithdrawVT) external override nonReentrant {
        uint256 _userBalanceVT = balanceOf(msg.sender);
        require(_userWithdrawVT > 0 && _userWithdrawVT <= _userBalanceVT, Errors.USER_WITHDRAW_NOT_PERMITTED);
        uint256 _oraBalanceUT = _oraVaultValueInUnderlyingToken(registryContract.getStrategyManager());
        uint256 _oraUserAmountUT = _oraBalanceUT.mul(_userWithdrawVT).div(totalSupply());
        _burn(msg.sender, _userWithdrawVT);
        uint256 _vaultBalanceUT = _balance();
        if (_vaultBalanceUT < _oraUserAmountUT) {
            uint256 _withdrawAmountUT = _oraUserAmountUT.sub(_vaultBalanceUT);
            // executeCodes();
        }
        uint256 _withdrawFeeUT = calcWithdrawalFeeUT(_oraUserAmountUT);
        // transfer withdraw fee to vaultFeeAddress
        if (_withdrawFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(vaultFeeAddress, _withdrawFeeUT);
        }
        IERC20(underlyingToken).safeTransfer(msg.sender, _oraUserAmountUT.sub(_withdrawFeeUT));
    }

    function vaultDepositToStrategy() public {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            (, DataTypes.StrategyStep[] memory _strategySteps) =
                IInvestStrategyRegistry(registryContract.getInvestStrategyRegistry()).getStrategy(investStrategyHash);
            uint256 _internalTransactionCount =
                _strategySteps.getDepositInternalTransactionCount(address(registryContract));
            uint256 _initialStepInputAmountUT = _balance();
            for (uint256 _i; _i < _internalTransactionCount; _i++) {
                executeCodes(
                    (
                        _strategySteps.getPoolDepositCodes(
                            DataTypes.StrategyConfigurationParams({
                                registryContract: address(registryContract),
                                vault: payable(address(this)),
                                underlyingToken: underlyingToken,
                                initialStepInputAmount: _initialStepInputAmountUT,
                                internalTransactionIndex: _i,
                                internalTransactionCount: _internalTransactionCount
                            })
                        )
                    ),
                    Errors.VAULT_DEPOSIT_ERROR
                );
            }
        }
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function rebalance() external override {
        bytes32 _nextBestInvestStrategyHash = getNextBestStrategy();
        if (_nextBestInvestStrategyHash != investStrategyHash) {
            // withdraw
            investStrategyHash = _nextBestInvestStrategyHash;
            vaultDepositToStrategy();
        }
        if (_balance() > 0) {
            vaultDepositToStrategy();
        }
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function userDepositPermitted(address _user, uint256 _userDepositUT) public view override returns (bool) {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(address(this));
        uint256 _userMinimumDepositLimitUT = _vaultConfiguration.minimumDepositAmount;
        if (_userDepositUT > 0 && _userDepositUT < _userMinimumDepositLimitUT) {
            return false;
        }
        uint256 _vaultTVLCapUT = _vaultConfiguration.totalValueLockedLimitInUnderlying;
        uint256 _vaultTVLUT = _oraVaultValueInUnderlyingToken(registryContract.getStrategyManager());
        if (_vaultTVLUT.add(_userDepositUT) > _vaultTVLCapUT) {
            return false;
        }
        bool _userDepositCapState = _vaultConfiguration.isLimitedState;
        uint256 _userDepositCapUT = _vaultConfiguration.userDepositCap;
        uint256 _userDepositsSumUT = totalDeposits[_user];
        if (_userDepositCapState && _userDepositsSumUT.add(_userDepositUT) > _userDepositCapUT) {
            return false;
        }
        return true;
    }

    /**
     * @notice Computes deposit fee in underlying
     * @dev
     * @param _userDepositUT user deposit amount in underlying
     * @return deposit fee in underlying
     */
    function calcDepositFeeUT(uint256 _userDepositUT) public view returns (uint256) {
        return ((_userDepositUT.mul(depositFeePct)).div(10000)).add(depositFeeFlatUT);
    }

    /**
     * @notice Computes withdrawal fee in underlying
     * @param _userWithdrawUT user withdraw amount in underlying
     * @return _withdrawalFeeUT withdrawal fee in underlying
     */
    function calcWithdrawalFeeUT(uint256 _userWithdrawUT) public view returns (uint256) {
        return ((_userWithdrawUT.mul(withdrawalFeePct)).div(10000)).add(withdrawalFeeFlatUT);
    }

    /**
     * @notice Returns next best invest strategy that the vault will execute on next rebalance
     * @return the bytes32 hash of the invest strategy
     */
    function getNextBestStrategy() public view returns (bytes32) {
        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = underlyingToken;
        return IRiskManager(registryContract.getRiskManager()).getBestStrategy(riskProfileCode, _underlyingTokens);
    }

    function getLastStrategyStepBalanceLP() public view returns (uint256) {
        (, DataTypes.StrategyStep[] memory _strategySteps) =
            IInvestStrategyRegistry(registryContract.getInvestStrategyRegistry()).getStrategy(investStrategyHash);
        return
            _strategySteps.getLastStrategyStepBalanceLP(
                address(registryContract),
                payable(address(this)),
                underlyingToken
            );
    }

    function _withdraw(uint256 _amountLP) internal {}

    /**
     * @dev Redeem some the assets deployed in the current vault invest strategy
     * @param _strategyManager StrategyManager contract address
     */
    // function _withdrawSome(address _strategyManager) internal {
    //     if (investStrategyHash != Constants.ZERO_BYTES32) {
    //         uint256 _steps = IStrategyManager(_strategyManager).getWithdrawStepsCount(investStrategyHash);
    //         for (uint256 _i; _i < _steps; _i++) {
    //             uint256 _iterator = _steps - 1 - _i;
    //             executeCodes(
    //                 IStrategyManager(_strategyManager).getPoolWithdrawSomeCodes(
    //                     payable(address(this)),
    //                     underlyingToken,
    //                     investStrategyHash,
    //                     _iterator,
    //                     _steps
    //                 ),
    //                 Errors.VAULT_DEPOSIT_SOME_ERROR
    //             );
    //         }
    //     }
    // }
}
