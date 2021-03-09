// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../../libraries/SafeERC20.sol";
import "./../../utils/ERC20Detailed.sol";
import "./../../utils/Ownable.sol";
import "./../../utils/ReentrancyGuard.sol";
import "./../../RiskManager.sol";
import "./../../StrategyCodeProvider.sol";
import "../PoolStorage.sol";

/**
 * @dev Opty.Fi's Basic Pool contract for underlying tokens (for example DAI)
 */
contract AdvancePlusPool is ERC20, ERC20Detailed, Modifiers, ReentrancyGuard, PoolStorage {
    using SafeERC20 for IERC20;
    using Address for address;

    /**
     * @dev
     *  - Constructor used to initialise the Opty.Fi token name, symbol, decimals for token (for example DAI)
     *  - Storing the underlying token contract address (for example DAI)
     */
    constructor(
        address _registry,
        address _riskManager,
        address _underlyingToken,
        address _strategyCodeProvider
    )
        public
        ERC20Detailed(
            string(abi.encodePacked("op ", ERC20Detailed(_underlyingToken).name(), " advance plus", " pool")),
            string(abi.encodePacked("op", ERC20Detailed(_underlyingToken).symbol(), "Adv+Pool")),
            ERC20Detailed(_underlyingToken).decimals()
        )
        Modifiers(_registry)
    {
        setProfile("advanceplus");
        setRiskManager(_riskManager);
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        setStrategyCodeProvider(_strategyCodeProvider);
    }

    function setProfile(string memory _profile) public onlyOperator returns (bool _success) {
        require(bytes(_profile).length > 0, "empty!");
        profile = _profile;
        _success = true;
    }

    function setRiskManager(address _riskManager) public onlyOperator returns (bool _success) {
        require(_riskManager.isContract(), "!_riskManager.isContract");
        riskManagerContract = RiskManager(_riskManager);
        _success = true;
    }

    function setToken(address _underlyingToken) public onlyOperator returns (bool _success) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract");
        token = _underlyingToken;
        _success = true;
    }

    function setStrategyCodeProvider(address _strategyCodeProvider) public onlyOperator returns (bool _success) {
        require(_strategyCodeProvider.isContract(), "!__strategyCodeProvider.isContract");
        strategyCodeProviderContract = StrategyCodeProvider(_strategyCodeProvider);
        _success = true;
    }

    function _supplyAll() internal ifNotDiscontinued ifNotPaused {
        uint256 _tokenBalance = IERC20(token).balanceOf(address(this));
        require(_tokenBalance > 0, "!amount>0");
        _batchMintAndBurn();
        first = 1;
        last = 0;
        uint8 _steps = strategyCodeProviderContract.getDepositAllStepCount(strategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            bytes[] memory _codes = strategyCodeProviderContract.getPoolDepositAllCodes(payable(address(this)), token, strategyHash, _i, _steps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data);
                require(success);
            }
        }
        poolValue = _calPoolValueInToken();
    }

    function rebalance() public ifNotDiscontinued ifNotPaused {
        require(totalSupply() > 0, "!totalSupply()>0");
        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = token;
        bytes32 newStrategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);

        if (
            keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash)) &&
            strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000
        ) {
            _withdrawAll();
            harvest(strategyHash);
        }

        strategyHash = newStrategyHash;

        if (balance() > 0) {
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
        }
    }

    /**
     * @dev Function to calculate pool value in underlying token (for example DAI)
     *
     * Note:
     *  - Need to modify this function in future whenever 2nd layer of depositing the underlying token (for example DAI) into any
     *    credit pool like compound is added.
     */
    function _calPoolValueInToken() internal view returns (uint256) {
        if (strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            uint256 balanceInToken = strategyCodeProviderContract.getBalanceInToken(payable(address(this)), token, strategyHash);
            return balanceInToken.add(balance()).sub(depositQueue);
        }
        return balance().sub(depositQueue);
    }

    /**
     * @dev Function to get the underlying token balance of OptyPool Contract
     */
    function balance() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function _withdrawAll() internal {
        uint8 _steps = strategyCodeProviderContract.getWithdrawAllStepsCount(strategyHash);
        for (uint8 _i = 0; _i < _steps; _i++) {
            uint8 _iterator = _steps - 1 - _i;
            bytes[] memory _codes =
                strategyCodeProviderContract.getPoolWithdrawAllCodes(payable(address(this)), token, strategyHash, _iterator, _steps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool _success, ) = pool.call(data);
                require(_success);
            }
        }
    }

    function harvest(bytes32 _hash) public {
        require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000, "!invalidHash");
        uint8 _claimRewardSteps = strategyCodeProviderContract.getClaimRewardStepsCount(_hash);
        for (uint8 _i = 0; _i < _claimRewardSteps; _i++) {
            bytes[] memory _codes =
                strategyCodeProviderContract.getPoolClaimAllRewardCodes(payable(address(this)), _hash, _i, _claimRewardSteps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data);
                require(success);
            }
        }
        uint8 _harvestSteps = strategyCodeProviderContract.getHarvestRewardStepsCount(_hash);
        for (uint8 _i = 0; _i < _harvestSteps; _i++) {
            bytes[] memory _codes =
                strategyCodeProviderContract.getPoolHarvestAllRewardCodes(payable(address(this)), token, _hash, _i, _harvestSteps);
            for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data);
                require(success);
            }
        }
    }

    function userDepositAll() external {
        userDeposit(IERC20(token).balanceOf(msg.sender));
    }

    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function userDeposit(uint256 _amount) public ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        require(_amount > 0, "!(_amount>0)");
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        last++;
        queue[last] = Operation(msg.sender, true, _amount);
        pendingDeposits[msg.sender] += _amount;
        depositQueue += _amount;
        emit DepositQueue(msg.sender, last, _amount);
        _success = true;
    }

    function _batchMintAndBurn() internal returns (bool _success) {
        uint256 iterator = first;
        while (last >= iterator) {
            optyMinterContract.updateSupplierRewards(address(this), queue[iterator].account);
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
        optyMinterContract.updateOptyPoolRatePerBlockAndLPToken(address(this));
        optyMinterContract.updateOptyPoolIndex(address(this));
        while (last >= first) {
            optyMinterContract.updateUserStateInPool(address(this), queue[first].account);
            delete queue[first];
            first++;
        }

        _success = true;
    }

    function userDepositAllRebalance() external {
        userDepositRebalance(IERC20(token).balanceOf(msg.sender));
    }

    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract and in return giving op tokens to the user
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function userDepositRebalance(uint256 _amount) public ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        require(_amount > 0, "!(_amount>0)");
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);

        if (strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            _withdrawAll();
            harvest(strategyHash);
        }
        // do not consider _amount and pending deposit sum to calculate token balance
        uint256 _tokenBalance = balance().sub(_amount).sub(depositQueue);
        uint256 shares = 0;

        if (_tokenBalance == 0 || totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div((_tokenBalance));
        }
        optyMinterContract.updateSupplierRewards(address(this), msg.sender);
        _mint(msg.sender, shares);
        optyMinterContract.updateOptyPoolRatePerBlockAndLPToken(address(this));
        optyMinterContract.updateOptyPoolIndex(address(this));
        optyMinterContract.updateUserStateInPool(address(this), msg.sender);
        if (balance() > 0) {
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = token;
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
        }
        _success = true;
    }

    function userWithdrawAll() external {
        userWithdraw(balanceOf(msg.sender));
    }

    /**
     * @dev Function to queu withdraw of the lp tokens from the liquidity pool (for example opDAI)
     *
     * Requirements:
     *  -   contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the  liquidity pool. Its uints are:
     *      in  weth uints i.e. 1e18
     */
    function userWithdraw(uint256 _redeemAmount) public ifNotPaused nonReentrant returns (bool _success) {
        require(_redeemAmount > 0, "!_redeemAmount>0");
        uint256 opBalance = balanceOf(msg.sender);
        require(pendingWithdraws[msg.sender] + _redeemAmount <= opBalance, "!balance");
        last++;
        queue[last] = Operation(msg.sender, false, _redeemAmount);
        pendingWithdraws[msg.sender] += _redeemAmount;
        withdrawQueue += _redeemAmount;
        emit WithdrawQueue(msg.sender, last, _redeemAmount);
        _success = true;
    }

    function userWithdrawAllRebalance() external {
        userWithdrawRebalance(balanceOf(msg.sender));
    }

    /**
     * @dev Function to withdraw the lp tokens from the liquidity pool (for example cDAI)
     *
     * Requirements:
     *  -   contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the  liquidity pool. Its uints are:
     *      in  weth uints i.e. 1e18
     */
    function userWithdrawRebalance(uint256 _redeemAmount) public ifNotPaused nonReentrant returns (bool) {
        require(_redeemAmount > 0, "!_redeemAmount>0");
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "!!balance");

        if (!discontinued) {
            _withdrawAll();
            harvest(strategyHash);
        }

        optyMinterContract.updateSupplierRewards(address(this), msg.sender);
        // subtract pending deposit from total balance
        _redeemAndBurn(msg.sender, balance().sub(depositQueue), _redeemAmount);
        optyMinterContract.updateOptyPoolRatePerBlockAndLPToken(address(this));
        optyMinterContract.updateOptyPoolIndex(address(this));
        optyMinterContract.updateUserStateInPool(address(this), msg.sender);

        if (!discontinued && (balance() > 0)) {
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = token;
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            _supplyAll();
        }
        return true;
    }

    function _redeemAndBurn(
        address _account,
        uint256 _balance,
        uint256 _redeemAmount
    ) private {
        uint256 redeemAmountInToken = (_balance.mul(_redeemAmount)).div(totalSupply());
        //  Updating the totalSupply of op tokens
        _balances[_account] = _balances[_account].sub(_redeemAmount, "!_redeemAmount>balance");
        _totalSupply = _totalSupply.sub(_redeemAmount);
        emit Transfer(_account, address(0), _redeemAmount);
        IERC20(token).safeTransfer(_account, redeemAmountInToken);
    }

    function _mintShares(
        address _account,
        uint256 _balance,
        uint256 _depositAmount
    ) private {
        _mint(_account, (_depositAmount.mul(totalSupply())).div(_balance));
    }

    function getPricePerFullShare() public view returns (uint256) {
        if (totalSupply() != 0) {
            return _calPoolValueInToken().div(totalSupply());
        }
        return uint256(0);
    }

    function discontinue() public onlyOperator {
        discontinued = true;
        if (strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            _withdrawAll();
            harvest(strategyHash);
        }
    }

    function setPaused(bool _paused) public onlyOperator {
        paused = _paused;
        if (paused && strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            _withdrawAll();
            harvest(strategyHash);
        }
    }
}
