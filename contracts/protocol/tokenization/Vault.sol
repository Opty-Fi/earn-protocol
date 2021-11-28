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
import { IHarvestCodeProvider } from "../../interfaces/opty/IHarvestCodeProvider.sol";

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

    /* solhint-disable no-empty-blocks */

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
        require(bytes(_name).length > 0, "Name_Empty!");
        require(bytes(_symbol).length > 0, "Symbol_Empty!");
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
    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external override onlyGovernance returns (bool) {
        maxVaultValueJump = _maxVaultValueJump;
        return true;
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
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
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
            _supplyAll(_vaultStrategyConfiguration);
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
    function userDeposit(uint256 _amount) external override returns (bool) {
        require(_userDeposit(_amount), "userDeposit");
        return true;
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositAllRebalance() external override {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositRebalance(uint256 _amount) external override returns (bool) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(_amount, _vaultStrategyConfiguration);
        return true;
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawAllRebalance() external override {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawRebalance(uint256 _redeemAmount) external override returns (bool) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(_redeemAmount, _vaultStrategyConfiguration);
        return true;
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
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function userDepositRebalanceWithCHI(uint256 _amount) external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(_amount, _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawRebalanceWithCHI(uint256 _redeemAmount) external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(_redeemAmount, _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function userWithdrawAllRebalanceWithCHI() external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    /**
     * @inheritdoc IVault
     */
    function discontinue() external override onlyRegistry {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
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
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
        }
    }

    /**
     * @inheritdoc IVault
     */
    function getPricePerFullShareWrite() external override returns (uint256) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (totalSupply() != 0) {
            pricePerShareWrite = _calVaultValueInUnderlyingTokenWrite(_vaultStrategyConfiguration)
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
     */
    function getPricePerFullShare() public view override returns (uint256) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (totalSupply() != 0) {
            return
                _calVaultValueInUnderlyingToken(_vaultStrategyConfiguration).mul(Constants.WEI_DECIMAL).div(
                    totalSupply()
                );
        } else {
            return uint256(0);
        }
    }

    /**
     * @inheritdoc IVault
     */
    function setRiskProfileCode(uint256 _riskProfileCode) public override onlyOperator returns (bool) {
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_riskProfileCode);
        require(_riskProfile.exists, "!Rp_Exists");
        riskProfileCode = _riskProfileCode;
        return true;
    }

    /**
     * @inheritdoc IVault
     */
    function setToken(address _underlyingToken) public override onlyOperator returns (bool) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        require(registryContract.isApprovedToken(_underlyingToken), "!tokens");
        underlyingToken = _underlyingToken;
        return true;
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
    function adminCall(bytes[] memory _codes) external override onlyOperator returns (bool) {
        executeCodes(_codes, "!adminCall");
        return true;
    }

    /**
     * @dev Deposit all the underlying assets to the current vault invest strategy
     * @param _vaultStrategyConfiguration the configuration for executing vault invest strategy
     */
    function _supplyAll(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration) internal {
        _batchMint(_vaultStrategyConfiguration);
        uint256 _steps =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getDepositAllStepsCount(investStrategyHash);

        for (uint256 _i; _i < _steps; _i++) {
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolDepositAllCodes(
                    payable(address(this)),
                    underlyingToken,
                    investStrategyHash,
                    _i,
                    _steps
                ),
                "!_supplyAll"
            );
        }
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
                "!_withdrawAll"
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
                "!claim"
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
                "!harvest"
            );
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getAddLiquidityCodes(
                    payable(address(this)),
                    underlyingToken,
                    _investStrategyHash
                ),
                "!harvest"
            );
        }
    }

    /**
     * @notice Cheap deposit of underlying asset
     * @dev Transfer underlying tokens to vault without rebalance
     *      User will have to wait for shares until next rebalance
     * @param _amount The amount of underlying asset to deposit
     * @return returns true on successful deposit of the underlying asset
     */
    function _userDeposit(uint256 _amount)
        internal
        ifNotPausedAndDiscontinued(address(this))
        nonReentrant
        returns (bool)
    {
        require(_amount > 0, "!(_amount>0)");
        uint256 _tokenBalanceBefore = _balance();
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _tokenBalanceAfter = _balance();
        uint256 _actualDepositAmount = _tokenBalanceAfter.sub(_tokenBalanceBefore);
        queue.push(DataTypes.UserDepositOperation(msg.sender, _actualDepositAmount));
        pendingDeposits[msg.sender] += _actualDepositAmount;
        depositQueue += _actualDepositAmount;
        emit DepositQueue(msg.sender, queue.length, _actualDepositAmount);
        return true;
    }

    /**
     * @dev Mint the shares for the users who deposited without rebalancing
     *      It also updates the user rewards
     * @param _vaultStrategyConfiguration the configuration for executing vault invest strategy
     * @return returns true on successful minting of shares and updating protocol rewards
     */
    function _batchMint(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration)
        internal
        returns (bool)
    {
        for (uint256 i; i < queue.length; i++) {
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserRewardsCodes(
                    address(this),
                    queue[i].account
                ),
                "!updateUserRewards"
            );
            _mintShares(queue[i].account, _balance(), queue[i].value);
            pendingDeposits[msg.sender] -= queue[i].value;
            depositQueue -= queue[i].value;
            executeCodes(
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserStateInVaultCodes(
                    address(this),
                    queue[i].account
                ),
                "!updateUserStateInVault"
            );
        }
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateRewardVaultRateAndIndexCodes(
                address(this)
            ),
            "!updateOptyVaultRateAndIndex"
        );
        delete queue;
        return true;
    }

    /**
     * @dev Transfer the underlying assets and immediately mints the shares
     *      It also updates the user rewards
     * @param _amount The amount of underlying asset to deposit
     * @param _vaultStrategyConfiguration the configuration for executing vault invest strategy
     * @return return true on successful execution of user deposit with rebalance
     */
    function _userDepositRebalance(
        uint256 _amount,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal ifNotPausedAndDiscontinued(address(this)) nonReentrant returns (bool) {
        require(_amount > 0, "!(_amount>0)");

        if (investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
        }

        uint256 _tokenBalanceBefore = _balance();
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _tokenBalanceAfter = _balance();
        uint256 _actualDepositAmount = _tokenBalanceAfter.sub(_tokenBalanceBefore);

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
            "!updateUserRewards"
        );
        _mint(msg.sender, shares);
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateRewardVaultRateAndIndexCodes(
                address(this)
            ),
            "!updateOptyVaultRateAndIndex"
        );
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserStateInVaultCodes(
                address(this),
                msg.sender
            ),
            "!updateUserStateInVault"
        );
        if (_balance() > 0) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                riskProfileCode,
                _underlyingTokens
            );
            _supplyAll(_vaultStrategyConfiguration);
        }
        return true;
    }

    /**
     * @dev Redeem the shares from the vault
     * @param _redeemAmount The amount of shares to be burned
     * @param _vaultStrategyConfiguration the configuration for executing vault invest strategy
     * @return returns true on successful user withdraw with rebalance
     */
    function _userWithdrawRebalance(
        uint256 _redeemAmount,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal nonReentrant returns (bool) {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(address(this));
        require(_vaultConfiguration.unpaused, "unpause");
        require(_redeemAmount > 0, "!_redeemAmount>0");
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "!!balance");
        if (!_vaultConfiguration.discontinued && investStrategyHash != Constants.ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
        }
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserRewardsCodes(
                address(this),
                msg.sender
            ),
            "!updateUserRewards"
        );
        // subtract pending deposit from total balance
        _redeemAndBurn(msg.sender, _balance().sub(depositQueue), _redeemAmount, _vaultStrategyConfiguration);

        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateRewardVaultRateAndIndexCodes(
                address(this)
            ),
            "!updateOptyVaultRateAndIndex"
        );
        executeCodes(
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getUpdateUserStateInVaultCodes(
                address(this),
                msg.sender
            ),
            "!updateUserStateInVault"
        );

        if (!_vaultConfiguration.discontinued && (_balance() > 0)) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                riskProfileCode,
                _underlyingTokens
            );
            _supplyAll(_vaultStrategyConfiguration);
        }
        return true;
    }

    function _beforeTokenTransfer(
        address from,
        address,
        uint256
    ) internal override {
        executeCodes(
            IStrategyManager(registryContract.getStrategyManager()).getUpdateUserRewardsCodes(address(this), from),
            "!_beforeTokenTransfer (updateUserRewards)"
        );
        executeCodes(
            IStrategyManager(registryContract.getStrategyManager()).getUpdateRewardVaultRateAndIndexCodes(
                address(this)
            ),
            "!updateOptyVaultRateAndIndex"
        );
        executeCodes(
            IStrategyManager(registryContract.getStrategyManager()).getUpdateUserStateInVaultCodes(
                address(this),
                msg.sender
            ),
            "!updateUserStateInVault"
        );
    }

    /**
     * @dev This function computes the market value of shares
     * @param _vaultStrategyConfiguration configuration for calculating market value of shares
     * @return _vaultValue the market value of the shares
     */
    function _calVaultValueInUnderlyingToken(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration)
        internal
        view
        returns (uint256 _vaultValue)
    {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            uint256 balanceInUnderlyingToken =
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getBalanceInUnderlyingToken(
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
    function _calVaultValueInUnderlyingTokenWrite(
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal returns (uint256 _vaultValue) {
        if (investStrategyHash != Constants.ZERO_BYTES32) {
            uint256 balanceInUnderlyingToken =
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getBalanceInUnderlyingTokenWrite(
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
     * @dev Mechanism to stop the vault value deviating from maxVaultValueJump
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
                "!maxVaultValueJump"
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
            "!TreasuryRedeemAmt"
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
        }
    }
}
