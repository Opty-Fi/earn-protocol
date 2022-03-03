// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// helper contracts
import { MultiCall } from "../../utils/MultiCall.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { VersionedInitializable } from "../../dependencies/openzeppelin/VersionedInitializable.sol";
import { IncentivisedERC20 } from "./IncentivisedERC20.sol";
import { Modifiers } from "../earn-protocol-configuration/contracts/Modifiers.sol";
import { VaultStorageV2 } from "./VaultStorageV2.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { DataTypes } from "../earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";
import { Constants } from "../../utils/Constants.sol";
import { Errors } from "../../utils/Errors.sol";
import { StrategyBuilder } from "../configuration/StrategyBuilder.sol";

// interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IVaultV2 } from "../../interfaces/opty/IVaultV2.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import { IRiskManagerV2 } from "../earn-protocol-configuration/contracts/interfaces/opty/IRiskManagerV2.sol";

/**
 * @title Vault contract inspired by AAVE V2's AToken.sol
 * @author opty.fi
 * @notice Implementation of the risk specific interest bearing vault
 */

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
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        _setRiskProfileCode(_riskProfileCode, _riskProfile.exists);
        _setUnderlyingToken(_underlyingToken); //  underlying token contract address (for example DAI)
        _setUnderlyingTokensHash(_underlyingTokensHash);
        _setName(string(abi.encodePacked("op ", _name, " ", _riskProfile.name)));
        _setSymbol(string(abi.encodePacked("op", _symbol, _riskProfile.symbol)));
        _setDecimals(IncentivisedERC20(_underlyingToken).decimals());
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setRiskProfileCode(uint256 _riskProfileCode) external override onlyOperator {
        _setRiskProfileCode(_riskProfileCode, registryContract.getRiskProfile(_riskProfileCode).exists);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setUnderlyingTokenAndTokensHash(address _underlyingToken, bytes32 _underlyingTokensHash)
        external
        override
        onlyOperator
    {
        _setUnderlyingToken(_underlyingToken);
        _setUnderlyingTokensHash(_underlyingTokensHash);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setValueControlParams(
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT,
        uint256 _maxVaultValueJump
    ) external override onlyFinanceOperator {
        _setUserDepositCapUT(_userDepositCapUT);
        _setMinimumDepositValueUT(_minimumDepositValueUT);
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
        _setMaxVaultValueJump(_maxVaultValueJump);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setFeeParams(
        uint256 _depositFeeFlatUT,
        uint256 _depositFeePct,
        uint256 _withdrawalFeeFlatUT,
        uint256 _withdrawalFeePct,
        address _vaultFeeCollector
    ) external override onlyFinanceOperator {
        vaultConfiguration.depositFeeFlatUT = _depositFeeFlatUT;
        vaultConfiguration.depositFeePct = _depositFeePct;
        vaultConfiguration.withdrawalFeeFlatUT = _withdrawalFeeFlatUT;
        vaultConfiguration.withdrawalFeePct = _withdrawalFeePct;
        vaultConfiguration.vaultFeeCollector = _vaultFeeCollector;
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
    function setAllowWhitelistedState(bool _allowWhitelistedState) external override onlyOperator {
        _setAllowWhitelistedState(_allowWhitelistedState);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setUserDepositCapUT(uint256 _userDepositCapUT) external override onlyFinanceOperator {
        _setUserDepositCapUT(_userDepositCapUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setMinimumDepositValueUT(uint256 _minimumDepositValueUT) external override onlyFinanceOperator {
        _setMinimumDepositValueUT(_minimumDepositValueUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) external override onlyFinanceOperator {
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setWhitelistedAccounts(address[] memory _accounts, bool[] memory _whitelist)
        external
        override
        onlyGovernance
    {
        for (uint256 _i; _i < _accounts.length; _i++) {
            whitelistedAccounts[_accounts[_i]] = _whitelist[_i];
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setWhitelistedCodes(address[] memory _accounts, bool[] memory _whitelist)
        external
        override
        onlyGovernance
    {
        for (uint256 _i; _i < _accounts.length; _i++) {
            whitelistedCodes[_getContractHash(_accounts[_i])] = _whitelist[_i];
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setEmergencyShutdown(bool _active) external override onlyGovernance {
        if (_active && investStrategyHash != Constants.ZERO_BYTES32) {
            _vaultWithdrawAllFromStrategy(investStrategySteps);
            investStrategyHash = Constants.ZERO_BYTES32;
            delete investStrategySteps;
        }
        vaultConfiguration.emergencyShutdown = _active;
        emit LogEmergencyShutdown(vaultConfiguration.emergencyShutdown, msg.sender);
    }

    /**
     * @inheritdoc IVaultV2
     */
    function setUnpaused(bool _unpaused) external override onlyGovernance {
        if (investStrategyHash != Constants.ZERO_BYTES32 && _unpaused == false) {
            _vaultWithdrawAllFromStrategy(investStrategySteps);
            investStrategyHash = Constants.ZERO_BYTES32;
            delete investStrategySteps;
        }
        vaultConfiguration.unpaused = _unpaused;
        emit LogUnpause(vaultConfiguration.unpaused, msg.sender);
    }

    /**
     * @inheritdoc IVaultV2
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
        if (investStrategyHash != Constants.ZERO_BYTES32 && balanceUT() > 0) {
            _vaultDepositAllToStrategy(investStrategySteps);
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function userDepositVault(uint256 _userDepositUT) external override nonReentrant {
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
        (bool _vaultDepositPermitted, string memory _vaultDepositPermittedReason) = vaultDepositPermitted();
        require(_vaultDepositPermitted, _vaultDepositPermittedReason);
        uint256 _netUserDepositUT = _actualDepositAmountUT.sub(_depositFeeUT);
        (bool _userDepositPermitted, string memory _userDepositPermittedReason) =
            userDepositPermitted(msg.sender, false, _netUserDepositUT, _depositFeeUT);
        require(_userDepositPermitted, _userDepositPermittedReason);
        // add net deposit amount to user's total deposit
        totalDeposits[msg.sender] = totalDeposits[msg.sender].add(_netUserDepositUT);
        // transfer deposit fee to vaultFeeCollector
        if (_depositFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(vaultConfiguration.vaultFeeCollector, _depositFeeUT);
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
     * @inheritdoc IVaultV2
     */
    function userWithdrawVault(uint256 _userWithdrawVT) external override nonReentrant {
        _emergencyBrake(_oraStratValueUT());
        (bool _vaultWithdrawPermitted, string memory _vaultWithdrawPermittedReason) = vaultWithdrawPermitted();
        require(_vaultWithdrawPermitted, _vaultWithdrawPermittedReason);
        (bool _userWithdrawPermitted, string memory _userWithdrawPermittedReason) =
            userWithdrawPermitted(msg.sender, _userWithdrawVT);
        require(_userWithdrawPermitted, _userWithdrawPermittedReason);
        // burning should occur at pre userwithdraw price UNLESS there is slippage
        // if there is slippage, the withdrawing user should absorb that cost (see below)
        // i.e. get less underlying tokens than calculated by pre userwithdraw price
        uint256 _oraUserWithdrawUT = _userWithdrawVT.mul(totalSupply()).div(_oraVaultAndStratValueUT());
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

            uint256 _slippage;
            if (_receivedStratWithdrawUT < _expectedStratWithdrawUT) {
                _slippage = _expectedStratWithdrawUT.sub(_receivedStratWithdrawUT);
            }
            // If slippage occurs, reduce _oraUserWithdrawUT by slippage amount
            if (_receivedStratWithdrawUT < _oraUserWithdrawUT) {
                _oraUserWithdrawUT = _oraUserWithdrawUT - _slippage;
            }
        }
        uint256 _withdrawFeeUT = calcWithdrawalFeeUT(_oraUserWithdrawUT);
        // transfer withdraw fee to vaultFeeCollector
        if (_withdrawFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(vaultConfiguration.vaultFeeCollector, _withdrawFeeUT);
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
            _vaultDepositAllToStrategy(investStrategySteps);
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
    function balanceUT() public view override returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
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
            return _oraVaultAndStratValueUT().mul(Constants.WEI_DECIMAL).div(totalSupply());
        } else {
            return uint256(0);
        }
    }

    /**
     * @inheritdoc IVaultV2
     */
    function userDepositPermitted(
        address _user,
        bool _addUserDepositUT,
        uint256 _userDepositUTWithDeductions,
        uint256 _deductions
    ) public view override returns (bool, string memory) {
        if (vaultConfiguration.allowWhitelistedState && !whitelistedAccounts[_user]) {
            return (false, Errors.EOA_NOT_WHITELISTED);
        }
        //solhint-disable-next-line avoid-tx-origin
        if (_user != tx.origin && _greyList(_user)) {
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
     * @inheritdoc IVaultV2
     */
    function vaultDepositPermitted() public view override returns (bool, string memory) {
        if (!vaultConfiguration.unpaused) {
            return (false, Errors.VAULT_PAUSED);
        }
        if (vaultConfiguration.emergencyShutdown) {
            return (false, Errors.VAULT_EMERGENCY_SHUTDOWN);
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
    function getNextBestInvestStrategy() public view override returns (DataTypes.StrategyStep[] memory) {
        return IRiskManagerV2(registryContract.getRiskManager()).getBestStrategy(riskProfileCode, underlyingTokensHash);
    }

    /**
     * @inheritdoc IVaultV2
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
     * @inheritdoc IVaultV2
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
     * @dev Internal function to deposit whole balance of underlying token to current strategy
     * @param _investStrategySteps array of strategy step tuple
     */
    function _vaultDepositAllToStrategy(DataTypes.StrategyStep[] memory _investStrategySteps) internal {
        _vaultDepositSomeToStrategy(_investStrategySteps, balanceUT());
    }

    /**
     * @dev Internal function to deposit some balance of underlying token from current strategy
     * @param _investStrategySteps array of strategy step tuple
     * @param _depositValueUT amount in underlying token
     */
    function _vaultDepositSomeToStrategy(DataTypes.StrategyStep[] memory _investStrategySteps, uint256 _depositValueUT)
        internal
    {
        uint256 _internalTransactionCount =
            _investStrategySteps.getDepositInternalTransactionCount(address(registryContract));
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
        address _from,
        address _to,
        uint256
    ) internal override {
        // the token can only be transferred to the whitelisted recipient
        // if the vault token is listed on any DEX like uniswap, then the pair contract address
        // should be whitelisted.
        if (!vaultConfiguration.unpaused) {
            revert(Errors.VAULT_PAUSED);
        }
        if (vaultConfiguration.emergencyShutdown) {
            revert(Errors.VAULT_EMERGENCY_SHUTDOWN);
        }
        if (vaultConfiguration.allowWhitelistedState && !whitelistedAccounts[_from] && !whitelistedAccounts[_to]) {
            revert(Errors.EOA_NOT_WHITELISTED);
        }
        //solhint-disable-next-line avoid-tx-origin
        if (msg.sender != tx.origin && _greyList(msg.sender)) {
            revert(Errors.CA_NOT_WHITELISTED);
        }
    }

    /**
     * @dev Internal function to control whitelisted state
     * @param _allowWhitelistedState vault's whitelisted state flag
     */
    function _setAllowWhitelistedState(bool _allowWhitelistedState) internal {
        vaultConfiguration.allowWhitelistedState = _allowWhitelistedState;
        emit LogAllowWhitelistedState(_allowWhitelistedState, msg.sender);
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
     * @dev Internal function to set the maximum vault value jump in percentage basis points
     * @param _maxVaultValueJump the maximum absolute allowed from a vault value in basis points
     */
    function _setMaxVaultValueJump(uint256 _maxVaultValueJump) internal {
        maxVaultValueJump = _maxVaultValueJump;
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
        riskProfileCode = _riskProfileCode;
    }

    /**
     * @dev Internal function to save underlying token address
     * @param _underlyingToken underlying token contract address
     */
    function _setUnderlyingToken(address _underlyingToken) internal {
        require(registryContract.isApprovedToken(_underlyingToken), Errors.TOKEN_NOT_APPROVED);
        underlyingToken = _underlyingToken;
    }

    /**
     * @dev Internal function to save underlying tokens hash
     * @param _underlyingTokensHash keccak256 hash of underlying token address and chain id
     */
    function _setUnderlyingTokensHash(bytes32 _underlyingTokensHash) internal {
        require(
            registryContract.getTokensHashByIndex(registryContract.getTokensHashIndexByHash(_underlyingTokensHash)) ==
                _underlyingTokensHash,
            Errors.UNDERLYING_TOKENS_HASH_EXISTS
        );
        underlyingTokensHash = _underlyingTokensHash;
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
    function _greyList(address _account) internal view returns (bool) {
        return !whitelistedAccounts[_account] && !whitelistedCodes[_getContractHash(_account)];
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
