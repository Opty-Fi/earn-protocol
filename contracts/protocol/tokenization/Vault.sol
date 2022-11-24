// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//NOTE: Variable Shadowing

// helper contracts
import { MultiCall } from "../../utils/MultiCall.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { VersionedInitializable } from "../../dependencies/openzeppelin/VersionedInitializable.sol";
import { IncentivisedERC20 } from "./IncentivisedERC20.sol";
import { Modifiers } from "./Modifiers.sol";
import { VaultStorageV3 } from "./VaultStorage.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { EIP712Base } from "../../utils/EIP712Base.sol";
// libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { DataTypes } from "../earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";
import { Constants } from "../../utils/Constants.sol";
import { Errors } from "../../utils/Errors.sol";
import { StrategyManager } from "../lib/StrategyManager.sol";
import { MerkleProof } from "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/EnumerableSet.sol";

// interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts/drafts/IERC20Permit.sol";
import { IERC20PermitLegacy } from "../../interfaces/opty/IERC20PermitLegacy.sol";
import { IVault } from "../../interfaces/opty/IVault.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import { IRiskManager } from "../earn-protocol-configuration/contracts/interfaces/opty/IRiskManager.sol";
import { IStrategyRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IStrategyRegistry.sol";
import { IUniswapV2Router01 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import { ISwapRouter } from "../../interfaces/uniswap/ISwapRouter.sol";

/**
 * @title Vault contract inspired by AAVE V3's AToken.sol
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
    VaultStorageV3,
    EIP712Base
{
    using SafeERC20 for IERC20;
    using Address for address;
    using StrategyManager for address;
    using StrategyManager for DataTypes.StrategyStep[];
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /**
     * @dev The version of the Vault implementation
     */
    uint256 public constant opTOKEN_REVISION = 0x6;

    /**
     * @dev hash of the permit function
     */
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    //===Constructor===//

    /* solhint-disable no-empty-blocks */
    constructor(address _registry)
        public
        IncentivisedERC20(string(abi.encodePacked("opTOKEN_IMPL")), string(abi.encodePacked("opTOKEN_IMPL")))
        EIP712Base()
        Modifiers(_registry)
    {
        // Intentionally left blank
    }

    /* solhint-enable no-empty-blocks */

    //===External functions===//

    /**
     * @dev Initialize the vault
     * @param _registry The address of registry for helping get the protocol configuration
     * @param _underlyingTokensHash The keccak256 hash of the tokens and chain id
     * @param _whitelistedAccountsRoot Whitelisted accounts root hash
     * @param _symbol The symbol of the underlying  asset
     * @param _riskProfileCode Risk profile code of this vault
     * @param _vaultConfiguration Bit banging value for vault config
     * @param _userDepositCapUT Maximum amount in underlying token allowed to be deposited by user
     * @param _minimumDepositValueUT Minimum deposit value in underlying token required
     * @param _totalValueLockedLimitUT Maximum TVL in underlying token allowed for the vault
     */
    function initialize(
        address _registry,
        bytes32 _underlyingTokensHash,
        bytes32 _whitelistedAccountsRoot,
        string memory _symbol,
        uint256 _riskProfileCode,
        uint256 _vaultConfiguration,
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT
    ) external virtual initializer {
        require(bytes(_symbol).length > 0, Errors.EMPTY_STRING);
        registryContract = IRegistry(_registry);
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        _setRiskProfileCode(_riskProfileCode, _riskProfile.exists);
        _setUnderlyingTokensHash(_underlyingTokensHash);
        _setName(string(abi.encodePacked("OptyFi ", _symbol, " ", _riskProfile.name, " Vault")));
        _setSymbol(string(abi.encodePacked("op", _symbol, "-", _riskProfile.symbol)));
        _setDecimals(IncentivisedERC20(underlyingToken).decimals());
        whitelistedAccountsRoot = _whitelistedAccountsRoot;
        _setVaultConfiguration(_vaultConfiguration);
        _setValueControlParams(_userDepositCapUT, _minimumDepositValueUT, _totalValueLockedLimitUT);
        _domainSeparator = _calculateDomainSeparator();
    }

    /**
     * @inheritdoc IVault
     */
    function setName(string calldata _name) external override {
        _onlyGovernance();
        _setName(_name);
        _domainSeparator = _calculateDomainSeparator();
    }

    /**
     * @inheritdoc IVault
     */
    function setSymbol(string calldata _symbol) external override {
        _onlyGovernance();
        _setSymbol(_symbol);
    }

    /**
     * @inheritdoc IVault
     */
    function setRiskProfileCode(uint256 _riskProfileCode) external override {
        _onlyGovernance();
        _setRiskProfileCode(_riskProfileCode, registryContract.getRiskProfile(_riskProfileCode).exists);
    }

    /**
     * @inheritdoc IVault
     */
    function setUnderlyingTokensHash(bytes32 _underlyingTokensHash) external override {
        _onlyOperator();
        _setUnderlyingTokensHash(_underlyingTokensHash);
    }

    /**
     * @inheritdoc IVault
     */
    function setValueControlParams(
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT
    ) external override {
        _onlyFinanceOperator();
        _setValueControlParams(_userDepositCapUT, _minimumDepositValueUT, _totalValueLockedLimitUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setVaultConfiguration(uint256 _vaultConfiguration) external override {
        _onlyGovernance();
        _setVaultConfiguration(_vaultConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function setUserDepositCapUT(uint256 _userDepositCapUT) external override {
        _onlyFinanceOperator();
        _setUserDepositCapUT(_userDepositCapUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setMinimumDepositValueUT(uint256 _minimumDepositValueUT) external override {
        _onlyFinanceOperator();
        _setMinimumDepositValueUT(_minimumDepositValueUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) external override {
        _onlyFinanceOperator();
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
    }

    /**
     * @inheritdoc IVault
     */
    function setWhitelistedAccountsRoot(bytes32 _whitelistedAccountsRoot) external override {
        _onlyGovernance();
        whitelistedAccountsRoot = _whitelistedAccountsRoot;
    }

    /**
     * @inheritdoc IVault
     */
    function setEmergencyShutdown(bool _active) external override {
        _onlyGovernance();
        vaultConfiguration = vaultConfiguration & 0xFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        if (_active) {
            vaultConfiguration =
                vaultConfiguration |
                0x0100000000000000000000000000000000000000000000000000000000000000;
            if (investStrategyHash != Constants.ZERO_BYTES32) {
                _vaultWithdrawAll();
                investStrategyHash = Constants.ZERO_BYTES32;
                delete investStrategySteps;
            }
        }
        emit LogEmergencyShutdown((vaultConfiguration & (1 << 248)) != 0, msg.sender);
    }

    /**
     * @inheritdoc IVault
     */
    function setUnpaused(bool _unpaused) external override {
        _onlyGovernance();
        vaultConfiguration = (vaultConfiguration & 0xFDFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
        if (!_unpaused) {
            if (investStrategyHash != Constants.ZERO_BYTES32) {
                _vaultWithdrawAll();
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
    function giveAllowances(IERC20[] calldata _tokens, address[] calldata _spenders)
        external
        override
        onlyRiskOperator
    {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], uint256(-1));
        }
    }

    /**
     * @inheritdoc IVault
     */
    function removeAllowances(IERC20[] calldata _tokens, address[] calldata _spenders)
        external
        override
        onlyRiskOperator
    {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, Errors.LENGTH_MISMATCH);
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], 0);
        }
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositVault(
        address _beneficiary,
        uint256 _userDepositUT,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof
    ) external override nonReentrant returns (uint256) {
        _checkVaultDeposit();
        _emergencyBrake(true);
        _permit(_permitParams);
        return _depositVaultFor(_beneficiary, false, _userDepositUT, _accountsProof);
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawVault(
        address _receiver,
        uint256 _userWithdrawVT,
        uint256 _expectedOutput,
        bytes32[] memory _withdrawStrategies,
        bytes32[] calldata _accountsProof
    ) external override nonReentrant returns (uint256) {
        _emergencyBrake(false);
        return _withdrawVaultFor(_receiver, _userWithdrawVT, _expectedOutput, _withdrawStrategies, _accountsProof);
    }

    /**
     * @inheritdoc IVault
     */
    function vaultDepositAllToStrategy(bytes32 _strategyHash) external override {
        _checkVaultDeposit();
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _vaultDepositToStrategy(
                IStrategyRegistry(registryContract.getStrategyRegistry()).getStrategySteps(_strategyHash),
                balanceUT()
            );
        }
    }

    /**
     * @inheritdoc IVault
     */
    function vaultDepositToStrategy(
        bytes32 _strategyHash,
        uint256 _depositValueUT,
        uint256 _minExpectedLP
    ) external override {
        _onlyStrategyOperator();
        _checkVaultDeposit();

        IStrategyRegistry strategyRegistry = IStrategyRegistry(registryContract.getStrategyRegistry());

        require(strategies.contains(_strategyHash), Errors.INVALID_STRATEGY);

        DataTypes.StrategyStep[] memory steps = strategyRegistry.getStrategySteps(_strategyHash);

        //CHECK IF THE TOKEN == POOL
        uint256 initialLP = IERC20(steps[steps.length - 1].pool).balanceOf(address(this));
        _vaultDepositToStrategy(steps, _depositValueUT);
        uint256 finalLP = IERC20(steps[steps.length - 1].pool).balanceOf(address(this));

        require(finalLP.sub(initialLP) >= _minExpectedLP, Errors.RETURNED_LP_TOO_FEW);
    }

    /**
     * @inheritdoc IVault
     */
    function vaultWithdrawFromStrategy(
        bytes32 _strategyHash,
        uint256 _withdrawAmountLP,
        uint256 _minExpectedUT
    ) external override {
        _onlyStrategyOperator();
        IStrategyRegistry strategyRegistry = IStrategyRegistry(registryContract.getStrategyRegistry());

        require(strategies.contains(_strategyHash), Errors.INVALID_STRATEGY);

        uint256 initialUT = IERC20(underlyingToken).balanceOf(address(this));
        _vaultWithdrawSomeFromStrategy(strategyRegistry.getStrategySteps(_strategyHash), _withdrawAmountLP);
        uint256 finalUT = IERC20(underlyingToken).balanceOf(address(this));

        require(finalUT.sub(initialUT) >= _minExpectedUT, Errors.RETURNED_UT_TOO_FEW);
    }

    /**
     * @inheritdoc IVault
     */
    function adminCall(bytes[] memory _codes) external override {
        _onlyGovernance();
        executeCodes(_codes, Errors.ADMIN_CALL);
    }

    /**
     * @inheritdoc IVault
     */
    function claimRewardToken(address _liquidityPool) external override {
        _onlyStrategyOperator();
        executeCodes(
            _liquidityPool.getClaimRewardTokenCode(address(registryContract), payable(address(this))),
            Errors.CLAIM_REWARD_FAILED
        );
    }

    /**
     * @inheritdoc IVault
     */
    function harvest(
        address _rewardToken,
        address _dex,
        bool _isUniV3,
        uint256 _minimumUnderlyingTokenAmount,
        uint256 _deadline,
        address[] memory _path,
        bytes memory _pathUniV3
    ) external override {
        _onlyStrategyOperator();
        uint256 _rewardTokenAmount = IERC20(_rewardToken).balanceOf(address(this));
        if (_isUniV3) {
            ISwapRouter(_dex).exactInput(
                ISwapRouter.ExactInputParams({
                    path: _pathUniV3,
                    recipient: address(this),
                    deadline: _deadline,
                    amountIn: _rewardTokenAmount,
                    amountOutMinimum: _minimumUnderlyingTokenAmount
                })
            );
        } else {
            IUniswapV2Router01(_dex).swapExactTokensForTokens(
                _rewardTokenAmount,
                _minimumUnderlyingTokenAmount,
                _path,
                address(this),
                _deadline
            );
        }
    }

    /**
     * @inheritdoc IVault
     */
    function permit(
        address _owner,
        address _spender,
        uint256 _value,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external override {
        require(_owner != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        //solium-disable-next-line
        require(block.timestamp <= _deadline, Errors.INVALID_EXPIRATION);
        uint256 _currentValidNonce = _nonces[_owner];
        bytes32 _digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(PERMIT_TYPEHASH, _owner, _spender, _value, _currentValidNonce, _deadline))
                )
            );
        require(_owner == ecrecover(_digest, _v, _r, _s), Errors.INVALID_SIGNATURE);
        _nonces[_owner] = _currentValidNonce.add(1);
        _approve(_owner, _spender, _value);
    }

    /**
     * @inheritdoc IVault
     */
    function addStrategy(bytes32 _strategyHash) external override {
        _onlyStrategyOperator();
        IRiskManager(registryContract.getRiskManager()).isValidStrategy(
            _strategyHash,
            (vaultConfiguration >> 240) & 0xFF
        );
        strategies.add(_strategyHash);
        emit AddStrategy(_strategyHash);
    }

    /**
     * @inheritdoc IVault
     */
    function removeStrategy(bytes32 _strategyHash) external override {
        _onlyStrategyOperator();
        strategies.remove(_strategyHash);
        emit RemoveStrategy(_strategyHash);
    }

    //===Public view functions===//

    /**
     * @inheritdoc EIP712Base
     */
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() public view override returns (bytes32) {
        uint256 __chainId;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            __chainId := chainid()
        }
        if (__chainId == _chainId) {
            return _domainSeparator;
        }
        return _calculateDomainSeparator();
    }

    /**
     * @inheritdoc EIP712Base
     */
    function nonces(address owner) public view override returns (uint256) {
        return _nonces[owner];
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
        bytes32[] memory _accountsProof
    ) public view override returns (bool, string memory) {
        if ((vaultConfiguration & (1 << 250)) != 0 && !_verifyWhitelistedAccount(_accountLeaf(_user), _accountsProof)) {
            return (false, Errors.EOA_NOT_WHITELISTED);
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
        bytes32[] memory _accountsProof
    ) public view override returns (bool, string memory) {
        if ((vaultConfiguration & (1 << 250)) != 0 && !_verifyWhitelistedAccount(_accountLeaf(_user), _accountsProof)) {
            return (false, Errors.EOA_NOT_WHITELISTED);
        }
        // require: 0 < withdrawal amount in vault tokens < user's vault token balance
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

    //===Internal functions===//

    /* solhint-disable avoid-low-level-calls*/
    /**
     * @dev execute the permit according to the permit param
     * @param _permitParams data
     */
    function _permit(bytes calldata _permitParams) internal {
        if (_permitParams.length == 32 * 7) {
            (bool success, ) = underlyingToken.call(abi.encodePacked(IERC20Permit.permit.selector, _permitParams));
            require(success, Errors.PERMIT_FAILED);
        }

        if (_permitParams.length == 32 * 8) {
            (bool success, ) =
                underlyingToken.call(abi.encodePacked(IERC20PermitLegacy.permit.selector, _permitParams));
            require(success, Errors.PERMIT_LEGACY_FAILED);
        }
    }

    /* solhint-enable avoid-low-level-calls*/

    /**
     * @dev internal function deposit for an user
     * @param _beneficiary address of the beneficiary
     * @param _addUserDepositUT whether to add _userDepositUT while
     *         checking for TVL limit reached.
     * @param _userDepositUT amount to deposit in underlying token
     * @param _accountsProof merkle proof for caller
     *        required only if whitelisted state is true
     */
    function _depositVaultFor(
        address _beneficiary,
        bool _addUserDepositUT,
        uint256 _userDepositUT,
        bytes32[] calldata _accountsProof
    ) internal returns (uint256) {
        // check vault + strategy balance (in UT) before user token transfer
        uint256 _oraVaultAndStratValuePreDepositUT = _oraVaultAndStratValueUT();
        // only count the actual deposited tokens received into vault
        uint256 _actualDepositAmountUT = _calcActualDepositAmount(_userDepositUT);
        // remove deposit fees (if any) but only if deposit is accepted
        // if deposit is not accepted, the entire transaction should revert
        uint256 _depositFeeUT = calcDepositFeeUT(_actualDepositAmountUT);
        uint256 _netUserDepositUT = _actualDepositAmountUT.sub(_depositFeeUT);
        _checkUserDeposit(msg.sender, _addUserDepositUT, _netUserDepositUT, _depositFeeUT, _accountsProof);
        // add net deposit amount to user's total deposit
        totalDeposits[_beneficiary] = totalDeposits[_beneficiary].add(_netUserDepositUT);
        // transfer deposit fee to vaultFeeCollector
        if (_depositFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(address(uint160(vaultConfiguration >> 80)), _depositFeeUT);
        }
        // mint vault tokens
        // if _oraVaultAndStratValuePreDepositUT == 0 or totalSupply == 0, mint vault tokens 1:1 for underlying tokens
        // else, mint vault tokens at constant pre deposit price
        // e.g. if pre deposit price > 1, minted vault tokens < deposited underlying tokens
        //      if pre deposit price < 1, minted vault tokens > deposited underlying tokens
        uint256 _mintAmount;
        if (_oraVaultAndStratValuePreDepositUT == 0 || totalSupply() == 0) {
            _mintAmount = _netUserDepositUT;
        } else {
            _mintAmount = (_netUserDepositUT.mul(totalSupply())).div(_oraVaultAndStratValuePreDepositUT);
        }
        _mint(_beneficiary, _mintAmount);

        return _mintAmount;
    }

    /**
     * @dev internal function to calculate the actual amount transfered
     * @param _amount amount to deposit in underlying token
     */
    function _calcActualDepositAmount(uint256 _amount) internal returns (uint256) {
        // check vault balance (in UT) before user token transfer
        uint256 _vaultValuePreDepositUT = balanceUT();
        // receive user deposit
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        // only count the actual deposited tokens received into vault
        return balanceUT().sub(_vaultValuePreDepositUT);
    }

    /**
     * @dev internal function withdraw for an user
     * @param _receiver address of the receiver of the underlying token
     * @param _userWithdrawVT amount in vault token
     * @param _expectedOutput the minimum amount of underlying tokens that
     *         must be received to not revert the transaction
     * @param _withdrawStrategies strategies to withdraw from
     * @param _accountsProof merkle proof for caller
     */
    function _withdrawVaultFor(
        address _receiver,
        uint256 _userWithdrawVT,
        uint256 _expectedOutput,
        bytes32[] memory _withdrawStrategies,
        bytes32[] calldata _accountsProof
    ) internal returns (uint256) {
        _checkUserWithdraw(msg.sender, _userWithdrawVT, _accountsProof);
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
            IStrategyRegistry strategyRegistry = IStrategyRegistry(registryContract.getStrategyRegistry());

            for (uint256 i; i < _withdrawStrategies.length; i++) {
                uint256 _oraAmountLP;

                bytes32 withdrawStrategyHash = _withdrawStrategies[i];
                uint256 buffer = withdrawalBuffers[withdrawStrategyHash];
                DataTypes.StrategyStep[] memory _steps = strategyRegistry.getStrategySteps(withdrawStrategyHash);

                if (buffer >= _expectedStratWithdrawUT) {
                    _oraAmountLP = _steps.getOraSomeValueLP(
                        address(registryContract),
                        underlyingToken,
                        _expectedStratWithdrawUT
                    );

                    _vaultWithdrawSomeFromStrategy(_steps, _oraAmountLP);

                    break;
                } else {
                    _expectedStratWithdrawUT -= buffer;
                    _oraAmountLP = _steps.getOraSomeValueLP(address(registryContract), underlyingToken, buffer);

                    _vaultWithdrawSomeFromStrategy(_steps, _oraAmountLP);

                    if (i == _withdrawStrategies.length - 1 && _expectedStratWithdrawUT != 0) {
                        revert(Errors.WITHDRAWAL_TOO_LARGE);
                    }
                }
            }

            // Identify Slippage
            // UT requested from strategy withdraw  = _expectedStratWithdrawUT
            // UT actually received from strategy withdraw
            // = _receivedStratWithdrawUT
            // = _vaultValuePostStratWithdrawUT.sub(_vaultValuePreStratWithdrawUT)
            // slippage = _expectedStratWithdrawUT - _receivedStratWithdrawUT
            uint256 _vaultValuePostStratWithdrawUT = balanceUT();
            uint256 _receivedStratWithdrawUT = _vaultValuePostStratWithdrawUT.sub(_vaultValuePreStratWithdrawUT);

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
        uint256 _withdrawAmount = _oraUserWithdrawUT.sub(_withdrawFeeUT);

        IERC20(underlyingToken).safeTransfer(_receiver, _withdrawAmount);
        return _withdrawAmount;
    }

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
     * @dev Internal function to withdraw all investments
     */
    function _vaultWithdrawAll() internal {
        IStrategyRegistry strategyRegistry = IStrategyRegistry(registryContract.getStrategyRegistry());
        for (uint256 i; i < strategies.length(); i++) {
            _vaultWithdrawSomeFromStrategy(
                strategyRegistry.getStrategySteps(strategies.at(i)),
                getLastStrategyStepBalanceLP(strategyRegistry.getStrategySteps(strategies.at(i)))
            );
        }
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

    /**
     * @dev Internal function to configure the vault's fee params
     * @param _vaultConfiguration bit banging value for vault config
     */
    function _setVaultConfiguration(uint256 _vaultConfiguration) internal {
        vaultConfiguration = _vaultConfiguration;
    }

    // /**
    //  * @dev Internal function to control the allowance of user interaction
    //  *         only when vault's whitelistedstate is enabled
    //  * @param _whitelistedAccountsRoot whitelisted accounts root hash
    //  */
    // function _setWhitelistedAccountsRoot(bytes32 _whitelistedAccountsRoot) internal {
    //     whitelistedAccountsRoot = _whitelistedAccountsRoot;
    // }

    /**
     * @dev Internal function to configure the vault's value control params
     * @param _userDepositCapUT maximum amount in underlying token allowed to be deposited by user
     * @param _minimumDepositValueUT minimum deposit value in underlying token required
     * @param _totalValueLockedLimitUT maximum TVL in underlying token allowed for the vault
     */
    function _setValueControlParams(
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT
    ) internal {
        _setUserDepositCapUT(_userDepositCapUT);
        _setMinimumDepositValueUT(_minimumDepositValueUT);
        _setTotalValueLockedLimitUT(_totalValueLockedLimitUT);
    }

    //===Internal view functions===//

    /**
     * @dev Computes the vault value in underlying token that includes balance of underlying token
     *      in vault and that of investment made in the strategy
     * @return amount in underlying token
     */
    function _oraVaultAndStratValueUT() internal view returns (uint256) {
        uint256 _totalValue = balanceUT();

        for (uint256 i; i < strategies.length(); i++) {
            _totalValue += _oraStratValueUT(
                IStrategyRegistry(registryContract.getStrategyRegistry()).getStrategySteps(strategies.at(i))
            );
        }

        return _totalValue;
    }

    /**
     * @dev Computes the amount in underlying token for the investment made in strategy
     * @param _steps the strategy steps for the strategy to check
     * @return amount in underlying token
     */
    function _oraStratValueUT(DataTypes.StrategyStep[] memory _steps) internal view returns (uint256) {
        // totaldebt
        return
            investStrategyHash != Constants.ZERO_BYTES32
                ? _steps.getOraValueUT(address(registryContract), payable(address(this)), underlyingToken)
                : 0;
    }

    function _verifyWhitelistedAccount(bytes32 _leaf, bytes32[] memory _proof) internal view returns (bool) {
        return MerkleProof.verify(_proof, whitelistedAccountsRoot, _leaf);
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
     */
    function _checkUserDeposit(
        address _user,
        bool _addUserDepositUT,
        uint256 _userDepositUTWithDeductions,
        uint256 _deductions,
        bytes32[] memory _accountsProof
    ) internal view {
        (bool _userDepositPermitted, string memory _userDepositPermittedReason) =
            userDepositPermitted(_user, _addUserDepositUT, _userDepositUTWithDeductions, _deductions, _accountsProof);
        require(_userDepositPermitted, _userDepositPermittedReason);
    }

    /**
     * @dev internal function to check whether vault is in emergency shutdown
     */
    function _checkVaultEmergencyShutdown() internal view {
        require(!((vaultConfiguration & (1 << 248)) != 0), Errors.VAULT_EMERGENCY_SHUTDOWN);
    }

    /**
     * @dev internal function to check whether vault is paused
     */
    function _checkVaultPaused() internal view {
        require(((vaultConfiguration & (1 << 249)) != 0), Errors.VAULT_PAUSED);
    }

    /**
     * @dev internal function to check whether vault is paused or in emergency shutdown
     */
    function _checkVaultDeposit() internal view {
        _checkVaultPaused();
        _checkVaultEmergencyShutdown();
    }

    /**
     * @dev internal function to decide whether user can withdraw or not
     * @param _user account address of the user
     * @param _userWithdrawVT amount of vault tokens to burn
     * @param _accountsProof merkle proof for caller
     */
    function _checkUserWithdraw(
        address _user,
        uint256 _userWithdrawVT,
        bytes32[] memory _accountsProof
    ) internal view {
        (bool _userWithdrawPermitted, string memory _userWithdrawPermittedReason) =
            userWithdrawPermitted(_user, _userWithdrawVT, _accountsProof);
        require(_userWithdrawPermitted, _userWithdrawPermittedReason);
    }

    /* solhint-disable-next-line func-name-mixedcase */
    function _EIP712BaseId() internal view override returns (string memory) {
        return name();
    }

    /* solhint-enable-next-line func-name-mixedcase */

    //===Internal pure functions===//

    /**
     * @inheritdoc VersionedInitializable
     */
    function getRevision() internal pure virtual override returns (uint256) {
        return opTOKEN_REVISION;
    }

    /**
     * @dev internal helper function to return a merkle tree leaf hash for account
     * @param _account account address
     * @return account leaf hash
     */
    function _accountLeaf(address _account) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_account));
    }

    //===Private functions===//

    /**
     * @dev Private function to prevent same block deposit-withdrawal
     */
    function _emergencyBrake(bool _deposit) private {
        if (_deposit) {
            blockTransaction[block.number] = true;
        } else {
            require(!blockTransaction[block.number], Errors.EMERGENCY_BRAKE);
        }
    }
}
