// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { IVault } from "../../interfaces/opty/IVault.sol";
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Deployer } from "../../dependencies/chi/ChiDeployer.sol";
import { VersionedInitializable } from "../../dependencies/openzeppelin/VersionedInitializable.sol";
import { SafeERC20, IERC20, SafeMath, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IncentivisedERC20 } from "./IncentivisedERC20.sol";
import { Modifiers } from "../configuration/Modifiers.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import { VaultStorage } from "./VaultStorage.sol";
import { Registry } from "../configuration/Registry.sol";
import { OPTYMinter } from "./OPTYMinter.sol";
import { OPTYStakingVault } from "./OPTYStakingVault.sol";
import { RiskManager } from "../configuration/RiskManager.sol";
import { StrategyManager } from "../configuration/StrategyManager.sol";

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
    Modifiers,
    ReentrancyGuard,
    VaultStorage,
    Deployer
{
    using SafeERC20 for IERC20;
    using Address for address;

    uint256 public constant opTOKEN_REVISION = 0x1;

    event DepositQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
    event WithdrawQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);

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
        address registry,
        address _riskManager,
        address _underlyingToken,
        address _strategyManager,
        address _optyMinter,
        string memory _name,
        string memory _symbol,
        string memory _riskProfile
    ) external virtual initializer {
        require(bytes(_name).length > 0, "Name_Empty!");
        require(bytes(_symbol).length > 0, "Symbol_Empty!");
        registryContract = Registry(registry);
        setProfile(_riskProfile);
        setRiskManager(_riskManager);
        setToken(_underlyingToken);
        setStrategyManager(_strategyManager);
        setOPTYMinter(_optyMinter);
        _setName(string(abi.encodePacked("op ", _name, " ", _riskProfile, " vault")));
        _setSymbol(string(abi.encodePacked("op", _symbol, _riskProfile, "Vault")));
        _setDecimals(IncentivisedERC20(_underlyingToken).decimals());
    }

    function setProfile(string memory _profile) public override onlyOperator returns (bool _success) {
        require(bytes(_profile).length > 0, "Profile_Empty!");
        (, , , , bool _profileExists) = registryContract.riskProfiles(_profile);
        require(_profileExists, "!Rp_Exists");
        profile = _profile;
        _success = true;
    }

    function setOPTYMinter(address _optyMinter) public override onlyOperator returns (bool _success) {
        require(_optyMinter != address(0), "!_optyMinter");
        require(_optyMinter.isContract(), "!_optyMinter.isContract");
        optyMinterContract = OPTYMinter(_optyMinter);
        _success = true;
    }

    function setRiskManager(address _riskManager) public override onlyOperator returns (bool _success) {
        require(_riskManager.isContract(), "!_riskManager.isContract");
        riskManagerContract = RiskManager(_riskManager);
        _success = true;
    }

    function setToken(address _underlyingToken) public override onlyOperator returns (bool _success) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        require(registryContract.tokens(_underlyingToken), "!tokens");
        underlyingToken = _underlyingToken;
        _success = true;
    }

    function setStrategyManager(address _strategyManager) public override onlyOperator returns (bool _success) {
        require(_strategyManager.isContract(), "!__strategyManager.isContract");
        strategyManagerContract = StrategyManager(_strategyManager);
        _success = true;
    }

    function setMaxVaultValueJump(uint256 _maxVaultValueJump) public override onlyGovernance returns (bool _success) {
        maxVaultValueJump = _maxVaultValueJump;
        _success = true;
    }

    function setWithdrawalFee(uint256 _withdrawalFee) public override onlyGovernance returns (bool _success) {
        withdrawalFee = _withdrawalFee;
        _success = true;
    }

    function _supplyAll() internal ifNotDiscontinued(address(this)) ifNotPaused(address(this)) {
        uint256 _tokenBalance = IERC20(underlyingToken).balanceOf(address(this));
        require(_tokenBalance > 0, "!amount>0");
        _batchMintAndBurn();
        uint8 _steps = strategyManagerContract.getDepositAllStepCount(investStrategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            bytes[] memory _codes =
                strategyManagerContract.getPoolDepositAllCodes(
                    payable(address(this)),
                    underlyingToken,
                    investStrategyHash,
                    _i,
                    _steps
                );
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data); //solhint-disable-line avoid-low-level-calls
                require(success, "!_supplyAll");
            }
        }
        vaultValue = _calVaultValueInUnderlyingToken();
    }

    function rebalance() public override ifNotDiscontinued(address(this)) ifNotPaused(address(this)) {
        uint256 _gasInitial;

        if (msg.sender == registryContract.operator()) {
            _gasInitial = gasleft();
        }

        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = underlyingToken;
        bytes32 newStrategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
        if (
            keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(investStrategyHash)) &&
            investStrategyHash != ZERO_BYTES32
        ) {
            _withdrawAll();
            _harvest(investStrategyHash);
            if (msg.sender == registryContract.operator() && gasOwedToOperator != uint256(0)) {
                address[] memory _path = new address[](2);
                _path[0] = IUniswapV2Router02(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D)).WETH();
                _path[1] = underlyingToken;
                uint256[] memory _amounts =
                    IUniswapV2Router02(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D)).getAmountsOut(
                        gasOwedToOperator,
                        _path
                    );
                uint256 _gasToTransfer = _amounts[1];
                IERC20(underlyingToken).safeTransfer(registryContract.operator(), _gasToTransfer);
            }
        }

        investStrategyHash = newStrategyHash;

        if (_balance() > 0) {
            _emergencyBrake(_balance());
            investStrategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
        }

        if (msg.sender == registryContract.operator()) {
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
    function _calVaultValueInUnderlyingToken() internal view returns (uint256) {
        if (investStrategyHash != ZERO_BYTES32) {
            uint256 balanceInUnderlyingToken =
                strategyManagerContract.getBalanceInUnderlyingToken(
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

    function _withdrawAll() internal {
        uint8 _steps = strategyManagerContract.getWithdrawAllStepsCount(investStrategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            uint8 _iterator = _steps - 1 - _i;
            bytes[] memory _codes =
                strategyManagerContract.getPoolWithdrawAllCodes(
                    payable(address(this)),
                    underlyingToken,
                    investStrategyHash,
                    _iterator,
                    _steps
                );
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool _success, ) = pool.call(data); //solhint-disable-line avoid-low-level-calls
                require(_success, "!_withdrawAll");
            }
        }
    }

    function harvest(bytes32 _investStrategyHash) external override {
        _harvest(_investStrategyHash);
    }

    function _harvest(bytes32 _investStrategyHash) internal {
        uint8 _claimRewardSteps = strategyManagerContract.getClaimRewardStepsCount(_investStrategyHash);
        for (uint8 _i = 0; _i < _claimRewardSteps; _i++) {
            bytes[] memory _codes =
                strategyManagerContract.getPoolClaimAllRewardCodes(
                    payable(address(this)),
                    _investStrategyHash,
                    _i,
                    _claimRewardSteps
                );
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data); //solhint-disable-line avoid-low-level-calls
                require(success, "!claim");
            }
        }

        (, , address _rewardToken) = strategyManagerContract.getLpAdapterRewardToken(_investStrategyHash);
        if (_rewardToken != address(0)) {
            bytes32 _vaultRewardTokenHash = keccak256(abi.encodePacked([address(this), _rewardToken]));
            DataTypes.VaultRewardStrategy memory _vaultRewardStrategy =
                riskManagerContract.getVaultRewardTokenStrategy(_vaultRewardTokenHash);

            uint8 _harvestSteps = strategyManagerContract.getHarvestRewardStepsCount(_investStrategyHash);
            for (uint8 _i = 0; _i < _harvestSteps; _i++) {
                bytes[] memory _codes =
                    (_vaultRewardStrategy.hold == uint256(0) && _vaultRewardStrategy.convert == uint256(0))
                        ? strategyManagerContract.getPoolHarvestAllRewardCodes(
                            payable(address(this)),
                            underlyingToken,
                            _investStrategyHash,
                            _i,
                            _harvestSteps
                        )
                        : strategyManagerContract.getPoolHarvestSomeRewardCodes(
                            payable(address(this)),
                            underlyingToken,
                            _investStrategyHash,
                            _vaultRewardStrategy.convert,
                            _i,
                            _harvestSteps
                        );
                for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                    (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                    (bool success, ) = pool.call(data); //solhint-disable-line avoid-low-level-calls
                    require(success, "!harvest");
                }
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
        uint256 _optyAmount = optyMinterContract.claimOpty(msg.sender);
        OPTYStakingVault _optyStakingVault = OPTYStakingVault(_stakingVault);
        _optyStakingVault.userStake(_optyAmount);
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

    function _batchMintAndBurn() internal returns (bool _success) {
        for (uint256 i = 0; i < queue.length; i++) {
            if (queue[i].isDeposit) {
                _mintShares(queue[i].account, _balance(), queue[i].value);
                pendingDeposits[msg.sender] -= queue[i].value;
                depositQueue -= queue[i].value;
            } else {
                _redeemAndBurn(queue[i].account, _balance(), queue[i].value);
                pendingWithdraws[msg.sender] -= queue[i].value;
                withdrawQueue -= queue[i].value;
            }
            optyMinterContract.updateUserStateInVault(address(this), queue[i].account);
        }
        optyMinterContract.updateOptyVaultRatePerSecondAndVaultToken(address(this));
        optyMinterContract.updateOptyVaultIndex(address(this));
        delete queue;
        _success = true;
    }

    function userDepositAllRebalance() external override {
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    function userDepositRebalance(uint256 _amount) external override returns (bool) {
        _userDepositRebalance(_amount);
    }

    /**
     * @dev Depositing asset like DAI and minting op tokens to caller
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function _userDepositRebalance(uint256 _amount)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        require(_amount > 0, "!(_amount>0)");

        if (investStrategyHash != ZERO_BYTES32) {
            _withdrawAll();
            _harvest(investStrategyHash);
        }

        uint256 _tokenBalance = _balance();
        uint256 shares = 0;

        if (_tokenBalance == 0 || totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div((_tokenBalance));
        }

        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);

        optyMinterContract.updateUserRewards(address(this), msg.sender);
        _mint(msg.sender, shares);
        optyMinterContract.updateOptyVaultRatePerSecondAndVaultToken(address(this));
        optyMinterContract.updateOptyVaultIndex(address(this));
        optyMinterContract.updateUserStateInVault(address(this), msg.sender);
        if (_balance() > 0) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
        }
        _success = true;
    }

    function userDepositRebalanceAndStake(uint256 _amount, address _stakingVault) external override returns (bool) {
        _userDepositRebalanceAndStake(_amount, _stakingVault);
    }

    function _userDepositRebalanceAndStake(uint256 _amount, address _stakingVault)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        _userDepositRebalance(_amount);
        uint256 _optyAmount = optyMinterContract.claimOpty(msg.sender);
        OPTYStakingVault _optyStakingVault = OPTYStakingVault(_stakingVault);
        _optyStakingVault.userStake(_optyAmount);
        _success = true;
    }

    function userDepositAllRebalanceAndStake(address _stakingVault) external override returns (bool) {
        _userDepositAllRebalanceAndStake(_stakingVault);
    }

    function _userDepositAllRebalanceAndStake(address _stakingVault)
        internal
        ifNotDiscontinued(address(this))
        ifNotPaused(address(this))
        nonReentrant
        returns (bool _success)
    {
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender));
        uint256 _optyAmount = optyMinterContract.claimOpty(msg.sender);
        OPTYStakingVault _optyStakingVault = OPTYStakingVault(_stakingVault);
        _optyStakingVault.userStake(_optyAmount);
        _success = true;
    }

    function userWithdrawAllRebalance() external override {
        _userWithdrawRebalance(balanceOf(msg.sender));
    }

    function userWithdrawRebalance(uint256 _redeemAmount) external override returns (bool) {
        _userWithdrawRebalance(_redeemAmount);
    }

    /**
     * @dev Function to withdraw the vault tokens from the vault (for example cDAI)
     *
     * Requirements:
     *  -   contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the vault. Its units are:
     *      in weth uints i.e. 1e18
     */
    function _userWithdrawRebalance(uint256 _redeemAmount)
        internal
        ifNotPaused(address(this))
        nonReentrant
        returns (bool)
    {
        require(_redeemAmount > 0, "!_redeemAmount>0");
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "!!balance");

        (bool _discontinued, ) = registryContract.vaultToVaultActivityState(address(this));
        if (!_discontinued && investStrategyHash != ZERO_BYTES32) {
            _withdrawAll();
            _harvest(investStrategyHash);
        }

        optyMinterContract.updateUserRewards(address(this), msg.sender);

        // subtract pending deposit from total balance
        _redeemAndBurn(msg.sender, _balance().sub(depositQueue), _redeemAmount);

        optyMinterContract.updateOptyVaultRatePerSecondAndVaultToken(address(this));
        optyMinterContract.updateOptyVaultIndex(address(this));
        optyMinterContract.updateUserStateInVault(address(this), msg.sender);

        if (!_discontinued && (_balance() > 0)) {
            _emergencyBrake(_balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            investStrategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
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
        _userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    function userDepositRebalanceWithCHI(uint256 _amount) external override discountCHI {
        _userDepositRebalance(_amount);
    }

    function userDepositRebalanceAndStakeWithCHI(uint256 _amount, address _stakingVault) external override discountCHI {
        _userDepositRebalanceAndStake(_amount, _stakingVault);
    }

    function userDepositAllRebalanceAndStakeWithCHI(address _stakingVault) external override discountCHI {
        _userDepositAllRebalanceAndStake(_stakingVault);
    }

    function userWithdrawRebalanceWithCHI(uint256 _redeemAmount) external override discountCHI {
        _userWithdrawRebalance(_redeemAmount);
    }

    function userWithdrawAllRebalanceWithCHI() external override discountCHI {
        _userWithdrawRebalance(balanceOf(msg.sender));
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
                        blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMaxVaultValue
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
        return (_diff.div(_currentVaultValue)).mul(10000) < maxVaultValueJump;
    }

    function _redeemAndBurn(
        address _account,
        uint256 _balanceInUnderlyingToken,
        uint256 _redeemAmount
    ) private {
        uint256 redeemAmountInToken = (_balanceInUnderlyingToken.mul(_redeemAmount)).div(totalSupply());
        address _treasury = registryContract.treasury();
        uint256 _fee = 0;
        //  Updating the totalSupply of op tokens
        _burn(msg.sender, _redeemAmount);
        if (_treasury != address(0) && withdrawalFee > 0) {
            _fee = ((redeemAmountInToken).mul(withdrawalFee)).div(WITHDRAWAL_MAX);
            IERC20(underlyingToken).safeTransfer(_treasury, _fee);
        }
        IERC20(underlyingToken).safeTransfer(_account, redeemAmountInToken.sub(_fee));
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
        if (totalSupply() != 0) {
            return _calVaultValueInUnderlyingToken().div(totalSupply());
        }
        return uint256(0);
    }

    function discontinue() public override onlyRegistry {
        if (investStrategyHash != ZERO_BYTES32) {
            _withdrawAll();
            _harvest(investStrategyHash);
        }
    }

    function setUnpaused(bool _unpaused) public override onlyRegistry {
        if (!_unpaused && investStrategyHash != ZERO_BYTES32) {
            _withdrawAll();
            _harvest(investStrategyHash);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address,
        uint256
    ) internal override {
        optyMinterContract.updateUserRewards(address(this), from);
        optyMinterContract.updateOptyVaultRatePerSecondAndVaultToken(address(this));
        optyMinterContract.updateOptyVaultIndex(address(this));
        optyMinterContract.updateUserStateInVault(address(this), from);
    }
}
