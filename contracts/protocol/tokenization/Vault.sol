// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { IVault } from "../../interfaces/opty/IVault.sol";
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Deployer } from "../../dependencies/chi/ChiDeployer.sol";
import { VersionedInitializable } from "../../dependencies/openzeppelin/VersionedInitializable.sol";
import { SafeERC20, IERC20, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IncentivisedERC20 } from "./IncentivisedERC20.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import { VaultStorage } from "./VaultStorage.sol";
import { IStrategyManager } from "../../interfaces/opty/IStrategyManager.sol";
import { IRegistry } from "../../interfaces/opty/IRegistry.sol";
import { IRiskManager } from "../../interfaces/opty/IRiskManager.sol";
import { IOPTYMinter } from "../../interfaces/opty/IOPTYMinter.sol";
import { IOPTYStakingVault } from "../../interfaces/opty/IOPTYStakingVault.sol";
import { MultiCall } from "../../utils/MultiCall.sol";

/**
 * @title Vault
 *
 * @author Opty.fi, inspired by the Aave V2 AToken.sol contract
 *
 * @dev Opty.Fi's Vault contract for underlying tokens (for example DAI) and risk profiles (for example RP1)
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

    uint256 public constant opTOKEN_REVISION = 0x1;

    /* solhint-disable no-empty-blocks */
    constructor(
        address _registry,
        string memory _name,
        string memory _symbol,
        string memory _riskProfile
    )
        public
        IncentivisedERC20(
            string(abi.encodePacked("op ", _name, " ", _riskProfile, " vault")),
            string(abi.encodePacked("op", _symbol, _riskProfile, "Vault"))
        )
        Modifiers(_registry)
    {}

    /* solhint-disable no-empty-blocks */

    function getRevision() internal pure virtual override returns (uint256) {
        return opTOKEN_REVISION;
    }

    function initialize(
        address _registry,
        address _underlyingToken,
        string memory _name,
        string memory _symbol,
        string memory _riskProfile
    ) external virtual initializer {
        require(bytes(_name).length > 0, "Name_Empty!");
        require(bytes(_symbol).length > 0, "Symbol_Empty!");
        registryContract = IRegistry(_registry);
        setProfile(_riskProfile);
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        _setName(string(abi.encodePacked("op ", _name, " ", _riskProfile, " vault")));
        _setSymbol(string(abi.encodePacked("op", _symbol, _riskProfile, "Vault")));
        _setDecimals(IncentivisedERC20(_underlyingToken).decimals());
    }

    function setProfile(string memory _profile) public override onlyOperator returns (bool _success) {
        require(bytes(_profile).length > 0, "Profile_Empty!");
        DataTypes.RiskProfile memory _riskProfile = registryContract.getRiskProfile(_profile);
        require(_riskProfile.exists, "!Rp_Exists");
        profile = _profile;
        _success = true;
    }

    function setToken(address _underlyingToken) public override onlyOperator returns (bool _success) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        require(registryContract.isApprovedToken(_underlyingToken), "!tokens");
        underlyingToken = _underlyingToken;
        _success = true;
    }

    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external override onlyGovernance returns (bool _success) {
        maxVaultValueJump = _maxVaultValueJump;
        _success = true;
    }

    function _supplyAll(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
    {
        uint256 _tokenBalance = IERC20(underlyingToken).balanceOf(address(this));
        require(_tokenBalance > 0, "!amount>0");
        _batchMintAndBurn(_vaultStrategyConfiguration);
        uint8 _steps =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getDepositAllStepCount(investStrategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            bytes[] memory _codes =
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolDepositAllCodes(
                    payable(address(this)),
                    underlyingToken,
                    investStrategyHash,
                    _i,
                    _steps
                );
            executeCodes(_codes, "!_supplyAll");
        }
        vaultValue = _calVaultValueInUnderlyingToken(_vaultStrategyConfiguration);
    }

    function rebalance() external override ifNotDiscontinued(address(this)) ifNotPaused(address(this)) {
        uint256 _gasInitial;

        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();

        if (msg.sender == _vaultStrategyConfiguration.operator) {
            _gasInitial = gasleft();
        }

        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = underlyingToken;
        bytes32 newStrategyHash =
            IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(profile, _underlyingTokens);
        if (
            keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(investStrategyHash)) &&
            investStrategyHash != ZERO_BYTES32
        ) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
            if (msg.sender == _vaultStrategyConfiguration.operator && gasOwedToOperator != uint256(0)) {
                address[] memory _path = new address[](2);
                _path[0] = IUniswapV2Router02(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D)).WETH();
                _path[1] = underlyingToken;
                uint256[] memory _amounts =
                    IUniswapV2Router02(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D)).getAmountsOut(
                        gasOwedToOperator,
                        _path
                    );
                uint256 _gasToTransfer = _amounts[1];
                gasOwedToOperator = uint256(0);
                IERC20(underlyingToken).safeTransfer(_vaultStrategyConfiguration.operator, _gasToTransfer);
            }
        }

        investStrategyHash = newStrategyHash;
        if (_balance() > 0) {
            _emergencyBrake(_balance());
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                profile,
                _underlyingTokens
            );
            _supplyAll(_vaultStrategyConfiguration);
        }

        if (msg.sender == _vaultStrategyConfiguration.operator) {
            uint256 _gasFinal = gasleft();
            uint256 _gasBurned = _gasInitial.sub(_gasFinal);
            uint256 _gasCost = _gasBurned.mul(tx.gasprice);
            gasOwedToOperator = gasOwedToOperator.add(_gasCost);
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
    function _calVaultValueInUnderlyingToken(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration)
        internal
        view
        returns (uint256)
    {
        if (investStrategyHash != ZERO_BYTES32) {
            uint256 balanceInUnderlyingToken =
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getBalanceInUnderlyingToken(
                    payable(address(this)),
                    underlyingToken,
                    investStrategyHash
                );
            return balanceInUnderlyingToken.add(_balance()).sub(depositQueue);
        }
        return _balance().sub(depositQueue);
    }

    /**
     * @dev Function to get the underlying token balance of OptyVault Contract
     */
    function balance() external view override returns (uint256) {
        return _balance();
    }

    /**
     * @dev Internal function to get the underlying token balance of OptyVault Contract
     */
    function _balance() internal view returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }

    function _withdrawAll(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration) internal {
        uint8 _steps =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getWithdrawAllStepsCount(investStrategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            uint8 _iterator = _steps - 1 - _i;
            bytes[] memory _codes =
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolWithdrawAllCodes(
                    payable(address(this)),
                    underlyingToken,
                    investStrategyHash,
                    _iterator,
                    _steps
                );
            executeCodes(_codes, "!_withdrawAll");
        }
    }

    function harvest(bytes32 _investStrategyHash) external override {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _harvest(_investStrategyHash, _vaultStrategyConfiguration);
    }

    function _harvest(
        bytes32 _investStrategyHash,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal {
        uint8 _claimRewardSteps =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getClaimRewardStepsCount(_investStrategyHash);
        for (uint8 _i = 0; _i < _claimRewardSteps; _i++) {
            bytes[] memory _codes =
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolClaimAllRewardCodes(
                    payable(address(this)),
                    _investStrategyHash,
                    _i,
                    _claimRewardSteps
                );
            executeCodes(_codes, "!claim");
        }

        (, , address _rewardToken) =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getLpAdapterRewardToken(_investStrategyHash);
        if (_rewardToken != address(0)) {
            bytes32 _vaultRewardTokenHash = keccak256(abi.encodePacked([address(this), _rewardToken]));
            DataTypes.VaultRewardStrategy memory _vaultRewardStrategy =
                IRiskManager(_vaultStrategyConfiguration.riskManager).getVaultRewardTokenStrategy(
                    _vaultRewardTokenHash
                );

            uint8 _harvestSteps =
                IStrategyManager(_vaultStrategyConfiguration.strategyManager).getHarvestRewardStepsCount(
                    _investStrategyHash
                );
            for (uint8 _i = 0; _i < _harvestSteps; _i++) {
                bytes[] memory _codes =
                    (_vaultRewardStrategy.hold == uint256(0) && _vaultRewardStrategy.convert == uint256(0))
                        ? IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolHarvestAllRewardCodes(
                            payable(address(this)),
                            underlyingToken,
                            _investStrategyHash,
                            _i,
                            _harvestSteps
                        )
                        : IStrategyManager(_vaultStrategyConfiguration.strategyManager).getPoolHarvestSomeRewardCodes(
                            payable(address(this)),
                            underlyingToken,
                            _investStrategyHash,
                            _vaultRewardStrategy.convert,
                            _i,
                            _harvestSteps
                        );
                executeCodes(_codes, "!harvest");
            }
        }
    }

    function userDepositAll() external override {
        _userDeposit(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    function userDeposit(uint256 _amount) external override returns (bool) {
        _userDeposit(_amount);
    }

    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function _userDeposit(uint256 _amount)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        require(_amount > 0, "!(_amount>0)");
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        queue.push(DataTypes.Operation(msg.sender, true, _amount));
        pendingDeposits[msg.sender] += _amount;
        depositQueue += _amount;
        emit DepositQueue(msg.sender, queue.length, _amount);
        _success = true;
    }

    function userDepositAndStake(uint256 _amount, address _stakingVault) external override returns (bool) {
        _userDepositAndStake(_amount, _stakingVault);
    }

    function _userDepositAndStake(uint256 _amount, address _stakingVault)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        _userDeposit(_amount);
        IOPTYMinter _optyMinterContract = IOPTYMinter(registryContract.getOptyMinter());
        uint256 _optyAmount = _optyMinterContract.claimOpty(msg.sender);
        IOPTYStakingVault(_stakingVault).userStake(_optyAmount);
        _success = true;
    }

    function userDepositAllAndStake(address _stakingVault) external override returns (bool) {
        _userDepositAllAndStake(_stakingVault);
    }

    function _userDepositAllAndStake(address _stakingVault)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        _userDepositAndStake(IERC20(underlyingToken).balanceOf(msg.sender), _stakingVault);
        _success = true;
    }

    function _batchMintAndBurn(DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration)
        internal
        returns (bool _success)
    {
        for (uint256 i = 0; i < queue.length; i++) {
            if (queue[i].isDeposit) {
                _mintShares(queue[i].account, _balance(), queue[i].value);
                pendingDeposits[msg.sender] -= queue[i].value;
                depositQueue -= queue[i].value;
            } else {
                _redeemAndBurn(queue[i].account, _balance(), queue[i].value, _vaultStrategyConfiguration);
                pendingWithdraws[msg.sender] -= queue[i].value;
                withdrawQueue -= queue[i].value;
            }
            IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateUserStateInVault(address(this), queue[i].account);
        }
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateOptyVaultRatePerSecondAndVaultToken(address(this));
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateOptyVaultIndex(address(this));
        delete queue;
        _success = true;
    }

    function userDepositAllRebalance() external override {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    function userDepositRebalance(uint256 _amount) external override returns (bool) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(_amount, _vaultStrategyConfiguration);
    }

    /**
     * @dev Depositing asset like DAI and minting op tokens to caller
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function _userDepositRebalance(
        uint256 _amount,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal ifNotDiscontinued(address(this)) ifNotPaused(address(this)) nonReentrant returns (bool _success) {
        require(_amount > 0, "!(_amount>0)");

        if (investStrategyHash != ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
        }

        uint256 _tokenBalanceBefore = _balance();
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _tokenBalanceAfter = _balance();
        uint256 _tokenBalanceDiff = _tokenBalanceAfter.sub(_tokenBalanceBefore);

        uint256 shares = 0;

        if (_tokenBalanceBefore == 0 || totalSupply() == 0) {
            shares = _tokenBalanceDiff;
        } else {
            shares = (_tokenBalanceDiff.mul(totalSupply())).div((_tokenBalanceBefore));
        }

        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateUserRewards(address(this), msg.sender);
        _mint(msg.sender, shares);
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateOptyVaultRatePerSecondAndVaultToken(address(this));
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateOptyVaultIndex(address(this));
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateUserStateInVault(address(this), msg.sender);
        if (_balance() > 0) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                profile,
                _underlyingTokens
            );
            _supplyAll(_vaultStrategyConfiguration);
        }
        _success = true;
    }

    function userDepositRebalanceAndStake(uint256 _amount, address _stakingVault) external override returns (bool) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalanceAndStake(_amount, _stakingVault, _vaultStrategyConfiguration);
    }

    function _userDepositRebalanceAndStake(
        uint256 _amount,
        address _stakingVault,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal ifNotDiscontinued(address(this)) ifNotPaused(address(this)) nonReentrant returns (bool _success) {
        _userDepositRebalance(_amount, _vaultStrategyConfiguration);
        uint256 _optyAmount = IOPTYMinter(_vaultStrategyConfiguration.optyMinter).claimOpty(msg.sender);
        IOPTYStakingVault(_stakingVault).userStake(_optyAmount);
        _success = true;
    }

    function userDepositAllRebalanceAndStake(address _stakingVault) external override returns (bool) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositAllRebalanceAndStake(_stakingVault, _vaultStrategyConfiguration);
    }

    function _userDepositAllRebalanceAndStake(
        address _stakingVault,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal ifNotDiscontinued(address(this)) ifNotPaused(address(this)) nonReentrant returns (bool _success) {
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender), _vaultStrategyConfiguration);
        uint256 _optyAmount = IOPTYMinter(_vaultStrategyConfiguration.optyMinter).claimOpty(msg.sender);
        IOPTYStakingVault(_stakingVault).userStake(_optyAmount);
        _success = true;
    }

    function userWithdrawAllRebalance() external override {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    function userWithdrawRebalance(uint256 _redeemAmount) external override returns (bool) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(_redeemAmount, _vaultStrategyConfiguration);
    }

    /**
     * @dev Function to withdraw the vault tokens from the vault (for example cDAI)
     *
     * Requirements:
     *  -   contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the vault. Its units are:
     *      in weth uints i.e. 1e18
     */
    function _userWithdrawRebalance(
        uint256 _redeemAmount,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) internal ifNotPaused(address(this)) nonReentrant returns (bool) {
        require(_redeemAmount > 0, "!_redeemAmount>0");
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "!!balance");

        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(address(this));
        if (!_vaultConfiguration.discontinued && investStrategyHash != ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
        }
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateUserRewards(address(this), msg.sender);

        // subtract pending deposit from total balance
        _redeemAndBurn(msg.sender, _balance().sub(depositQueue), _redeemAmount, _vaultStrategyConfiguration);

        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateOptyVaultRatePerSecondAndVaultToken(address(this));
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateOptyVaultIndex(address(this));
        IOPTYMinter(_vaultStrategyConfiguration.optyMinter).updateUserStateInVault(address(this), msg.sender);

        if (!_vaultConfiguration.discontinued && (_balance() > 0)) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = IRiskManager(_vaultStrategyConfiguration.riskManager).getBestStrategy(
                profile,
                _underlyingTokens
            );
            _supplyAll(_vaultStrategyConfiguration);
        }
        return true;
    }

    function userDepositAllWithCHI() external override discountCHI {
        _userDeposit(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    function userDepositAllAndStakeWithCHI(address _stakingVault) external override discountCHI {
        _userDepositAllAndStake(_stakingVault);
    }

    function userDepositWithCHI(uint256 _amount) external override discountCHI {
        _userDeposit(_amount);
    }

    function userDepositAndStakeWithCHI(uint256 _amount, address _stakingVault) external override discountCHI {
        _userDepositAndStake(_amount, _stakingVault);
    }

    function userDepositAllRebalanceWithCHI() external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    function userDepositRebalanceWithCHI(uint256 _amount) external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalance(_amount, _vaultStrategyConfiguration);
    }

    function userDepositRebalanceAndStakeWithCHI(uint256 _amount, address _stakingVault) external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositRebalanceAndStake(_amount, _stakingVault, _vaultStrategyConfiguration);
    }

    function userDepositAllRebalanceAndStakeWithCHI(address _stakingVault) external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userDepositAllRebalanceAndStake(_stakingVault, _vaultStrategyConfiguration);
    }

    function userWithdrawRebalanceWithCHI(uint256 _redeemAmount) external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(_redeemAmount, _vaultStrategyConfiguration);
    }

    function userWithdrawAllRebalanceWithCHI() external override discountCHI {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        _userWithdrawRebalance(balanceOf(msg.sender), _vaultStrategyConfiguration);
    }

    function _emergencyBrake(uint256 _vaultValue) private returns (bool) {
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

    function _abs(uint256 _a, uint256 _b) internal pure returns (uint256) {
        if (_a > _b) {
            return _a.sub(_b);
        }
        return _b.sub(_a);
    }

    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) public view override returns (bool) {
        return (_diff.mul(10000)).div(_currentVaultValue) < maxVaultValueJump;
    }

    function _redeemAndBurn(
        address _account,
        uint256 _balanceInUnderlyingToken,
        uint256 _redeemAmount,
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration
    ) private {
        uint256 redeemAmountInToken = (_balanceInUnderlyingToken.mul(_redeemAmount)).div(totalSupply());
        //  Updating the totalSupply of op tokens
        _burn(msg.sender, _redeemAmount);
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(address(this));
        (bytes[] memory _treasuryCodes, bytes memory _accountCode) =
            IStrategyManager(_vaultStrategyConfiguration.strategyManager).getFeeTransferAllCodes(
                registryContract.getTreasuryShares(address(this)),
                _account,
                underlyingToken,
                redeemAmountInToken,
                _vaultConfiguration.withdrawalFee
            );
        if (_treasuryCodes.length > 0) {
            executeCodes(_treasuryCodes, "!TreasuryRedeemAmt");
        }
        if (_accountCode.length > 0) {
            executeCode(_accountCode, "!CallerRedeemAmt");
        }
    }

    function _mintShares(
        address _account,
        uint256 _balanceInUnderlyingToken,
        uint256 _depositAmount
    ) private {
        if (_balanceInUnderlyingToken > depositQueue) {
            _mint(_account, (_depositAmount.mul(totalSupply())).div(_balanceInUnderlyingToken.sub(depositQueue)));
        }
    }

    function getPricePerFullShare() public view override returns (uint256) {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (totalSupply() != 0) {
            return _calVaultValueInUnderlyingToken(_vaultStrategyConfiguration).div(totalSupply());
        }
        return uint256(0);
    }

    function discontinue() public override onlyRegistry {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (investStrategyHash != ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
        }
    }

    function setUnpaused(bool _unpaused) public override onlyRegistry {
        DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration =
            registryContract.getVaultStrategyConfiguration();
        if (!_unpaused && investStrategyHash != ZERO_BYTES32) {
            _withdrawAll(_vaultStrategyConfiguration);
            _harvest(investStrategyHash, _vaultStrategyConfiguration);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address,
        uint256
    ) internal override {
        IOPTYMinter _optyMinterContract = IOPTYMinter(registryContract.getOptyMinter());
        _optyMinterContract.updateUserRewards(address(this), from);
        _optyMinterContract.updateOptyVaultRatePerSecondAndVaultToken(address(this));
        _optyMinterContract.updateOptyVaultIndex(address(this));
        _optyMinterContract.updateUserStateInVault(address(this), from);
    }
}
