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
import { IVaultV2 } from "../../interfaces/opty/IVaultV2.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import {
    IInvestStrategyRegistry
} from "../earn-protocol-configuration/contracts/interfaces/opty/IInvestStrategyRegistry.sol";
import { IRiskManager } from "../earn-protocol-configuration/contracts/interfaces/opty/IRiskManager.sol";

/**
 * @title Vault contract inspired by AAVE V2's AToken.sol
 * @author opty.fi
 * @notice Implementation of the risk specific interest bearing vault
 */

// TODO :

contract VaultV2 is
    VersionedInitializable,
    IVaultV2,
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
     * @param _underlyingToken The address of underlying asset of this vault
     * @param _underlyingTokensHash The keccak256 hash of the tokens and chain id
     * @param _name The name of the underlying asset
     * @param _symbol The symbol of the underlying  asset
     * @param _riskProfileCode Risk profile code of this vault
     */
    function initialize(
        address _registry,
        address _underlyingToken,
        bytes32 _underlyingTokensHash,
        string memory _name,
        string memory _symbol,
        uint256 _riskProfileCode
    ) external virtual initializer {
        require(bytes(_name).length > 0, Errors.EMPTY_STRING);
        require(bytes(_symbol).length > 0, Errors.EMPTY_STRING);
        registryContract = IRegistry(_registry);
        setRiskProfileCode(_riskProfileCode);
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        underlyingTokensHash = _underlyingTokensHash;
        _setName(string(abi.encodePacked("op ", _name, " ", registryContract.getRiskProfile(_riskProfileCode).name)));
        _setSymbol(string(abi.encodePacked("op", _symbol, registryContract.getRiskProfile(_riskProfileCode).symbol)));
        _setDecimals(IncentivisedERC20(_underlyingToken).decimals());
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setVaultConfiguration(
        bool _allowWhitelistedState,
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT,
        uint256 _maxVaultValueJump,
        uint256 _depositFeeFlatUT,
        uint256 _depositFeePct,
        uint256 _withdrawalFeeFlatUT,
        uint256 _withdrawalFeePct,
        address _vaultFeeAddress
    ) external override onlyFinanceOperator {
        _setAllowWhitelistedState(_allowWhitelistedState);
        _setUserDepositCapUT(_userDepositCapUT);
        _setMinimumDepositValueUT(_minimumDepositValueUT);
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
        _setMaxVaultValueJump(_maxVaultValueJump);
        _setDepositFeeFlatUT(_depositFeeFlatUT);
        _setDepositFeePct(_depositFeePct);
        _setWithdrawalFeeFlatUT(_withdrawalFeeFlatUT);
        _setWithdrawalFeePct(_withdrawalFeePct);
        _setVaultFeeAddress(_vaultFeeAddress);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external override onlyFinanceOperator {
        _setMaxVaultValueJump(_maxVaultValueJump);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setDepositFeeFlatUT(uint256 _depositFeeFlatUT) external override onlyFinanceOperator {
        _setDepositFeeFlatUT(_depositFeeFlatUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setDepositFeePct(uint256 _depositFeePct) external override onlyFinanceOperator {
        _setDepositFeePct(_depositFeePct);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setWithdrawalFeeFlatUT(uint256 _withdrawalFeeFlatUT) external override onlyFinanceOperator {
        _setWithdrawalFeeFlatUT(_withdrawalFeeFlatUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setWithdrawalFeePct(uint256 _withdrawalFeePct) external override onlyFinanceOperator {
        _setWithdrawalFeePct(_withdrawalFeePct);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setVaultFeeAddress(address _vaultFeeAddress) external override onlyOperator {
        _setVaultFeeAddress(_vaultFeeAddress);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setAllowWhitelistedState(bool _allowWhitelistedState) external override onlyOperator {
        _setAllowWhitelistedState(_allowWhitelistedState);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setUserDepositCapUT(uint256 _userDepositCapUT) external override onlyOperator {
        _setUserDepositCapUT(_userDepositCapUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setMinimumDepositValueUT(uint256 _minimumDepositValueUT) external override onlyOperator {
        _setMinimumDepositValueUT(_minimumDepositValueUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) external override onlyOperator {
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function discontinue() external override onlyOperator {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _vaultWithdrawAllFromStrategy(getStrategySteps(investStrategyHash));
        }
        vaultConfiguration.discontinued = true;
        investStrategyHash = Constants.ZERO_BYTES32;
        LogDiscontinue(vaultConfiguration.discontinued, msg.sender);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setUnpaused(bool _unpaused) external override onlyOperator {
        if (investStrategyHash != Constants.ZERO_BYTES32 && _unpaused == false) {
            _vaultWithdrawAllFromStrategy(getStrategySteps(investStrategyHash));
            investStrategyHash = Constants.ZERO_BYTES32;
        }
        if (_unpaused == true) {
            investStrategyHash = getNextBestStrategy();
            _vaultDepositAllToStrategy(getStrategySteps(investStrategyHash));
        }
        vaultConfiguration.unpaused = _unpaused;
    }

    /**
     * @inheritdoc IVaultV2
     */
    function rebalance() external override {
        (bool _vaultDepositPermitted, string memory _vaultDepositPermittedReason) = vaultDepositPermitted();
        require(_vaultDepositPermitted, _vaultDepositPermittedReason);
        (bool _vaultWithdrawPermitted, string memory _vaultWithdrawPermittedReason) = vaultWithdrawPermitted();
        require(_vaultWithdrawPermitted, _vaultWithdrawPermittedReason);
        bytes32 _nextBestInvestStrategyHash = getNextBestStrategy();
        bool _deposited;
        if (_nextBestInvestStrategyHash != investStrategyHash && investStrategyHash != Constants.ZERO_BYTES32) {
            _vaultWithdrawAllFromStrategy(getStrategySteps(investStrategyHash));
            investStrategyHash = _nextBestInvestStrategyHash;
            if (investStrategyHash != Constants.ZERO_BYTES32) {
                _vaultDepositAllToStrategy(getStrategySteps(investStrategyHash));
                _deposited = true;
            }
        }
        // _balance() might be greater than zero if the adapter limited the investment
        // _deposited is to protect vault from depositing again in to strategy.
        if (!_deposited && _balance() > 0) {
            _vaultDepositAllToStrategy(getStrategySteps(investStrategyHash));
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function userDepositVault(uint256 _userDepositUT) external override nonReentrant {
        // check vault + strategy balance (in UT) before user token transfer
        uint256 _oraVaultAndStratValuePreDepositUT = _oraVaultAndStratValueUT();
        uint256 _oraPricePerSharePreDeposit = _oraVaultAndStratValuePreDepositUT.div(totalSupply());
        // check vault balance (in UT) before user token transfer
        uint256 _vaultValuePreDepositUT = _balance();
        // receive user deposit
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _userDepositUT);
        // check balance after user token transfer
        uint256 _vaultValuePostDepositUT = _balance();
        // only count the actual deposited tokens received into vault
        uint256 _actualDepositAmountUT = _vaultValuePostDepositUT.sub(_vaultValuePreDepositUT);
        // remove deposit fees (if any) but only if deposit is accepted
        // if deposit is not accepted, the entire transaction should revert
        uint256 _depositFeeUT = calcDepositFeeUT(_actualDepositAmountUT);
        (bool _vaultDepositPermitted, string memory _vaultDepositPermittedReason) = vaultDepositPermitted();
        require(_vaultDepositPermitted, _vaultDepositPermittedReason);
        (bool _userDepositPermitted, string memory _userDepositPermittedReason) =
            userDepositPermitted(msg.sender, _actualDepositAmountUT.sub(_depositFeeUT));
        require(_userDepositPermitted, _userDepositPermittedReason);
        // transfer deposit fee to vaultFeeAddress
        if (_depositFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(vaultConfiguration.vaultFeeAddress, _depositFeeUT);
        }

        // mint vault tokens
        // if _oraVaultAndStratValuePreDepositUT == 0, mint vault tokens 1:1 for underlying tokens
        // if _oraVaultAndStratValuePreDepositUT > 0, mint vault tokens at constant pre deposit price
        // e.g. if pre deposit price > 1, minted vault tokens < deposited underlying tokens
        //      if pre deposit price < 1, minted vault tokens > deposited underlying tokens
        if (_oraVaultAndStratValuePreDepositUT == 0) {
            _mint(msg.sender, _actualDepositAmountUT);
        } else {
            _mint(msg.sender, (_actualDepositAmountUT).div(_oraPricePerSharePreDeposit));
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function userWithdrawVault(uint256 _userWithdrawVT) external override nonReentrant {
        (bool _vaultWithdrawPermitted, string memory _vaultWithdrawPermittedReason) = vaultWithdrawPermitted();
        require(_vaultWithdrawPermitted, _vaultWithdrawPermittedReason);
        (bool _userWithdrawPermitted, string memory _userWithdrawPermittedReason) =
            userWithdrawPermitted(msg.sender, _userWithdrawVT);
        require(_userWithdrawPermitted, _userWithdrawPermittedReason);
        // burning should occur at pre userwithdraw price UNLESS there is slippage
        // if there is slippage, the withdrawing user should absorb that cost (see below)
        // i.e. get less underlying tokens than calculated by pre userwithdraw price
        uint256 _oraVaultAndStratValueUT = _oraVaultAndStratValueUT();
        uint256 _oraPricePerSharePreWithdrawUT = _oraVaultAndStratValueUT.div(totalSupply());
        uint256 _oraUserWithdrawUT = _userWithdrawVT.div(_oraPricePerSharePreWithdrawUT);
        _burn(msg.sender, _userWithdrawVT);

        uint256 _vaultValuePreStratWithdrawUT = _balance();

        // if vault does not have sufficient UT, we need to withdraw from strategy
        if (_vaultValuePreStratWithdrawUT < _oraUserWithdrawUT) {
            // withdraw UT shortage from strategy
            uint256 _requestStratWithdrawUT = _oraUserWithdrawUT.sub(_vaultValuePreStratWithdrawUT);
            _vaultWithdrawSomeFromStrategy(getStrategySteps(investStrategyHash), _requestStratWithdrawUT);

            // Identify Slippage
            // UT requested from strategy withdraw  = _requestStratWithdrawUT
            // UT actually received from strategy withdraw = _realizedStratWithdrawUT
            //                                             = _vaultValuePostStratWithdrawUT.sub(_vaultValuePreStratWithdrawUT)
            // slippage = _requestStratWithdrawUT - _realizedStratWithdrawUT
            uint256 _vaultValuePostStratWithdrawUT = _balance();
            uint256 _realizedStratWithdrawUT = _vaultValuePostStratWithdrawUT.sub(_vaultValuePreStratWithdrawUT);
            uint256 _slippage = _requestStratWithdrawUT - _realizedStratWithdrawUT;

            // If slippage occurs, reduce _oraUserWithdrawUT by slippage amount
            if (_requestStratWithdrawUT < _oraUserWithdrawUT) {
                _oraUserWithdrawUT = _oraUserWithdrawUT - _slippage;
            }
        }
        uint256 _withdrawFeeUT = calcWithdrawalFeeUT(_oraUserWithdrawUT);
        // transfer withdraw fee to vaultFeeAddress
        if (_withdrawFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(vaultConfiguration.vaultFeeAddress, _withdrawFeeUT);
        }
        IERC20(underlyingToken).safeTransfer(msg.sender, _oraUserWithdrawUT.sub(_withdrawFeeUT));
    }

    /**
     * @inheritdoc IVaultV2
     */
    function vaultDepositAllToStrategy() external override {
        (bool _vaultDepositPermitted, string memory _vaultDepositPermittedReason) = vaultDepositPermitted();
        require(_vaultDepositPermitted, _vaultDepositPermittedReason);
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _vaultDepositAllToStrategy(getStrategySteps(investStrategyHash));
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function adminCall(bytes[] memory _codes) external override onlyOperator {
        executeCodes(_codes, Errors.ADMIN_CALL);
    }

    //===Public view functions===//

    /**
     * @inheritdoc IVaultV2
     */
    function setRiskProfileCode(uint256 _riskProfileCode) public override onlyOperator {
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        require(_riskProfile.exists, Errors.RISK_PROFILE_EXISTS);
        riskProfileCode = _riskProfileCode;
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setToken(address _underlyingToken) public override onlyOperator {
        require(_underlyingToken.isContract(), Errors.NOT_A_CONTRACT);
        require(registryContract.isApprovedToken(_underlyingToken), Errors.TOKEN_NOT_APPROVED);
        underlyingToken = _underlyingToken;
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setTokensHash(bytes32 _underlyingTokensHash) public override onlyOperator {
        underlyingTokensHash = _underlyingTokensHash;
    }

    /**
     * @inheritdoc IVaultV2
     */
    function balance() public view override returns (uint256) {
        return _balance();
    }

    /**
     * @inheritdoc IVaultV2
     */
    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) public view override returns (bool) {
        return (_diff.mul(10000)).div(_currentVaultValue) < maxVaultValueJump;
    }

    /**
     * @inheritdoc IVaultV2
     */
    function getPricePerFullShare() public view override returns (uint256) {
        if (totalSupply() != 0) {
            return _oraVaultValueUT().mul(Constants.WEI_DECIMAL).div(totalSupply());
        } else {
            return uint256(0);
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function userDepositPermitted(address _user, uint256 _userDepositUT)
        public
        view
        override
        returns (bool, string memory)
    {
        if (vaultConfiguration.allowWhitelistedState && !whitelistedEOA[_user]) {
            return (false, Errors.EOA_NOT_WHITELISTED);
        }
        if (msg.sender != tx.origin && !whitelistedCA[msg.sender]) {
            return (false, Errors.CA_NOT_WHITELISTED);
        }
        if (_userDepositUT < vaultConfiguration.minimumDepositValueUT) {
            return (false, Errors.MINIMUM_USER_DEPOSIT_VALUE_UT);
        }
        uint256 _vaultTVLUT = _oraVaultValueUT();
        if (_vaultTVLUT.add(_userDepositUT) > vaultConfiguration.totalValueLockedLimitUT) {
            return (false, Errors.TOTAL_VALUE_LOCKED_LIMIT_UT);
        }
        if (totalDeposits[_user].add(_userDepositUT) > vaultConfiguration.userDepositCapUT) {
            return (false, Errors.USER_DEPOSIT_CAP_UT);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVaultV2
     */
    function vaultDepositPermitted() public view override returns (bool, string memory) {
        if (!vaultConfiguration.unpaused) {
            return (false, Errors.VAULT_PAUSED);
        }
        if (vaultConfiguration.discontinued) {
            return (false, Errors.VAULT_DISCONTINUED);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVaultV2
     */
    function userWithdrawPermitted(address _user, uint256 _userWithdrawVT)
        public
        view
        override
        returns (bool, string memory)
    {
        // require: 0 < withdrawal amount in vault tokens < user's vault token balance
        if (!vaultConfiguration.unpaused) {
            return (false, Errors.VAULT_PAUSED);
        }
        if (!(_userWithdrawVT > 0 && _userWithdrawVT <= balanceOf(_user))) {
            return (false, Errors.USER_WITHDRAW_INSUFFICIENT_VT);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVaultV2
     */
    function vaultWithdrawPermitted() public view override returns (bool, string memory) {
        if (!vaultConfiguration.unpaused) {
            return (false, Errors.VAULT_PAUSED);
        }
        return (true, "");
    }

    /**
     * @inheritdoc IVaultV2
     */
    function calcDepositFeeUT(uint256 _userDepositUT) public view override returns (uint256) {
        return
            ((_userDepositUT.mul(vaultConfiguration.depositFeePct)).div(10000)).add(
                vaultConfiguration.depositFeeFlatUT
            );
    }

    /**
     * @inheritdoc IVaultV2
     */
    function calcWithdrawalFeeUT(uint256 _userWithdrawUT) public view override returns (uint256) {
        return
            ((_userWithdrawUT.mul(vaultConfiguration.withdrawalFeePct)).div(10000)).add(
                vaultConfiguration.withdrawalFeeFlatUT
            );
    }

    /**
     * @inheritdoc IVaultV2
     */
    function getNextBestStrategy() public view override returns (bytes32) {
        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = underlyingToken;
        return IRiskManager(registryContract.getRiskManager()).getBestStrategy(riskProfileCode, _underlyingTokens);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function getLastStrategyStepBalanceLP(DataTypes.StrategyStep[] memory _strategySteps)
        public
        view
        override
        returns (uint256)
    {
        return
            _strategySteps.getLastStrategyStepBalanceLP(
                address(registryContract),
                payable(address(this)),
                underlyingToken
            );
    }

    /**
     * @inheritdoc IVaultV2
     */
    function getStrategySteps(bytes32 _investStrategyHash)
        public
        view
        override
        returns (DataTypes.StrategyStep[] memory _strategySteps)
    {
        (, _strategySteps) = IInvestStrategyRegistry(registryContract.getInvestStrategyRegistry()).getStrategy(
            _investStrategyHash
        );
    }

    //===Internal functions===//

    /**
     * @dev
     * @param _strategySteps array of strategy step tuple
     */
    function _vaultDepositAllToStrategy(DataTypes.StrategyStep[] memory _strategySteps) internal {
        _vaultDepositSomeToStrategy(_strategySteps, _balance());
    }

    /**
     * @dev
     * @param _strategySteps array of strategy step tuple
     * @param _depositValueUT amount in underlying token
     */
    function _vaultDepositSomeToStrategy(DataTypes.StrategyStep[] memory _strategySteps, uint256 _depositValueUT)
        internal
    {
        uint256 _internalTransactionCount =
            _strategySteps.getDepositInternalTransactionCount(address(registryContract));
        _emergencyBrake(_oraVaultAndStratValueUT());
        for (uint256 _i; _i < _internalTransactionCount; _i++) {
            executeCodes(
                (
                    _strategySteps.getPoolDepositCodes(
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
     * @dev
     * @param _strategySteps array of strategy step tuple
     */
    function _vaultWithdrawAllFromStrategy(DataTypes.StrategyStep[] memory _strategySteps) internal {
        _vaultWithdrawSomeFromStrategy(_strategySteps, getLastStrategyStepBalanceLP(_strategySteps));
    }

    /**
     * @dev
     * @param _strategySteps array of strategy step tuple
     * @param _withdrawAmountUT amount in underlying token
     */
    function _vaultWithdrawSomeFromStrategy(DataTypes.StrategyStep[] memory _strategySteps, uint256 _withdrawAmountUT)
        internal
    {
        uint256 _oraAmountLP =
            _strategySteps.getOraSomeValueLP(address(registryContract), underlyingToken, _withdrawAmountUT);
        uint256 _internalWithdrawTransactionCount = _strategySteps.length;
        for (uint256 _i; _i < _internalWithdrawTransactionCount; _i++) {
            executeCodes(
                _strategySteps.getPoolWithdrawCodes(
                    DataTypes.StrategyConfigurationParams({
                        registryContract: address(registryContract),
                        vault: payable(address(this)),
                        underlyingToken: underlyingToken,
                        initialStepInputAmount: _oraAmountLP,
                        internalTransactionIndex: _i,
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
        // the token can only be transferred to the whitelisted recipient
        // if the vault token is listed on any DEX like uniswap, then the pair contract address
        // should be whitelisted.
        if (!vaultConfiguration.unpaused) {
            revert(Errors.VAULT_PAUSED);
        }
        if (vaultConfiguration.allowWhitelistedState && !whitelistedEOA[_to]) {
            revert(Errors.EOA_NOT_WHITELISTED);
        }
        if (msg.sender != tx.origin && !whitelistedCA[msg.sender]) {
            revert(Errors.CA_NOT_WHITELISTED);
        }
    }

    /**
     * @dev
     * @param _allowWhitelistedState vault's whitelisted state flag
     */
    function _setAllowWhitelistedState(bool _allowWhitelistedState) internal {
        vaultConfiguration.allowWhitelistedState = _allowWhitelistedState;
        emit LogAllowWhitelistedState(_allowWhitelistedState, msg.sender);
    }

    /**
     * @dev
     * @param _userDepositCapUT maximum amount in underlying allowed to be deposited by user
     */
    function _setUserDepositCapUT(uint256 _userDepositCapUT) internal {
        vaultConfiguration.userDepositCapUT = _userDepositCapUT;
        emit LogUserDepositCapUT(vaultConfiguration.userDepositCapUT, msg.sender);
    }

    /**
     * @dev
     * @param _minimumDepositValueUT minimum deposit value in underlying token required
     */
    function _setMinimumDepositValueUT(uint256 _minimumDepositValueUT) internal {
        vaultConfiguration.minimumDepositValueUT = _minimumDepositValueUT;
        emit LogMinimumDepositValueUT(vaultConfiguration.minimumDepositValueUT, msg.sender);
    }

    /**
     * @dev
     * @param _totalValueLockedLimitUT maximum TVL in underlying allowed for the vault
     */
    function _setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) internal {
        vaultConfiguration.totalValueLockedLimitUT = _totalValueLockedLimitUT;
        emit LogTotalValueLockedLimitUT(vaultConfiguration.totalValueLockedLimitUT, msg.sender);
    }

    /**
     * @dev
     * @param _eoa externally owner account address
     * @param _whitelist flag indicating whitelist or not
     */
    function _setWhitelistedEOA(address _eoa, bool _whitelist) internal {
        whitelistedEOA[_eoa] = _whitelist;
    }

    /**
     * @dev
     * @param _ca smart contract account address
     * @param _whitelist flag indicating whitelist or not
     */
    function _setWhitelistedCA(address _ca, bool _whitelist) internal {
        whitelistedCA[_ca] = _whitelist;
    }

    /**
     * @dev
     * @param _maxVaultValueJump the maximum absolute allowed from a vault value in basis points
     */
    function _setMaxVaultValueJump(uint256 _maxVaultValueJump) internal {
        maxVaultValueJump = _maxVaultValueJump;
    }

    /**
     * @dev
     * @param _depositFeeFlatUT amount of deposit fee in underlying token
     */
    function _setDepositFeeFlatUT(uint256 _depositFeeFlatUT) internal {
        vaultConfiguration.depositFeeFlatUT = _depositFeeFlatUT;
    }

    /**
     * @dev
     * @param _depositFeePct deposit fee in percentage basis points
     */
    function _setDepositFeePct(uint256 _depositFeePct) internal {
        vaultConfiguration.depositFeePct = _depositFeePct;
    }

    /**
     * @dev
     * @return _withdrawalFeeFlatUT amount of withdrawal fee in percentage basis points
     */
    function _setWithdrawalFeeFlatUT(uint256 _withdrawalFeeFlatUT) internal {
        vaultConfiguration.withdrawalFeeFlatUT = _withdrawalFeeFlatUT;
    }

    /**
     * @dev
     * @param _withdrawalFeePct amount of withdrawal fee in percentage basis points
     */
    function _setWithdrawalFeePct(uint256 _withdrawalFeePct) internal {
        vaultConfiguration.withdrawalFeePct = _withdrawalFeePct;
    }

    /**
     * @dev
     * @param _vaultFeeAddress address that collects vault deposit and withdraw fee
     */
    function _setVaultFeeAddress(address _vaultFeeAddress) internal {
        vaultConfiguration.vaultFeeAddress = _vaultFeeAddress;
    }

    //===Internal view functions===//

    /**
     * @dev This function computes the market value of shares
     * @return _oraVaultValue the market value of the shares
     */
    function _oraVaultValueUT() internal view returns (uint256) {
        return _oraVaultAndStratValueUT();
    }

    /**
     * @dev
     * @return
     */
    function _oraStratValueUT() internal view returns (uint256) {
        return
            investStrategyHash != Constants.ZERO_BYTES32
                ? getStrategySteps(investStrategyHash).getOraValueUT(
                    address(registryContract),
                    payable(address(this)),
                    underlyingToken
                )
                : 0;
    }

    /**
     * @dev
     * @return
     */
    function _oraVaultAndStratValueUT() internal view returns (uint256) {
        return _oraStratValueUT().add(_balance());
    }

    /**
     * @dev
     * @return
     */
    function _oraValueUT() internal view returns (uint256) {
        return
            getStrategySteps(investStrategyHash).getOraValueUT(
                address(registryContract),
                payable(address(this)),
                underlyingToken
            );
    }

    /**
     * @dev Internal function to get the underlying token balance of vault
     * @return underlying asset balance in this vault
     */
    function _balance() internal view returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
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
