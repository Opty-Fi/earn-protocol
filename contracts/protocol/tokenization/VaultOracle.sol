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
// - Whitelist management
// - The shares can be only transfered to whitelisted users if in whitelisted state
// - keep vault config local to vault

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
        require(bytes(_name).length > 0, Errors.EMPTY_STRING);
        require(bytes(_symbol).length > 0, Errors.EMPTY_STRING);
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
        vaultConfiguration.depositFeeFlatUT = _depositFeeFlatUT;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setDepositFeePct(uint256 _depositFeePct) external override onlyGovernance {
        vaultConfiguration.depositFeePct = _depositFeePct;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setWithdrawalFeeFlatUT(uint256 _withdrawalFeeFlatUT) external override onlyGovernance {
        vaultConfiguration.withdrawalFeeFlatUT = _withdrawalFeeFlatUT;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setWithdrawalFeePct(uint256 _withdrawalFeePct) external override onlyGovernance {
        vaultConfiguration.withdrawalFeePct = _withdrawalFeePct;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function discontinue() external override onlyOperator {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll();
        }
        vaultConfiguration.discontinued = true;
        // TODO If a vault is discontinued, user can only withdraw from vault
        investStrategyHash = Constants.ZERO_BYTES32;
        LogDiscontinue(vaultConfiguration.discontinued, msg.sender);
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setUnpaused(bool _unpaused) external override onlyOperator {
        // TODO if investStrategyHash is zero and unpaused = true,
        //      -   allow user deposit and user withdraw
        // TODO if investstrategyHash is non-zero and unpaused = false,
        //      - withdraw all tokens
        //      - set investstrategyHash to zero
        //      - withdraw and deposit are not allowed
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function balance() public view override returns (uint256) {
        return _balance();
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setRiskProfileCode(uint256 _riskProfileCode) public override onlyOperator {
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        require(_riskProfile.exists, Errors.RISK_PROFILE_EXISTS);
        riskProfileCode = _riskProfileCode;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function setToken(address _underlyingToken) public override onlyOperator {
        require(_underlyingToken.isContract(), Errors.NOT_A_CONTRACT);
        require(registryContract.isApprovedToken(_underlyingToken), Errors.TOKEN_NOT_APPROVED);
        underlyingToken = _underlyingToken;
    }

    /**
     * @inheritdoc IVaultOracle
     */
    function rebalance() external override {
        bytes32 _nextBestInvestStrategyHash = getNextBestStrategy();
        bool _deposited;
        if (_nextBestInvestStrategyHash != investStrategyHash && investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll();
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
     * @inheritdoc IVaultOracle
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
        (bool _permitted, string memory _reason) =
            userDepositPermitted(msg.sender, _actualDepositAmountUT.sub(_depositFeeUT));
        require(_permitted, _reason);
        // transfer deposit fee to vaultFeeAddress
        if (_depositFeeUT > 0) {
            IERC20(underlyingToken).safeTransfer(vaultFeeAddress, _depositFeeUT);
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
     * @inheritdoc IVaultOracle
     */
    function userWithdrawVault(uint256 _userWithdrawVT) external override nonReentrant {
        (bool _permitted, string memory _reason) = userWithdrawalPermitted(msg.sender, _userWithdrawVT);
        require(_permitted, _reason);
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
            _withdraw(getStrategySteps(investStrategyHash), _requestStratWithdrawUT);

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
            IERC20(underlyingToken).safeTransfer(vaultFeeAddress, _withdrawFeeUT);
        }
        IERC20(underlyingToken).safeTransfer(msg.sender, _oraUserWithdrawUT.sub(_withdrawFeeUT));
    }

    function vaultDepositAllToStrategy() public {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _vaultDepositAllToStrategy(getStrategySteps(investStrategyHash));
        }
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
        executeCodes(_codes, Errors.ADMIN_CALL);
    }

    /**
     * @inheritdoc IVaultOracle
     * @notice read-only function to compute price per share of the vault
     *         Note : This function calculates the pricePerFullShare (i.e. the number of underlyingTokens
     *         per each vaultToken entitles you to).
     *
     *         Please note the following quantities are included in underlyingTokens :
     *         - underlyingTokens in vault that are not yet deployed in strategy
     *
     *        Please note the following quantities are *NOT* included in underlyingTokens :
     *         - unclaimed reward tokens from the current or past strategies
     *         - claimed reward tokens that are not yet harvested to underlyingTokens
     *         - any tokens other than underlyingTokens of the vault.
     *
     *         Please note we relay on the getAmountUT() function of StrategyManager which in turn relies on individual
     *         protocol adapters to obtain the current underlying token amount. Thus we are relying on a third party
     *         contract (i.e. an oracle). This oracle should be made resilient via best practices.
     */
    function getPricePerFullShare() public view override returns (uint256) {
        if (totalSupply() != 0) {
            return _oraVaultValueUT().mul(Constants.WEI_DECIMAL).div(totalSupply());
        } else {
            return uint256(0);
        }
    }

    /**
     * @dev This function computes the market value of shares
     * @return _oraVaultValue the market value of the shares
     */
    function _oraVaultValueUT() internal view returns (uint256) {
        return _oraVaultAndStratValueUT();
    }

    function _oraVaultAndStratValueUT() internal view returns (uint256) {
        return _oraStratValueUT().add(_balance());
    }

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
    function userDepositPermitted(address _user, uint256 _userDepositUT)
        public
        view
        override
        returns (bool, string memory)
    {
        if (!vaultConfiguration.unpaused) {
            return (false, Errors.VAULT_PAUSED);
        }
        if (vaultCofiguration.discontinued) {
            return (false, Errors.VAULT_DISCONTINUED);
        }
        if (vaultConfiguration.allowWhitelistedState && !whitelistedUsers[_user]) {
            return (false, Errors.USER_NOT_WHITELISTED);
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

    function userWithdrawalPermitted(address _user, uint256 _userWithdrawVT) public view returns (bool, string memory) {
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
     * @notice Computes deposit fee in underlying
     * @dev
     * @param _userDepositUT user deposit amount in underlying
     * @return deposit fee in underlying
     */
    function calcDepositFeeUT(uint256 _userDepositUT) public view returns (uint256) {
        return
            ((_userDepositUT.mul(vaultConfiguration.depositFeePct)).div(10000)).add(
                vaultConfiguration.depositFeeFlatUT
            );
    }

    /**
     * @notice Computes withdrawal fee in underlying
     * @param _userWithdrawUT user withdraw amount in underlying
     * @return _withdrawalFeeUT withdrawal fee in underlying
     */
    function calcWithdrawalFeeUT(uint256 _userWithdrawUT) public view returns (uint256) {
        return
            ((_userWithdrawUT.mul(vaultConfiguration.withdrawalFeePct)).div(10000)).add(
                vaultConfiguration.withdrawalFeeFlatUT
            );
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

    function getLastStrategyStepBalanceLP(DataTypes.StrategyStep[] memory _strategySteps)
        public
        view
        returns (uint256)
    {
        return
            _strategySteps.getLastStrategyStepBalanceLP(
                address(registryContract),
                payable(address(this)),
                underlyingToken
            );
    }

    function _vaultDepositAllToStrategy(DataTypes.StrategyStep[] memory _strategySteps) internal {
        uint256 _internalTransactionCount =
            _strategySteps.getDepositInternalTransactionCount(address(registryContract));
        // _emergencyBrake(_balance());
        uint256 _balanceBeforeDepositToStrategyUT = _balance();
        // TODO make sure the amount is deposited to the vault
        for (uint256 _i; _i < _internalTransactionCount; _i++) {
            executeCodes(
                (
                    _strategySteps.getPoolDepositCodes(
                        DataTypes.StrategyConfigurationParams({
                            registryContract: address(registryContract),
                            vault: payable(address(this)),
                            underlyingToken: underlyingToken,
                            initialStepInputAmount: _balanceBeforeDepositToStrategyUT,
                            internalTransactionIndex: _i,
                            internalTransactionCount: _internalTransactionCount
                        })
                    )
                ),
                Errors.VAULT_DEPOSIT
            );
        }
    }

    function _withdrawAll() internal {
        DataTypes.StrategyStep[] memory _strategySteps = getStrategySteps(investStrategyHash);
        _withdraw(_strategySteps, getLastStrategyStepBalanceLP(_strategySteps));
    }

    function _withdraw(DataTypes.StrategyStep[] memory _strategySteps, uint256 _withdrawAmountUT) internal {
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

    function getStrategySteps(bytes32 _investStrategyHash)
        public
        view
        returns (DataTypes.StrategyStep[] memory _strategySteps)
    {
        (, _strategySteps) = IInvestStrategyRegistry(registryContract.getInvestStrategyRegistry()).getStrategy(
            _investStrategyHash
        );
    }

    function _beforeTokenTransfer(
        address,
        address _to,
        uint256
    ) internal override {
        // the token can only be transferred to the whitelisted recipient
        // if the vault token is listed on any DEX like uniswap, then the pair contract address
        // should be whitelisted.
        if (vaultConfiguration.allowWhitelistedState && !whitelistedUsers[_to]) {
            revert(Errors.USER_NOT_WHITELISTED);
        }
    }

    function _setUserDepositCapUT(uint256 _userDepositCapUT) internal {
        vaultToVaultConfiguration.userDepositCapUT = _userDepositCapUT;
        emit LogUserDepositCap(vaultToVaultConfiguration.userDepositCapUT, msg.sender);
    }

    function _setMinimumDepositAmount(address _vault, uint256 _minimumDepositAmount) internal {
        vaultToVaultConfiguration[_vault].minimumDepositAmount = _minimumDepositAmount;
        emit LogMinimumDepositAmount(_vault, vaultToVaultConfiguration[_vault].minimumDepositAmount, msg.sender);
    }

    function _setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) internal {
        vaultToVaultConfiguration.totalValueLockedLimitUT = _totalValueLockedLimitUT;
        emit LogVaultTotalValueLockedLimitUT(vaultToVaultConfiguration.totalValueLockedLimitUT, msg.sender);
    }

    function _setQueueCap(uint256 _queueCap) internal {
        vaultConfiguration.queueCap = _queueCap;
        emit LogQueueCapVault(vaultConfiguration.queueCap, msg.sender);
    }

    function _setWhitelistedUser(address _user, bool _whitelist) internal {
        whitelistedUsers[_user] = _whitelist;
    }
}
