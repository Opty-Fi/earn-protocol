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
import { StrategyManager } from "../lib/StrategyManager.sol";
import { MerkleProof } from "@openzeppelin/contracts/cryptography/MerkleProof.sol";

// interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IVault } from "../../interfaces/opty/IVault.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import { IRiskManager } from "../earn-protocol-configuration/contracts/interfaces/opty/IRiskManager.sol";

import "hardhat/console.sol";

/**
 * @title Vault contract inspired by AAVE V2's AToken.sol
 * @author opty.fi
 * @notice Implementation of the risk specific interest bearing vault
 */

contract Vault is
    VersionedInitializable,
    IVault,
    IncentivisedERC20,
    MultiCall,
    Modifiers,
    ReentrancyGuard,
    VaultStorageV2
{
    using SafeERC20 for IERC20;
    using Address for address;
    using StrategyManager for DataTypes.StrategyStep[];

    /**
     * @dev The version of the Vault business logic
     */
    uint256 public constant opTOKEN_REVISION = 0x3;

    //===Constructor===//

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

    //===External functions===//

    /**
     * @dev Initialize the vault
     * @param _registry the address of registry for helping get the protocol configuration
     * @param _underlyingTokensHash The keccak256 hash of the tokens and chain id
     * @param _name The name of the underlying asset
     * @param _symbol The symbol of the underlying  asset
     * @param _riskProfileCode Risk profile code of this vault
     */
    function initialize(
        address _registry,
        bytes32 _underlyingTokensHash,
        string memory _name,
        string memory _symbol,
        uint256 _riskProfileCode
    ) external virtual initializer {
        require(bytes(_name).length > 0, Errors.EMPTY_STRING);
        require(bytes(_symbol).length > 0, Errors.EMPTY_STRING);
        registryContract = IRegistry(_registry);
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        _setRiskProfileCode(_riskProfileCode, _riskProfile.exists);
        _setUnderlyingTokensHash(_underlyingTokensHash);
        _setName(string(abi.encodePacked("op ", _name, " ", _riskProfile.name)));
        _setSymbol(string(abi.encodePacked("op", _symbol, _riskProfile.symbol)));
        _setDecimals(IncentivisedERC20(underlyingToken).decimals());
    }

    /**
     * @inheritdoc IVault
     */
    function setRiskProfileCode(uint256 _riskProfileCode) external override onlyGovernance {
        _setRiskProfileCode(_riskProfileCode, registryContract.getRiskProfile(_riskProfileCode).exists);
    }

    /**
     * @inheritdoc IVault
     */
    function setUnderlyingTokensHash(bytes32 _underlyingTokensHash) external override onlyOperator {
        _setUnderlyingTokensHash(_underlyingTokensHash);
    }

    /**
     * @inheritdoc IVault
     */
    function setValueControlParams(
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT
    ) external override onlyFinanceOperator {
        _setUserDepositCapUT(_userDepositCapUT);
        _setMinimumDepositValueUT(_minimumDepositValueUT);
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setVaultConfiguration(uint256 _vaultConfiguration) external override onlyGovernance {
        vaultConfiguration = _vaultConfiguration;
    }

    /**
     * @inheritdoc IVault
     */
    function setUserDepositCapUT(uint256 _userDepositCapUT) external override onlyFinanceOperator {
        _setUserDepositCapUT(_userDepositCapUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setMinimumDepositValueUT(uint256 _minimumDepositValueUT) external override onlyFinanceOperator {
        _setMinimumDepositValueUT(_minimumDepositValueUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) external override onlyFinanceOperator {
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setWhitelistedAccountsRoot(bytes32 _whitelistedAccountsRoot) external override onlyGovernance {
        whitelistedAccountsRoot = _whitelistedAccountsRoot;
    }

    /**
     * @inheritdoc IVault
     */
    function setWhitelistedCodesRoot(bytes32 _whitelistedCodesRoot) external override onlyGovernance {
        whitelistedCodesRoot = _whitelistedCodesRoot;
    }

    /**
     * @inheritdoc IVault
     */
    function setEmergencyShutdown(bool _active) external override onlyGovernance {
        vaultConfiguration = vaultConfiguration & 0xFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        if (_active) {
            vaultConfiguration =
                vaultConfiguration |
                0x0100000000000000000000000000000000000000000000000000000000000000;
            if (investStrategyHash != Constants.ZERO_BYTES32) {
                _vaultWithdrawAllFromStrategy(investStrategySteps);
                investStrategyHash = Constants.ZERO_BYTES32;
                delete investStrategySteps;
            }
        }
        emit LogEmergencyShutdown((vaultConfiguration & (1 << 248)) != 0, msg.sender);
    }

    /**
     * @inheritdoc IVault
     */
    function setUnpaused(bool _unpaused) external override onlyGovernance {
        vaultConfiguration = (vaultConfiguration & 0xFDFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
        if (!_unpaused) {
            if (investStrategyHash != Constants.ZERO_BYTES32) {
                _vaultWithdrawAllFromStrategy(investStrategySteps);
                investStrategyHash = Constants.ZERO_BYTES32;
                delete investStrategySteps;
            }
        } else {
            vaultConfiguration =
                0x0200000000000000000000000000000000000000000000000000000000000000 |
                vaultConfiguration;
        }
        emit LogUnpause((vaultConfiguration & (1 << 249)) != 0, msg.sender);
    }

    /**
     * @inheritdoc IVault
     */
    function rebalance() external override {
        (bool _vaultDepositPermitted, string memory _vaultDepositPermittedReason) = vaultDepositPermitted();
        require(_vaultDepositPermitted, _vaultDepositPermittedReason);
        (bool _vaultWithdrawPermitted, string memory _vaultWithdrawPermittedReason) = vaultWithdrawPermitted();
        require(_vaultWithdrawPermitted, _vaultWithdrawPermittedReason);
        _setCacheNextInvestStrategySteps(getNextBestInvestStrategy());
        bytes32 _nextBestInvestStrategyHash = computeInvestStrategyHash(_cacheNextInvestStrategySteps);
        if (_nextBestInvestStrategyHash != investStrategyHash) {
            if (investStrategyHash != Constants.ZERO_BYTES32) {
                _vaultWithdrawAllFromStrategy(investStrategySteps);
            }
            // _setInvestStrategySteps
            delete investStrategySteps;
            for (uint256 _i; _i < _cacheNextInvestStrategySteps.length; _i++) {
                investStrategySteps.push(_cacheNextInvestStrategySteps[_i]);
            }
            investStrategyHash = _nextBestInvestStrategyHash;
        }
        uint256 _balanceUT = balanceUT();
        if (investStrategyHash != Constants.ZERO_BYTES32 && _balanceUT > 0) {
            _vaultDepositToStrategy(investStrategySteps, _balanceUT);
        }
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositVault(
        uint256 _userDepositUT,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external override nonReentrant {
        {
            (bool _vaultDepositPermitted, string memory _vaultDepositPermittedReason) = vaultDepositPermitted();
            require(_vaultDepositPermitted, _vaultDepositPermittedReason);
        }
        _emergencyBrake(_oraStratValueUT());
        // check vault + strategy balance (in UT) before user token transfer
        uint256 _oraVaultAndStratValuePreDepositUT = _oraVaultAndStratValueUT();
        // check vault balance (in UT) before user token transfer
        uint256 _vaultValuePreDepositUT = balanceUT();
        // receive user deposit
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _userDepositUT);
        // check balance after user token transfer
        uint256 _vaultValuePostDepositUT = balanceUT();
        // only count the actual deposited tokens received into vault
        uint256 _actualDepositAmountUT = _vaultValuePostDepositUT.sub(_vaultValuePreDepositUT);
        // remove deposit fees (if any) but only if deposit is accepted
        // if deposit is not accepted, the entire transaction should revert
        uint256 _depositFeeUT = calcDepositFeeUT(_actualDepositAmountUT);
        uint256 _netUserDepositUT = _actualDepositAmountUT.sub(_depositFeeUT);
        _checkUserDeposit(msg.sender, false, _netUserDepositUT, _depositFeeUT, _accountsProof, _codesProof);
        // add net deposit amount to user's total deposit
        totalDeposits[msg.sender] = totalDeposits[msg.sender].add(_netUserDepositUT);
        // transfer deposit fee to vaultFeeCollector
        if (_depositFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(address(uint160(vaultConfiguration >> 80)), _depositFeeUT);
        }
        // mint vault tokens
        // if _oraVaultAndStratValuePreDepositUT == 0 or totalSupply == 0, mint vault tokens 1:1 for underlying tokens
        // else, mint vault tokens at constant pre deposit price
        // e.g. if pre deposit price > 1, minted vault tokens < deposited underlying tokens
        //      if pre deposit price < 1, minted vault tokens > deposited underlying tokens
        if (_oraVaultAndStratValuePreDepositUT == 0 || totalSupply() == 0) {
            _mint(msg.sender, _netUserDepositUT);
        } else {
            _mint(msg.sender, (_netUserDepositUT.mul(totalSupply())).div(_oraVaultAndStratValuePreDepositUT));
        }
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawVault(
        uint256 _userWithdrawVT,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external override nonReentrant {
        {
            (bool _vaultWithdrawPermitted, string memory _vaultWithdrawPermittedReason) = vaultWithdrawPermitted();
            require(_vaultWithdrawPermitted, _vaultWithdrawPermittedReason);
        }
        _emergencyBrake(_oraStratValueUT());
        _checkUserWithdraw(msg.sender, _userWithdrawVT, _accountsProof, _codesProof);
        // burning should occur at pre userwithdraw price UNLESS there is slippage
        // if there is slippage, the withdrawing user should absorb that cost (see below)
        // i.e. get less underlying tokens than calculated by pre userwithdraw price
        uint256 _oraUserWithdrawUT = _userWithdrawVT.mul(_oraVaultAndStratValueUT()).div(totalSupply());
        _burn(msg.sender, _userWithdrawVT);

        uint256 _vaultValuePreStratWithdrawUT = balanceUT();

        // if vault does not have sufficient UT, we need to withdraw from strategy
        if (_vaultValuePreStratWithdrawUT < _oraUserWithdrawUT) {
            // withdraw UT shortage from strategy
            uint256 _expectedStratWithdrawUT = _oraUserWithdrawUT.sub(_vaultValuePreStratWithdrawUT);

            uint256 _oraAmountLP =
                investStrategySteps.getOraSomeValueLP(
                    address(registryContract),
                    underlyingToken,
                    _expectedStratWithdrawUT
                );

            _vaultWithdrawSomeFromStrategy(investStrategySteps, _oraAmountLP);

            // Identify Slippage
            // UT requested from strategy withdraw  = _expectedStratWithdrawUT
            // UT actually received from strategy withdraw
            // = _receivedStratWithdrawUT
            // = _vaultValuePostStratWithdrawUT.sub(_vaultValuePreStratWithdrawUT)
            // slippage = _expectedStratWithdrawUT - _receivedStratWithdrawUT
            uint256 _vaultValuePostStratWithdrawUT = balanceUT();
            uint256 _receivedStratWithdrawUT = _vaultValuePostStratWithdrawUT.sub(_vaultValuePreStratWithdrawUT); // 440

            // If slippage occurs, reduce _oraUserWithdrawUT by slippage amount
            if (_receivedStratWithdrawUT < _expectedStratWithdrawUT) {
                _oraUserWithdrawUT = _oraUserWithdrawUT.sub(_expectedStratWithdrawUT.sub(_receivedStratWithdrawUT));
            }
        }
        uint256 _withdrawFeeUT = calcWithdrawalFeeUT(_oraUserWithdrawUT);
        // transfer withdraw fee to vaultFeeCollector
        if (_withdrawFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(address(uint160(vaultConfiguration >> 80)), _withdrawFeeUT);
        }
        IERC20(underlyingToken).safeTransfer(msg.sender, _oraUserWithdrawUT.sub(_withdrawFeeUT));
    }

    /**
     * @inheritdoc IVault
     */
    function vaultDepositAllToStrategy() external override {
        (bool _vaultDepositPermitted, string memory _vaultDepositPermittedReason) = vaultDepositPermitted();
        require(_vaultDepositPermitted, _vaultDepositPermittedReason);
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _vaultDepositToStrategy(investStrategySteps, balanceUT());
        }
    }

    /**
     * @inheritdoc IVault
     */
    function adminCall(bytes[] memory _codes) external override onlyOperator {
        executeCodes(_codes, Errors.ADMIN_CALL);
    }

    //===Public view functions===//

    /**
     * @inheritdoc IVault
     */
    function balanceUT() public view override returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }

    /**
     * @inheritdoc IVault
     */
    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) public view override returns (bool) {
        return (_diff.mul(10000)).div(_currentVaultValue) < ((vaultConfiguration >> 64) & 0xFFFF);
    }

    /**
     * @inheritdoc IVault
     */
    function getPricePerFullShare() public view override returns (uint256) {
        if (totalSupply() != 0) {
            return _oraVaultAndStratValueUT().mul(Constants.WEI_DECIMAL).div(totalSupply());
        } else {
            return uint256(0);
        }
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositPermitted(
        address _user,
        bool _addUserDepositUT,
        uint256 _userDepositUTWithDeductions,
        uint256 _deductions,
        bytes32[] memory _accountsProof,
        bytes32[] memory _codesProof
    ) public view override returns (bool, string memory) {
        if ((vaultConfiguration & (1 << 250)) != 0 && !_verifyWhitelistedAccount(_accountLeaf(_user), _accountsProof)) {
            return (false, Errors.EOA_NOT_WHITELISTED);
        }
        //solhint-disable-next-line avoid-tx-origin
        if (_user != tx.origin && !_noGreyList(_user, _accountsProof, _codesProof)) {
            return (false, Errors.CA_NOT_WHITELISTED);
        }
        if (_userDepositUTWithDeductions < minimumDepositValueUT) {
            return (false, Errors.MINIMUM_USER_DEPOSIT_VALUE_UT);
        }
        uint256 _oraVaultAndStratValueUT = _oraVaultAndStratValueUT();
        if (!_addUserDepositUT && _oraVaultAndStratValueUT.sub(_deductions) > totalValueLockedLimitUT) {
            return (false, Errors.TOTAL_VALUE_LOCKED_LIMIT_UT);
        } else if (_oraVaultAndStratValueUT.add(_userDepositUTWithDeductions) > totalValueLockedLimitUT) {
            return (false, Errors.TOTAL_VALUE_LOCKED_LIMIT_UT);
        }
        if (totalDeposits[_user].add(_userDepositUTWithDeductions) > userDepositCapUT) {
            return (false, Errors.USER_DEPOSIT_CAP_UT);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVault
     */
    function vaultDepositPermitted() public view override returns (bool, string memory) {
        if (!((vaultConfiguration & (1 << 249)) != 0)) {
            return (false, Errors.VAULT_PAUSED);
        }
        if ((vaultConfiguration & (1 << 248)) != 0) {
            return (false, Errors.VAULT_EMERGENCY_SHUTDOWN);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawPermitted(
        address _user,
        uint256 _userWithdrawVT,
        bytes32[] memory _accountsProof,
        bytes32[] memory _codesProof
    ) public view override returns (bool, string memory) {
        if ((vaultConfiguration & (1 << 250)) != 0 && !_verifyWhitelistedAccount(_accountLeaf(_user), _accountsProof)) {
            return (false, Errors.EOA_NOT_WHITELISTED);
        }
        //solhint-disable-next-line avoid-tx-origin
        if (_user != tx.origin && !_noGreyList(_user, _accountsProof, _codesProof)) {
            return (false, Errors.CA_NOT_WHITELISTED);
        }
        // require: 0 < withdrawal amount in vault tokens < user's vault token balance
        if (!((vaultConfiguration & (1 << 249)) != 0)) {
            return (false, Errors.VAULT_PAUSED);
        }
        if (!(_userWithdrawVT > 0 && _userWithdrawVT <= balanceOf(_user))) {
            return (false, Errors.USER_WITHDRAW_INSUFFICIENT_VT);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVault
     */
    function vaultWithdrawPermitted() public view override returns (bool, string memory) {
        if (!((vaultConfiguration & (1 << 249)) != 0)) {
            return (false, Errors.VAULT_PAUSED);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVault
     */
    function calcDepositFeeUT(uint256 _userDepositUT) public view override returns (uint256) {
        return
            ((_userDepositUT.mul((vaultConfiguration >> 16) & 0xFFFF)).div(10000)).add(
                (vaultConfiguration & 0xFFFF) * 10**uint256(decimals())
            );
    }

    /**
     * @inheritdoc IVault
     */
    function calcWithdrawalFeeUT(uint256 _userWithdrawUT) public view override returns (uint256) {
        return
            ((_userWithdrawUT.mul((vaultConfiguration >> 48) & 0xFFFF)).div(10000)).add(
                ((vaultConfiguration >> 32) & 0xFFFF) * 10**uint256(decimals())
            );
    }

    /**
     * @inheritdoc IVault
     */
    function getNextBestInvestStrategy() public view override returns (DataTypes.StrategyStep[] memory) {
        return
            IRiskManager(registryContract.getRiskManager()).getBestStrategy(
                uint256(uint8(vaultConfiguration >> 240)),
                underlyingTokensHash
            );
    }

    /**
     * @inheritdoc IVault
     */
    function getLastStrategyStepBalanceLP(DataTypes.StrategyStep[] memory _investStrategySteps)
        public
        view
        override
        returns (uint256)
    {
        return
            _investStrategySteps.getLastStrategyStepBalanceLP(
                address(registryContract),
                payable(address(this)),
                underlyingToken
            );
    }

    /**
     * @inheritdoc IVault
     */
    function getInvestStrategySteps() public view override returns (DataTypes.StrategyStep[] memory) {
        return investStrategySteps;
    }

    /**
     * @dev function to compute the keccak256 hash of the strategy steps
     * @param _investStrategySteps metadata for invest strategy
     * @return keccak256 hash of the invest strategy and underlying tokens hash
     */
    function computeInvestStrategyHash(DataTypes.StrategyStep[] memory _investStrategySteps)
        public
        view
        returns (bytes32)
    {
        if (_investStrategySteps.length > 0) {
            bytes32[] memory hashes = new bytes32[](_investStrategySteps.length);
            for (uint256 _i; _i < _investStrategySteps.length; _i++) {
                hashes[_i] = keccak256(
                    abi.encodePacked(
                        _investStrategySteps[_i].pool,
                        _investStrategySteps[_i].outputToken,
                        _investStrategySteps[_i].isBorrow
                    )
                );
            }
            return keccak256(abi.encodePacked(underlyingTokensHash, hashes));
        }
        return Constants.ZERO_BYTES32;
    }

    //===Internal functions===//

    /**
     * @dev Internal function to deposit some balance of underlying token from current strategy
     * @param _investStrategySteps array of strategy step tuple
     * @param _depositValueUT amount in underlying token
     */
    function _vaultDepositToStrategy(DataTypes.StrategyStep[] memory _investStrategySteps, uint256 _depositValueUT)
        internal
    {
        uint256 _internalTransactionCount =
            _investStrategySteps.getDepositInternalTransactionCount(address(registryContract));
        console.log("_investStrategySteps.pool ", _investStrategySteps[_investStrategySteps.length - 1].pool);
        for (uint256 _i; _i < _internalTransactionCount; _i++) {
            executeCodes(
                (
                    _investStrategySteps.getPoolDepositCodes(
                        DataTypes.StrategyConfigurationParams({
                            registryContract: address(registryContract),
                            vault: payable(address(this)),
                            underlyingToken: underlyingToken,
                            initialStepInputAmount: _depositValueUT,
                            internalTransactionIndex: _i,
                            internalTransactionCount: _internalTransactionCount
                        })
                    )
                ),
                Errors.VAULT_DEPOSIT
            );
        }
    }

    /**
     * @dev Internal function to withdraw all investments from current strategy
     * @param _investStrategySteps array of strategy step tuple
     */
    function _vaultWithdrawAllFromStrategy(DataTypes.StrategyStep[] memory _investStrategySteps) internal {
        _vaultWithdrawSomeFromStrategy(_investStrategySteps, getLastStrategyStepBalanceLP(_investStrategySteps));
    }

    /**
     * @dev Internal function to withdraw some investments from current strategy
     * @param _investStrategySteps array of strategy step tuple
     * @param _withdrawAmountLP amount in lpToken
     */
    function _vaultWithdrawSomeFromStrategy(
        DataTypes.StrategyStep[] memory _investStrategySteps,
        uint256 _withdrawAmountLP
    ) internal {
        uint256 _internalWithdrawTransactionCount = _investStrategySteps.length;
        for (uint256 _i; _i < _internalWithdrawTransactionCount; _i++) {
            executeCodes(
                _investStrategySteps.getPoolWithdrawCodes(
                    DataTypes.StrategyConfigurationParams({
                        registryContract: address(registryContract),
                        vault: payable(address(this)),
                        underlyingToken: underlyingToken,
                        initialStepInputAmount: _withdrawAmountLP,
                        internalTransactionIndex: _internalWithdrawTransactionCount - 1 - _i,
                        internalTransactionCount: _internalWithdrawTransactionCount
                    })
                ),
                Errors.VAULT_WITHDRAW
            );
        }
    }

    /**
     * @inheritdoc IncentivisedERC20
     */
    function _beforeTokenTransfer(
        address,
        address _to,
        uint256
    ) internal override {
        require(_to != address(this), Errors.TRANSFER_TO_THIS_CONTRACT);
    }

    /**
     * @dev Internal function to set the maximum amount in underlying token
     *      that a user could deposit in entire life cycle of this vault
     * @param _userDepositCapUT maximum amount in underlying allowed to be deposited by user
     */
    function _setUserDepositCapUT(uint256 _userDepositCapUT) internal {
        userDepositCapUT = _userDepositCapUT;
        emit LogUserDepositCapUT(userDepositCapUT, msg.sender);
    }

    /**
     * @dev Internal function to set minimum amount in underlying token required
     *      to be deposited by the user
     * @param _minimumDepositValueUT minimum deposit value in underlying token required
     */
    function _setMinimumDepositValueUT(uint256 _minimumDepositValueUT) internal {
        minimumDepositValueUT = _minimumDepositValueUT;
        emit LogMinimumDepositValueUT(minimumDepositValueUT, msg.sender);
    }

    /**
     * @dev Internal function to set the total value locked limit in underlying token
     * @param _totalValueLockedLimitUT maximum TVL in underlying allowed for the vault
     */
    function _setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) internal {
        totalValueLockedLimitUT = _totalValueLockedLimitUT;
        emit LogTotalValueLockedLimitUT(totalValueLockedLimitUT, msg.sender);
    }

    /**
     * @dev Internal function for caching the next invest strategy metadata
     * @param _investStrategySteps list strategy steps
     */
    function _setCacheNextInvestStrategySteps(DataTypes.StrategyStep[] memory _investStrategySteps) internal {
        delete _cacheNextInvestStrategySteps;
        for (uint256 _i; _i < _investStrategySteps.length; _i++) {
            _cacheNextInvestStrategySteps.push(_investStrategySteps[_i]);
        }
    }

    /**
     * @dev Internal function to save risk profile code
     * @param _riskProfileCode risk profile code
     * @param _exists true if risk profile exists
     */
    function _setRiskProfileCode(uint256 _riskProfileCode, bool _exists) internal {
        require(_exists, Errors.RISK_PROFILE_EXISTS);
        vaultConfiguration =
            (_riskProfileCode << 240) |
            (vaultConfiguration & 0xFF00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
    }

    /**
     * @dev Internal function to save underlying tokens hash
     * @param _underlyingTokensHash keccak256 hash of underlying token address and chain id
     */
    function _setUnderlyingTokensHash(bytes32 _underlyingTokensHash) internal {
        address[] memory _tokens = registryContract.getTokensHashToTokenList(_underlyingTokensHash);
        require(_tokens.length == 1, Errors.UNDERLYING_TOKENS_HASH_EXISTS);
        require(registryContract.isApprovedToken(_tokens[0]), Errors.UNDERLYING_TOKEN_APPROVED);
        underlyingTokensHash = _underlyingTokensHash;
        underlyingToken = _tokens[0];
    }

    //===Internal view functions===//

    /**
     * @dev Computes the vault value in underlying token that includes balance of underlying token
     *      in vault and that of investment made in the strategy
     * @return amount in underlying token
     */
    function _oraVaultAndStratValueUT() internal view returns (uint256) {
        return _oraStratValueUT().add(balanceUT());
    }

    /**
     * @dev Computes the amount in underlying token for the investment made in strategy
     * @return amount in underlying token
     */
    function _oraStratValueUT() internal view returns (uint256) {
        // totaldebt
        return
            investStrategyHash != Constants.ZERO_BYTES32
                ? investStrategySteps.getOraValueUT(address(registryContract), payable(address(this)), underlyingToken)
                : 0;
    }

    /**
     * @dev Internal function to compute the hash of the smart contract code
     * @param _account account address
     * @return _hash bytes32 hash of the smart contract code
     */
    function _getContractHash(address _account) internal view returns (bytes32 _hash) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            _hash := extcodehash(_account)
        }
    }

    /**
     * @dev Internal function to compute whether smart contract is grey listed or not
     * @param _account account address
     * @return false if contract account is allowed to interact, true otherwise
     */
    function _noGreyList(
        address _account,
        bytes32[] memory _accountsProof,
        bytes32[] memory _codesProof
    ) internal view returns (bool) {
        return
            _verifyWhitelistedAccount(_accountLeaf(_account), _accountsProof) &&
            _verifyWhitelistedCode(_codeLeaf(_getContractHash(_account)), _codesProof);
    }

    function _verifyWhitelistedAccount(bytes32 _leaf, bytes32[] memory _proof) internal view returns (bool) {
        return MerkleProof.verify(_proof, whitelistedAccountsRoot, _leaf);
    }

    function _verifyWhitelistedCode(bytes32 _leaf, bytes32[] memory _proof) internal view returns (bool) {
        return MerkleProof.verify(_proof, whitelistedCodesRoot, _leaf);
    }

    /**
     * @dev internal function to check whether a user can deposit or not
     * @param _user address of the depositor
     * @param _addUserDepositUT whether to add _userDepositUT while
     *         checking for TVL limit reached.
     * @param _userDepositUTWithDeductions actual deposit amount after deducting
     *        third party transfer fees and deposit fees if any
     * @param _deductions amount in underlying token to not consider in as a part of
     *       user deposit amount
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     */
    function _checkUserDeposit(
        address _user,
        bool _addUserDepositUT,
        uint256 _userDepositUTWithDeductions,
        uint256 _deductions,
        bytes32[] memory _accountsProof,
        bytes32[] memory _codesProof
    ) internal view {
        (bool _userDepositPermitted, string memory _userDepositPermittedReason) =
            userDepositPermitted(
                _user,
                _addUserDepositUT,
                _userDepositUTWithDeductions,
                _deductions,
                _accountsProof,
                _codesProof
            );
        require(_userDepositPermitted, _userDepositPermittedReason);
    }

    /**
     * @dev internal function to decide whether user can withdraw or not
     * @param _user account address of the user
     * @param _userWithdrawVT amount of vault tokens to burn
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     */
    function _checkUserWithdraw(
        address _user,
        uint256 _userWithdrawVT,
        bytes32[] memory _accountsProof,
        bytes32[] memory _codesProof
    ) internal view {
        (bool _userWithdrawPermitted, string memory _userWithdrawPermittedReason) =
            userWithdrawPermitted(_user, _userWithdrawVT, _accountsProof, _codesProof);
        require(_userWithdrawPermitted, _userWithdrawPermittedReason);
    }

    //===Internal pure functions===//

    /**
     * @inheritdoc VersionedInitializable
     */
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
     * @dev internal helper function to return a merkle tree leaf hash for account
     * @param _account account address
     * @return account leaf hash
     */
    function _accountLeaf(address _account) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_account));
    }

    /**
     * @dev internal helper function to return a merkle tree leaf hash for codes
     * @param _hash codehash
     * @return code leaf hash
     */
    function _codeLeaf(bytes32 _hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_hash));
    }

    //===Private functions===//

    /**
     * @notice It checks the min/max balance of the first transaction of the current block
     *         with the value from the previous block.
     *         It is not a protection against flash loan attacks rather just an arbitrary sanity check.
     * @dev Mechanism to restrict the vault value deviating from maxVaultValueJump
     * @param _vaultValue The value of vault in underlying token
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
                Errors.EMERGENCY_BRAKE
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
}
