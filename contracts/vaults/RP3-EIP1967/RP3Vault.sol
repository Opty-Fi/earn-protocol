// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../../utils/ReentrancyGuard.sol";
import "./../../utils/ChiDeployer.sol";
import "./../../RiskManager.sol";
import "./../VaultStorage.sol";
import "./../../interfaces/opty/IVault.sol";
import "./../../utils/ERC20Upgradeable/VersionedInitializable.sol";
import "./../../utils/Modifiers.sol";
import "./../../libraries/SafeERC20.sol";

/**
 * @title RP3Vault
 *
 * @author Opty.fi, inspired by the Aave V2 AToken.sol contract
 *
 * @dev Opty.Fi's RP3 Vault contract for underlying tokens (for example DAI)
 */
contract RP3Vault is VersionedInitializable, IVault, ERC20, Modifiers, ReentrancyGuard, VaultStorage, Deployer {
    using SafeERC20 for IERC20;
    using Address for address;
    
    uint256 public constant opTOKEN_REVISION = 0x1;
    
    constructor(
        address _registry,
        address _underlyingToken
    )
        public
        ERC20(
            string(abi.encodePacked("op ", ERC20(_underlyingToken).name(), " RP3", " vault")),
            string(abi.encodePacked("op", ERC20(_underlyingToken).symbol(), "RP3Vault"))
        )
        Modifiers(_registry)
    {
        
    }
    
    function getRevision() internal pure virtual override returns (uint256) {
        return opTOKEN_REVISION;
    }
    
    function initialize(
        address registry,
        address _riskManager,
        address _underlyingToken,
        address _strategyManager,
        address _optyMinter
    ) external virtual initializer {
        registryContract = Registry(registry);
        setProfile("RP3");
        setRiskManager(_riskManager);
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        setStrategyManager(_strategyManager);
        setOPTYMinter(_optyMinter);
        _setName(string(abi.encodePacked("op ", ERC20(_underlyingToken).name(), " RP3", " vault")));
        _setSymbol(string(abi.encodePacked("op", ERC20(_underlyingToken).symbol(), "RP3Vault")));
        _setDecimals(ERC20(_underlyingToken).decimals());
    }

    function setProfile(string memory _profile) public override onlyOperator returns (bool _success) {
        require(bytes(_profile).length > 0, "empty!");
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

    function _supplyAll() internal ifNotDiscontinued ifNotPaused {
        uint256 _tokenBalance = IERC20(underlyingToken).balanceOf(address(this));
        require(_tokenBalance > 0, "!amount>0");
        _batchMintAndBurn();
        first = 1;
        last = 0;
        uint8 _steps = strategyManagerContract.getDepositAllStepCount(strategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            bytes[] memory _codes = strategyManagerContract.getPoolDepositAllCodes(payable(address(this)), underlyingToken, strategyHash, _i, _steps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data);
                require(success);
            }
        }
        vaultValue = _calVaultValueInUnderlyingToken();
    }

    function rebalance() public override ifNotDiscontinued ifNotPaused {
        uint256 _gasInitial;
        
        if (msg.sender == registryContract.operator()) {
            _gasInitial = gasleft();
        }
        
        require(totalSupply() > 0, "!totalSupply()>0");
        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = underlyingToken;
        bytes32 newStrategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);

        if (
            keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash)) &&
            strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000
        ) {
            _withdrawAll();
            harvest(strategyHash);
            if (msg.sender == registryContract.operator() && gasOwedToOperator != uint(0)){
                address[] memory _path = new address[](2);
                _path[0] = WETH;
                _path[1] = underlyingToken;
                uint256[] memory  _amounts = IUniswap(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D)).getAmountsOut(gasOwedToOperator,_path);
                uint256 _gasToTransfer = _amounts[1];
                IERC20(underlyingToken).safeTransfer(registryContract.operator(), _gasToTransfer);
            }
        }

        strategyHash = newStrategyHash;

        uint256 _balance = balance();

        if (_balance > 0) {
            _emergencyBrake(_balance);
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
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
     *  - Need to modify this function in future whenever 2nd layer of depositing the underlying token (for example DAI) into any
     *    credit pool like compound is added.
     */
    function _calVaultValueInUnderlyingToken() internal view returns (uint256) {
        if (strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            uint256 balanceInUnderlyingToken = strategyManagerContract.getBalanceInUnderlyingToken(payable(address(this)), underlyingToken, strategyHash);
            return balanceInUnderlyingToken.add(balance()).sub(depositQueue);
        }
        return balance().sub(depositQueue);
    }

    /**
     * @dev Function to get the underlying token balance of OptyVault Contract
     */
    function balance() public override view returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }

    function _withdrawAll() internal {
        uint8 _steps = strategyManagerContract.getWithdrawAllStepsCount(strategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            uint8 _iterator = _steps - 1 - _i;
            bytes[] memory _codes =
                strategyManagerContract.getPoolWithdrawAllCodes(payable(address(this)), underlyingToken, strategyHash, _iterator, _steps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool _success, ) = pool.call(data);
                require(_success);
            }
        }
    }

    function harvest(bytes32 _hash) public override {
        require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000, "!invalidHash");
        uint8 _claimRewardSteps = strategyManagerContract.getClaimRewardStepsCount(_hash);
        for (uint8 _i = 0; _i < _claimRewardSteps; _i++) {
            bytes[] memory _codes =
                strategyManagerContract.getPoolClaimAllRewardCodes(payable(address(this)), _hash, _i, _claimRewardSteps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data);
                require(success);
            }
        }
        uint8 _harvestSteps = strategyManagerContract.getHarvestRewardStepsCount(_hash);
        for (uint8 _i = 0; _i < _harvestSteps; _i++) {
            bytes[] memory _codes =
                strategyManagerContract.getPoolHarvestAllRewardCodes(payable(address(this)), underlyingToken, _hash, _i, _harvestSteps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data);
                require(success);
            }
        }
    }

    function userDepositAll() external override {
        userDeposit(IERC20(underlyingToken).balanceOf(msg.sender));
    }

    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function userDeposit(uint256 _amount) public override ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        require(_amount > 0, "!(_amount>0)");
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), _amount);
        last++;
        queue[last] = Operation(msg.sender, true, _amount);
        pendingDeposits[msg.sender] += _amount;
        depositQueue += _amount;
        emit DepositQueue(msg.sender, last, _amount);
        _success = true;
    }

    function userDepositAndStake(uint256 _amount) public override ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        userDeposit(_amount);
        optyMinterContract.claimAndStake(msg.sender);
        _success = true;
    }
    
    function userDepositAllAndStake() public override ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        userDeposit(IERC20(underlyingToken).balanceOf(msg.sender));
        optyMinterContract.claimAndStake(msg.sender);
        _success = true;
    }

    function _batchMintAndBurn() internal returns (bool _success) {
        uint256 iterator = first;
        while (last >= iterator) {
            optyMinterContract.updateUserRewards(address(this), queue[iterator].account);
            if (queue[iterator].isDeposit) {
                _mintShares(queue[iterator].account, balance(), queue[iterator].value);
                pendingDeposits[msg.sender] -= queue[iterator].value;
                depositQueue -= queue[iterator].value;
            } else {
                _redeemAndBurn(queue[iterator].account, balance(), queue[iterator].value);
                pendingWithdraws[msg.sender] -= queue[iterator].value;
                withdrawQueue -= queue[iterator].value;
            }
            iterator++;
        }
        optyMinterContract.updateOptyVaultRatePerSecondAndVaultToken(address(this));
        optyMinterContract.updateOptyVaultIndex(address(this));
        while (last >= first) {
            optyMinterContract.updateUserStateInVault(address(this), queue[first].account);
            delete queue[first];
            first++;
        }

        _success = true;
    }
    
    function userDepositAllRebalance() external override {
        userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender));
    }
    
    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract and in return giving op tokens to the user
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function userDepositRebalance(uint256 _amount) public override ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        require(_amount > 0, "!(_amount>0)");

        if (strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            _withdrawAll();
            harvest(strategyHash);
        }

        uint256 _tokenBalance = balance();
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
        if (balance() > 0) {
            _emergencyBrake(balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
        }
        _success = true;
    }

    function userDepositRebalanceAndStake(uint256 _amount) public override ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        userDepositRebalance(_amount);
        optyMinterContract.claimAndStake(msg.sender);
        _success = true;
    }
    
    function userDepositAllRebalanceAndStake() public override ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender));
        optyMinterContract.claimAndStake(msg.sender);
        _success = true;
    }
    
    function userWithdrawAllRebalance() external override {
        userWithdrawRebalance(balanceOf(msg.sender));
    }
    
    /**
     * @dev Function to withdraw the vault tokens from the vault (for example cDAI)
     *
     * Requirements:
     *  -   contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the vault. Its units are:
     *      in weth uints i.e. 1e18
     */
    function userWithdrawRebalance(uint256 _redeemAmount) public override ifNotPaused nonReentrant returns (bool) {
        require(_redeemAmount > 0, "!_redeemAmount>0");
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "!!balance");

        if (!discontinued) {
            _withdrawAll();
            harvest(strategyHash);
        }

        optyMinterContract.updateUserRewards(address(this), msg.sender);
        // subtract pending deposit from total balance
        _redeemAndBurn(msg.sender, balance().sub(depositQueue), _redeemAmount);
        optyMinterContract.updateOptyVaultRatePerSecondAndVaultToken(address(this));
        optyMinterContract.updateOptyVaultIndex(address(this));
        optyMinterContract.updateUserStateInVault(address(this), msg.sender);

        if (!discontinued && (balance() > 0)) {
            _emergencyBrake(balance());
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = underlyingToken;
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
        }
        return true;
    }
    
    function userDepositAllWithCHI() public override discountCHI {
        userDeposit(IERC20(underlyingToken).balanceOf(msg.sender));
    }
    
    function userDepositAllAndStakeWithCHI() public override discountCHI {
        userDepositAllAndStake();
    }
    
    function userDepositWithCHI(uint256 _amount) public override discountCHI {
        userDeposit(_amount);
    }
    
    function userDepositAndStakeWithCHI(uint256 _amount) public override discountCHI {
        userDepositAndStake(_amount);
    }
    
    function userDepositAllRebalanceWithCHI() public override discountCHI {
        userDepositRebalance(IERC20(underlyingToken).balanceOf(msg.sender));
    }
    
    function userDepositRebalanceWithCHI(uint256 _amount) public override discountCHI {
        userDepositRebalance(_amount);
    }
    
    function userDepositRebalanceAndStakeWithCHI(uint256 _amount) public override discountCHI {
        userDepositRebalanceAndStake(_amount);
    }
    
    function userDepositAllRebalanceAndStakeWithCHI() public override discountCHI {
        userDepositAllRebalanceAndStake();
    }
    
    function userWithdrawRebalanceWithCHI(uint256 _redeemAmount) public override discountCHI {
        userWithdrawRebalance(_redeemAmount);
    }
    
    function userWithdrawAllRebalanceWithCHI() public override discountCHI {
        userWithdrawRebalance(balanceOf(msg.sender));
    }

    function _emergencyBrake(uint256 _vaultValue) private returns (bool) {
        uint256 _blockTransactions = blockToBlockVaultValues[block.number].length;
        if (_blockTransactions > 0) {
            blockToBlockVaultValues[block.number].push(
                BlockVaultValue({
                    actualVaultValue: _vaultValue,
                    blockMinVaultValue: _vaultValue < blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMinVaultValue
                        ? _vaultValue
                        : blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMinVaultValue,
                    blockMaxVaultValue: _vaultValue > blockToBlockVaultValues[block.number][_blockTransactions - 1].blockMaxVaultValue
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
                BlockVaultValue({actualVaultValue: _vaultValue, blockMinVaultValue: _vaultValue, blockMaxVaultValue: _vaultValue})
            );
        }
    }

    function _abs(uint256 _a, uint256 _b) internal pure returns (uint256) {
        if (_a > _b) {
            return _a.sub(_b);
        }
        return _b.sub(_a);
    }

    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) public override view returns (bool) {
        return (_diff.div(_currentVaultValue)).mul(10000) < maxVaultValueJump;
    }

    function _redeemAndBurn(
        address _account,
        uint256 _balance,
        uint256 _redeemAmount
    ) private {
        uint256 redeemAmountInToken = (_balance.mul(_redeemAmount)).div(totalSupply());
        //  Updating the totalSupply of op tokens
        _burn(msg.sender, _redeemAmount);
        IERC20(underlyingToken).safeTransfer(_account, redeemAmountInToken);
    }

    function _mintShares(
        address _account,
        uint256 _balance,
        uint256 _depositAmount
    ) private {
        _mint(_account, (_depositAmount.mul(totalSupply())).div(_balance.sub(depositQueue)));
    }

    function getPricePerFullShare() public override view returns (uint256) {
        if (totalSupply() != 0) {
            return _calVaultValueInUnderlyingToken().div(totalSupply());
        }
        return uint256(0);
    }

    function discontinue() public override onlyOperator {
        discontinued = true;
        if (strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            _withdrawAll();
            harvest(strategyHash);
        }
    }

    function setPaused(bool _paused) public override onlyOperator {
        paused = _paused;
        if (paused && strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            _withdrawAll();
            harvest(strategyHash);
        }
    }
}