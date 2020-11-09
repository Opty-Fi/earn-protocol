// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../libraries/SafeERC20.sol";
import "./../interfaces/opty/IOptyDepositPoolProxy.sol";
import "./../interfaces/opty/IOptyBorrowPoolProxy.sol";
import "./../OptyRegistry.sol";
import "./../libraries/Addresses.sol";
import "./../utils/ERC20.sol";
import "./../utils/Modifiers.sol";

contract OptyStrategy is Modifiers{
    
    using SafeERC20 for IERC20;
    using Address for address;

    OptyRegistry OptyRegistryContract;

    constructor(address _optyRegistry) public {
        setOptyRegistry(_optyRegistry);
    }

    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        OptyRegistryContract = OptyRegistry(_optyRegistry);
    }
    
    function balanceInToken(
                        bytes32 _hash,
                        address[] memory _underlyingTokens, 
                        address _underlyingToken, 
                        address _account
                        ) public view returns(uint _balance) {
        _balance = 0;
        if(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
            if(_strategySteps.length == 1){
                _balance = singleStepBalanceInToken(_strategySteps, _underlyingTokens, _underlyingToken, _account);
            }
            else {
                revert("not-implemented-1");
            }
        }
    }
    
    function singleStepBalanceInToken(StrategyStep[] memory _strategySteps,address[] memory _underlyingTokens, address _underlyingToken,address _account) 
    public view returns(uint _balance) {
        _balance = IOptyDepositPoolProxy(_strategySteps[0].poolProxy).
                    balanceInToken(_underlyingTokens,_underlyingToken,_strategySteps[0].liquidityPool, _account);

    }
    
    function poolDeposit(
        address[] memory _underlyingTokens,
        uint[] memory _amounts, 
        bytes32 _hash
        ) public onlyValidAddress returns(bool _success) {
    require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash");   
    StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1) {
            require(singleStepPoolDeposit(_underlyingTokens,_amounts,_strategySteps),"!singleStepDeploy()");
        }
        else {
            revert("not-implemented-2");
        }
        _success = true;
    }
    
    function singleStepPoolDeposit(
                            address[] memory _underlyingTokens,
                            uint[] memory _amounts, 
                            StrategyStep[] memory _strategySteps
                            ) public onlyValidAddress returns(bool _success) {
        require(_strategySteps.length == 1,"!_strategySteps.length");
        
        if (_strategySteps[0].creditPool != address(0)) {
            for (uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
                IERC20(_underlyingTokens[i]).safeTransferFrom(msg.sender,address(this), _amounts[i]);
                // 1. Approve all DAI to AavePoolProxy contract
                IERC20(_underlyingTokens[i]).safeApprove(_strategySteps[0].creditPoolProxy,_amounts[i]);
            }
            
            // 2. Call deploy() of aavePoolProxy and receive aDAI
            require(
                IOptyDepositPoolProxy(_strategySteps[0].creditPoolProxy).
                deposit(
                    _underlyingTokens,
                    _strategySteps[0].creditPool,
                    _amounts
                )
            );
            
            address _creditPoolToken = OptyRegistryContract.
                                        getLiquidityPoolToLPToken(_strategySteps[0].creditPool,_underlyingTokens);
            
            // 3. Approve aavePoolProxy as a spender for all aDAI 
            uint _collateralAmount = IERC20(_creditPoolToken).balanceOf(address(this));
            IERC20(_creditPoolToken).safeApprove(_strategySteps[0].creditPoolProxy,_collateralAmount);

            // 4. TODO: Borrow from the creditPool
            // Call borrow and get BorrowToken address along with amount borrowed
            require(IOptyBorrowPoolProxy(_strategySteps[0].creditPoolProxy).borrow(
                _underlyingTokens, _strategySteps[0].creditPool, _strategySteps[0].borrowToken,_collateralAmount), "!borrow");
            
            uint _borrowedAmount = IERC20(_strategySteps[0].borrowToken).balanceOf(address(this));
            
            // 5. Approve borrowToken to spend by liquidity Pool proxy contract
            IERC20(_strategySteps[0].borrowToken).safeApprove(_strategySteps[0].poolProxy, _borrowedAmount);
            
            // 6. Depositing the borrowed amount into the liquidityPool (Compound or aave) - Call deploy()
            address[] memory _borrowedTokenArr = new address[](1);
            _borrowedTokenArr[0] = _strategySteps[0].borrowToken;
            uint[] memory _borrowedAmountArr = new uint[](1);
            _borrowedAmountArr[0] = _borrowedAmount;
            require(IOptyDepositPoolProxy(_strategySteps[0].poolProxy).
            deposit(
                _borrowedTokenArr, 
                _strategySteps[0].liquidityPool,
                _borrowedAmountArr
                ), 
                "!deploy");
            
            // 7. Transferring the cTokens or aTokens to OptyDAIAdvancePool contract
            address _lendingPoolToken = OptyRegistryContract.
                                    getLiquidityPoolToLPToken(_strategySteps[0].liquidityPool,_borrowedTokenArr);
            uint _lpTokenAmount = IERC20(_lendingPoolToken).balanceOf(address(this));
            IERC20(_lendingPoolToken).safeTransfer(msg.sender,_lpTokenAmount);
        } else {
             address _lendingPoolToken = OptyRegistryContract.
                                    getLiquidityPoolToLPToken(_strategySteps[0].liquidityPool,_underlyingTokens);
            for (uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
            IERC20(_underlyingTokens[i]).safeTransferFrom(msg.sender,address(this), _amounts[i]);
            // 1. Approve all DAI to AavePoolProxy contract
            IERC20(_underlyingTokens[i]).safeApprove(_strategySteps[0].poolProxy,_amounts[i]);
             }
            require(
                IOptyDepositPoolProxy(_strategySteps[0].poolProxy).
                deposit(
                    _underlyingTokens,
                    _strategySteps[0].liquidityPool,
                    _amounts
                    )
                );
            IERC20(_lendingPoolToken).
            safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        }
        _success = true;
    }
    
    function poolWithdraw(
                address[] memory _underlyingTokens,
                uint _amount, 
                bytes32 _hash
                ) public onlyValidAddress returns(bool _success) {
        require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash"); 
        require(_amount > 0, "!_amount");
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1) {
            require(singleStepPoolWithdraw(_underlyingTokens,_amount,_strategySteps),"!singleStepDeploy()");
        }
        else {
            revert("not-implemented-3");
        }
        _success = true;
    }
    
    function singleStepPoolWithdraw(
                            address[] memory _underlyingTokens,
                            uint _amount, 
                            StrategyStep[] memory _strategySteps
                            ) public onlyValidAddress returns(bool _success) {
        require(_amount > 0, "!_amount");
        require(_strategySteps.length == 1,"!_strategySteps.length");
        address _lendingPoolToken = OptyRegistryContract.
                                    getLiquidityPoolToLPToken(_strategySteps[0].liquidityPool,_underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        IERC20(_lendingPoolToken).safeApprove(_strategySteps[0].poolProxy,_amount);
        require(
            IOptyDepositPoolProxy(_strategySteps[0].poolProxy).
            withdraw(_underlyingTokens,_strategySteps[0].liquidityPool,_amount)
        );
        for(uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
            IERC20(_underlyingTokens[i]).safeTransfer(msg.sender,IERC20(_underlyingTokens[i]).balanceOf(address(this)));   
        }
        _success = true;
    }
    
    function _getStrategySteps(bytes32 _hash) internal view returns(StrategyStep[] memory _strategySteps) {
        (,,,, _strategySteps) = OptyRegistryContract.getStrategy(_hash);
    }
    
    function getLiquidityPoolToken(address[] memory _underlyingTokens, bytes32 _hash) public view returns(address _lendingPool) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1){
            _lendingPool = getSingleStepLiquidityPoolToken(_strategySteps,_underlyingTokens);
        }
        else{
            revert("not-implemented-4");
        }
    }
    
    function getSingleStepLiquidityPoolToken(
                                    StrategyStep[] memory _strategySteps,
                                    address[] memory _underlyingTokens
                                    ) public view returns(address) {
        address _liquidityPool = _strategySteps[0].liquidityPool;
        address _lendingPoolToken = OptyRegistryContract.
                                        getLiquidityPoolToLPToken(
                                            _liquidityPool,
                                            _underlyingTokens
                                            );
        return _lendingPoolToken;
    }
}
