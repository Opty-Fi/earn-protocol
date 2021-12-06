// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// helper contracts
import { MultiCall } from "../../utils/MultiCall.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Deployer } from "../../dependencies/chi/ChiDeployer.sol";
import { VersionedInitializable } from "../../dependencies/openzeppelin/VersionedInitializable.sol";
import { IncentivisedERC20 } from "./IncentivisedERC20.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { VaultStorage } from "./VaultStorage.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import { Constants } from "../../utils/Constants.sol";

// interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IVault } from "../../interfaces/opty/IVault.sol";
import { IStrategyManager } from "../../interfaces/opty/IStrategyManager.sol";
import { IRegistry } from "../../interfaces/opty/IRegistry.sol";
import { IRiskManager } from "../../interfaces/opty/IRiskManager.sol";
import { IHarvestCodeProvider } from "../team-defi-adapters/contracts/1_ethereum/interfaces/IHarvestCodeProvider.sol";

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
    VaultStorage,
    Deployer
{
    using SafeERC20 for IERC20;
    using Address for address;

    /**
     * @dev The version of the Vault business logic
     */
    uint256 public constant opTOKEN_REVISION = 0x1;

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
     * @inheritdoc IVault
     */
    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external override onlyGovernance {
        maxVaultValueJump = _maxVaultValueJump;
    }

    /**
     * @inheritdoc IVault
     */
    function rebalance() external override ifNotPausedAndDiscontinued(address(this)) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();

        uint256 _gasInitial = msg.sender == _vaultStrategyConfiguration.operator ? gasleft() : uint256(0);

        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = underlyingToken;
        bytes32 _newInvestStrategyHash =
            IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(riskProfileCode, _underlyingTokens);
        if (
            keccak256(abi.encodePacked(_newInvestStrategyHash)) != keccak256(abi.encodePacked(investStrategyHash)) &&
            investStrategyHash != Constants.ZERO_BYTES32
        ) {
            _withdrawAll(_vaultStrategyConfiguration);
            if (msg.sender == _vaultStrategyConfiguration.operator && gasOwedToOperator != uint256(0)) {
                IERC20(underlyingToken).safeTransfer(
                    _vaultStrategyConfiguration.operator,
                    IHarvestCodeProvider(registryContract.getHarvestCodeProvider()).getWETHInToken(
                        underlyingToken,
                        gasOwedToOperator
                    )
                );
                gasOwedToOperator = uint256(0);
            }
        }

        investStrategyHash = _newInvestStrategyHash;
        if (_balance() > 0) {
            _emergencyBrake(_balance());
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                riskProfileCode,
                _underlyingTokens
            );
            _supplyAll(
                _vaultStrategyConfiguration.strategyManager,
                registryContract.getVaultConfiguration(address(this)).totalValueLockedLimitInUnderlying
            );
        }

        if (msg.sender == _vaultStrategyConfiguration.operator) {
            gasOwedToOperator = gasOwedToOperator.add((_gasInitial.sub(gasleft())).mul(tx.gasprice));
        }
    }

    /**
     * @inheritdoc IVault
     */
    function harvest(bytes32 _investStrategyHash) external override onlyOperator {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _harvest(_investStrategyHash, _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositAll() external override {
        _userDeposit(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    /**
     * @inheritdoc IVault
     */
    function userDeposit(uint256 _amount) external override {
        _userDeposit(_amount);
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositAllRebalance() external override {
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositRebalance(uint256 _amount) external override {
        _userDepositRebalance(_amount);
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawAllRebalance() external override {
        _userWithdrawRebalance(balanceOf(msg.sender));
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawRebalance(uint256 _redeemAmount) external override {
        _userWithdrawRebalance(_redeemAmount);
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositAllWithCHI() external override discountCHI {
        _userDeposit(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositWithCHI(uint256 _amount) external override discountCHI {
        _userDeposit(_amount);
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositAllRebalanceWithCHI() external override discountCHI {
        uint256 _amount = IERC20(underlyingToken).balanceOf(msg.sender);
        _userDepositRebalance(_amount);
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositRebalanceWithCHI(uint256 _amount) external override discountCHI {
        _userDepositRebalance(_amount);
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawRebalanceWithCHI(uint256 _redeemAmount) external override discountCHI {
        _userWithdrawRebalance(_redeemAmount);
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawAllRebalanceWithCHI() external override discountCHI {
        _userWithdrawRebalance(balanceOf(msg.sender));
    }

    /**
     * @inheritdoc IVault
     */
    function discontinue() external override onlyRegistry {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
        }
    }

    /**
     * @inheritdoc IVault
     */
    function setUnpaused(bool _unpaused) external override onlyRegistry {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (!_unpaused && investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
        }
    }

    /**
     * @inheritdoc IVault
     * @notice writable function to compute price per share of the vault
     *         Note : This function does add amount of underlying tokens that
     *         are available when reward tokens are claimed and
     *         swapped into vault's underlying token. This function call is useful
     *         when strategy involves protocols like Curve, Compound etc that requires write
     *         to get the amount of unclaimed reward tokens.
     */
    function getPricePerFullShareWrite() external override returns (uint256) {
        if (totalSupply() != 0) {
            pricePerShareWrite = _calVaultValueInUnderlyingTokenWrite(registryContract.getStrategyManager())
                .mul(Constants.WEI_DECIMAL)
                .div(totalSupply());
        } else {
            pricePerShareWrite = uint256(0);
        }
        return pricePerShareWrite;
    }

    /**
     * @inheritdoc IVault
     */
    function getDepositQueue() public view override returns (DataTypes.UserDepositOperation[] memory) {
        return queue;
    }

    /**
     * @inheritdoc IVault
     */
    function balance() public view override returns (uint256) {
        return _balance();
    }

    /**
     * @inheritdoc IVault
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
                _calVaultValueInUnderlyingToken(registryContract.getStrategyManager()).mul(Constants.WEI_DECIMAL).div(
                    totalSupply()
                );
        } else {
            return uint256(0);
        }
    }

    /**
     * @inheritdoc IVault
     */
    function setRiskProfileCode(uint256 _riskProfileCode) public override onlyOperator {
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        require(_riskProfile.exists, "e3");
        riskProfileCode = _riskProfileCode;
    }

    /**
     * @inheritdoc IVault
     */
    function setToken(address _underlyingToken) public override onlyOperator {
        require(_underlyingToken.isContract(), "e4");
        require(registryContract.isApprovedToken(_underlyingToken), "e5");
        underlyingToken = _underlyingToken;
    }

    /**
     * @inheritdoc IVault
     */
    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) public view override returns (bool) {
        return (_diff.mul(10000)).div(_currentVaultValue) < maxVaultValueJump;
    }

    /**
     * @inheritdoc IVault
     */
    function adminCall(bytes[] memory _codes) external override onlyOperator {
        executeCodes(_codes, "e6");
    }

    /**
     * @dev Deposit all the underlying assets to the current vault invest strategy
     * @param _strategyManager the strategy manager contract address
     * @param _totalValueLockedLimitInUnderlying the total value locked limit for this vault
     */
    function _supplyAll(address _strategyManager, uint256 _totalValueLockedLimitInUnderlying) internal {
        _batchMint(_strategyManager);
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            uint256 _steps = IStrategyManager(_strategyManager).getDepositAllStepsCount(investStrategyHash);
            for (uint256 _i; _i < _steps; _i++) {
                executeCodes(
                    IStrategyManager(_strategyManager).getPoolDepositAllCodes(
                        payable(address(this)),
                        underlyingToken,
                        investStrategyHash,
                        _i,
                        _steps
                    ),
                    "e7"
                );
            }
        }
        _checkTVL(_strategyManager, _totalValueLockedLimitInUnderlying);
    }

    /**
     * @dev Redeem all the assets deployed in the current vault invest strategy
     * @param _vaultStrategyConfiguration the configuration for executing vault invest strategy
     */
    function _withdrawAll(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration) internal {
        uint256 _steps =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getWithdrawAllStepsCount(investStrategyHash);
        for (uint256 _i; _i < _steps; _i++) {
            uint256 _iterator = _steps - 1 - _i;
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolWithdrawAllCodes(
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

    /**
     * @notice Cheap deposit of underlying asset
     * @dev Transfer underlying tokens to vault without rebalance
     *      User will have to wait for shares until next rebalance
     * @param _amount The amount of underlying asset to deposit
     */
    function _userDeposit(uint256 _amount) internal ifNotPausedAndDiscontinued(address(this)) nonReentrant {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(address(this));
        if (_vaultConfiguration.allowWhitelistedState) {
            require(_isUserWhitelisted(msg.sender), "e12");
        }
        require(_checkDepositCap(_vaultConfiguration, _amount), "e13");
        require(_isQueueIncomplete(_vaultConfiguration.queueCap), "e14");
        require(_amount >= _vaultConfiguration.minimumDepositAmount, "e15");
        uint256 _tokenBalanceBefore = _balance();
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _tokenBalanceAfter = _balance();
        uint256 _actualDepositAmount = _tokenBalanceAfter.sub(_tokenBalanceBefore);
        queue.push(DataTypes.UserDepositOperation(msg.sender, _actualDepositAmount));
        totalDeposits[msg.sender] = totalDeposits[msg.sender].add(_actualDepositAmount);
        pendingDeposits[msg.sender] = pendingDeposits[msg.sender].add(_actualDepositAmount);
        depositQueue = depositQueue.add(_actualDepositAmount);
        _checkTVL(registryContract.getStrategyManager(), _vaultConfiguration.totalValueLockedLimitInUnderlying);
        emit DepositQueue(msg.sender, queue.length, _actualDepositAmount);
    }

    /**
     * @dev Mint the shares for the users who deposited without rebalancing
     *      It also updates the user rewards
     * @param _strategyManager the strategy manager contract address
     */
    function _batchMint(address _strategyManager) internal {
        for (uint256 i; i < queue.length; i++) {
            executeCodes(
                IStrategyManager(_strategyManager).getUpdateUserRewardsCodes(address(this), queue[i].account),
                "e14"
            );
            _mintShares(queue[i].account, _balance(), queue[i].value);
            pendingDeposits[queue[i].account] = pendingDeposits[queue[i].account].sub(queue[i].value);
            depositQueue = depositQueue.sub(queue[i].value);
            executeCodes(
                IStrategyManager(_strategyManager).getUpdateUserStateInVaultCodes(address(this), queue[i].account),
                "e17"
            );
        }
        executeCodes(IStrategyManager(_strategyManager).getUpdateRewardVaultRateAndIndexCodes(address(this)), "e16");
        delete queue;
    }

    /**
     * @dev Transfer the underlying assets and immediately mints the shares
     *      It also updates the user rewards
     * @param _amount The amount of underlying asset to deposit
     */
    function _userDepositRebalance(uint256 _amount) internal ifNotPausedAndDiscontinued(address(this)) nonReentrant {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(address(this));
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (_vaultConfiguration.allowWhitelistedState) {
            require(_isUserWhitelisted(msg.sender), "e12");
        }
        require(_checkDepositCap(_vaultConfiguration, _amount), "e13");
        require(_amount > 0, "e15");

        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
        }

        uint256 _tokenBalanceBefore = _balance();
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _tokenBalanceAfter = _balance();
        uint256 _actualDepositAmount = _tokenBalanceAfter.sub(_tokenBalanceBefore);
        totalDeposits[msg.sender] = totalDeposits[msg.sender].add(_actualDepositAmount);
        uint256 shares = 0;
        if (_tokenBalanceBefore == 0 || totalSupply() == 0) {
            shares = _actualDepositAmount;
        } else {
            shares = (_actualDepositAmount.mul(totalSupply())).div((_tokenBalanceBefore));
        }

        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserRewardsCodes(
                address(this),
                msg.sender
            ),
            "e14"
        );
        _mint(msg.sender, shares);
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateRewardVaultRateAndIndexCodes(
                address(this)
            ),
            "e16"
        );
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserStateInVaultCodes(
                address(this),
                msg.sender
            ),
            "e17"
        );
        if (_balance() > 0) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                riskProfileCode,
                _underlyingTokens
            );
            _supplyAll(
                _vaultStrategyConfiguration.strategyManager,
                _vaultConfiguration.totalValueLockedLimitInUnderlying
            );
        }
    }

    /**
     * @dev Redeem the shares from the vault
     * @param _redeemAmount The amount of shares to be burned
     */
    function _userWithdrawRebalance(uint256 _redeemAmount) internal nonReentrant {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(address(this));
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        require(_vaultConfiguration.unpaused, "e18");
        require(_redeemAmount > 0, "e19");
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "e20");
        if (!_vaultConfiguration.discontinued && investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
        }
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserRewardsCodes(
                address(this),
                msg.sender
            ),
            "e14"
        );
        // subtract pending deposit from total balance
        _redeemAndBurn(msg.sender, _balance().sub(depositQueue), _redeemAmount, _vaultStrategyConfiguration);

        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateRewardVaultRateAndIndexCodes(
                address(this)
            ),
            "e16"
        );
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserStateInVaultCodes(
                address(this),
                msg.sender
            ),
            "e17"
        );

        if (!_vaultConfiguration.discontinued && (_balance() > 0)) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                riskProfileCode,
                _underlyingTokens
            );
            _supplyAll(
                _vaultStrategyConfiguration.strategyManager,
                _vaultConfiguration.totalValueLockedLimitInUnderlying
            );
        }
    }

    function _beforeTokenTransfer(
        address from,
        address,
        uint256
    ) internal override {
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

    function _checkTVL(address _strategyManager, uint256 _totalValueLockedLimitInUnderlying) internal view {
        require(
            _calVaultValueInUnderlyingToken(_strategyManager).add(depositQueue) <= _totalValueLockedLimitInUnderlying,
            "e22"
        );
    }

    /**
     * @dev This function computes the market value of shares
     * @param _strategyManager address of strategy manager contracts
     * @return _vaultValue the market value of the shares
     */
    function _calVaultValueInUnderlyingToken(address _strategyManager) internal view returns (uint256 _vaultValue) {
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
     * @dev Function to calculate vault value in underlying token (for example DAI)
     *
     * Note:
     *  - Need to modify this function in future whenever 2nd layer of depositing
     *    the underlying token (for example DAI) into any
     *    credit pool like compound is added.
     */
    function _calVaultValueInUnderlyingTokenWrite(address _strategyManager) internal returns (uint256 _vaultValue) {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            uint256 balanceInUnderlyingToken =
                IStrategyManager(_strategyManager).getBalanceInUnderlyingTokenWrite(
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
     * @notice Function to check whether the depositQueue is full or not
     */
    function _isQueueIncomplete(uint256 _queueCap) internal view returns (bool) {
        return getDepositQueue().length < _queueCap;
    }

    /**
     * @notice Function to check whether the user is whitelisted or not
     */
    function _isUserWhitelisted(address _user) internal view returns (bool) {
        return registryContract.isUserWhitelisted(address(this), _user);
    }

    /**
     * @notice Function to check whether the amount exceeds deposit cap or not
     */
    function _checkDepositCap(DataTypes.VaultConfiguration memory _vaultConfiguration, uint256 _amount)
        internal
        view
        returns (bool)
    {
        if (_vaultConfiguration.isLimitedState) {
            return _amount <= _vaultConfiguration.userDepositCap.sub(totalDeposits[msg.sender]);
        }
        return true;
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
     * @dev Compute and burn the shares for the account based on redeem share amount.
     *      User will receive the underlying token
     * @param _account The user to redeem the shares
     * @param _balanceInUnderlyingToken the total balance of underlying token in the vault
     * @param _redeemAmount The amount of shares to be burned.
     * @param _vaultStrategyConfiguration the configuration for executing vault invest strategy
     */
    function _redeemAndBurn(
        address _account,
        uint256 _balanceInUnderlyingToken,
        uint256 _redeemAmount,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) private {
        uint256 redeemAmountInToken = (_balanceInUnderlyingToken.mul(_redeemAmount)).div(totalSupply());
        //  Updating the totalSupply of op tokens
        _burn(msg.sender, _redeemAmount);
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getSplitPaymentCode(
                registryContract.getTreasuryShares(address(this)),
                _account,
                underlyingToken,
                redeemAmountInToken
            ),
            "e24"
        );
    }

    /**
     * @dev Compute and mint shares for the account based on the contribution to vault
     * @param _account The user to receive the shares
     * @param _balanceInUnderlyingToken total underlying token balance in the vault
     * @param _depositAmount The amount of underlying token deposited by the user
     */
    function _mintShares(
        address _account,
        uint256 _balanceInUnderlyingToken,
        uint256 _depositAmount
    ) private {
        if (_balanceInUnderlyingToken > depositQueue) {
            _mint(_account, (_depositAmount.mul(totalSupply())).div(_balanceInUnderlyingToken.sub(depositQueue)));
        } else if (_balanceInUnderlyingToken == depositQueue) {
            _mint(_account, _depositAmount);
        }
    }
}
