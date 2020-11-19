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
                        address _underlyingToken, 
                        address _account
                        ) public view returns(uint _balance) {
        _balance = 0;
        require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash");
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        require(_strategySteps.length > 0 , "!_strategySteps.length");
        uint index = _strategySteps.length - 1;
        if(_strategySteps[index].isBorrow) {
            // TODO: Return the marke t value of underlying token
        } else {
            _balance = IOptyDepositPoolProxy(_strategySteps[index].pool).
                    balanceInToken(_underlyingToken,_strategySteps[index].pool, _account);
        }
    }
    
    function poolDeposit(
        address _underlyingToken,
        uint _amount, 
        bytes32 _hash
        ) public onlyValidAddress returns(bool _success) {
            require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash");   
            require(_amount > 0 , "!_amount");
            StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
            uint steps = _strategySteps.length;
            require(steps > 0 , "!_strategySteps.length");
            IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this), _amount);
            for (uint8 i = 0 ; i < steps ; i++) {
                if(_strategySteps[i].isBorrow) {
                    // address _optyPoolProxy = OptyRegistryContract.liquidityPoolToBorrowPoolProxy(_strategySteps[i].pool);
                    // _poolDepositAndBorrow();
                }
                else {
                    address _optyPoolProxy = OptyRegistryContract.liquidityPoolToDepositPoolProxy(_strategySteps[i].pool);
                    address[] memory _underlyingTokens = IOptyDepositPoolProxy(_optyPoolProxy).getUnderlyingTokens(_strategySteps[i].pool, _strategySteps[i].outputToken);
                    uint[] memory _amounts = new uint[](_underlyingTokens.length);
                    for (uint8 j = 0 ; j < _underlyingTokens.length ; j++) {
                        if(_underlyingTokens[j] == _underlyingToken) {
                            _amounts[j] = IERC20(_underlyingToken).balanceOf(address(this));
                            IERC20(_underlyingTokens[j]).safeApprove(_optyPoolProxy,_amounts[j]);
                        }
                    }
                    require(IOptyDepositPoolProxy(_optyPoolProxy).deposit(_strategySteps[i].pool,_strategySteps[i].outputToken,_amounts));
                    _underlyingToken = _strategySteps[i].outputToken;
                }
            }
            IERC20(_strategySteps[steps-1].outputToken).safeTransfer(msg.sender, IERC20(_strategySteps[steps-1].outputToken).balanceOf(address(this)));
            _success = true;
    }
    
    function poolWithdraw(address _underlyingToken, uint _amount, bytes32 _hash) public onlyValidAddress returns(bool _success) {
        require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash");   
        require(_amount > 0 , "!_amount");
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint steps = _strategySteps.length;
        require(steps > 0 , "!_strategySteps.length");
        IERC20(_strategySteps[steps-1].outputToken).safeTransferFrom(msg.sender,address(this), _amount);
        for(uint8 i = uint8(steps)-1 ; i >=0 ; i-- ) {
            if(_strategySteps[i].isBorrow){
                // TODO : borrow
            } else {
                address _optyPoolProxy = OptyRegistryContract.liquidityPoolToDepositPoolProxy(_strategySteps[i].pool);
                address[] memory _underlyingTokens = new address[](1);
                if(i == 0){
                    _underlyingTokens[0] = _underlyingToken;
                } else {
                    _underlyingTokens[0] = _strategySteps[i-1].outputToken;
                }
                require(IOptyDepositPoolProxy(_optyPoolProxy).withdraw(_underlyingTokens,_strategySteps[i].pool,_strategySteps[i].outputToken,_amount));
            }
        }
        _success = true;
    }
    
    // function poolWithdraw(
    //             address[] memory _underlyingTokens,
    //             uint _amount, 
    //             bytes32 _hash
    //             ) public onlyValidAddress returns(bool _success) {
    //     require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash"); 
    //     require(_amount > 0, "!_amount");
    //     StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
    //     require(_strategySteps.length > 0 , "!_strategySteps.length");
    
    //     address[] memory _uTokens;
    //     if(_strategySteps.length > 1) {
    //         _uTokens = new address[](_strategySteps.length);
    //         for(uint8 i = 1 ; i < _strategySteps.length ; i++) {
    //             if(i == 1) {
    //                 if(_strategySteps[i-1].isBorrow){
    //                     _uTokens[i] = _strategySteps[i-1].borrowToken;
    //                 } else {
    //                     address _optyPoolProxy = OptyRegistryContract.liquidityPoolToDepositPoolProxy(_strategySteps[i-1].pool);
    //                     _uTokens[i] = IOptyDepositPoolProxy(_optyPoolProxy).getLendingPoolToken(_underlyingTokens,_strategySteps[i-1].pool); 
    //                 }
    //             } else {
    //                 address[] memory _uTkns = new address[](1);
    //                 _uTkns[0] = _uTokens[i-1];
    //                 address _optyPoolProxy = OptyRegistryContract.liquidityPoolToDepositPoolProxy(_strategySteps[i-1].pool);
    //                 _uTokens[i] = IOptyDepositPoolProxy(_optyPoolProxy).getLendingPoolToken(_uTkns,_strategySteps[i-1].pool);
    //             }
    //         }
    //     }
    //     for (uint i = _strategySteps.length - 1 ; i >= 0 ; i--) {
    //         address _optyPoolProxy;
    //         if(_strategySteps[i].isBorrow) {
    //             _optyPoolProxy = OptyRegistryContract.liquidityPoolToBorrowPoolProxy(_strategySteps[i].pool);
    //         } else {
    //             _optyPoolProxy = OptyRegistryContract.liquidityPoolToDepositPoolProxy(_strategySteps[i].pool);
    //         }
    //         if(i == _strategySteps.length - 1) {
    //             if(_strategySteps[i].isBorrow){
    //                 // TODO : ut = borrowToken
    //             } else {
    //                 address _lendingPoolToken = IOptyDepositPoolProxy(_optyPoolProxy).
    //                                             getLendingPoolToken(_underlyingTokens,_strategySteps[i].pool);
    //                 IERC20(_lendingPoolToken).safeTransferFrom(msg.sender, address(this), _amount);
    //                 if(i == 0) { 
    //                     _poolWithdraw(
    //                         _underlyingTokens, 
    //                         IERC20(_lendingPoolToken).balanceOf(address(this)), 
    //                         _strategySteps[i].pool, 
    //                         _lendingPoolToken, 
    //                         _optyPoolProxy
    //                     );
    //                 } else {
    //                     address[] memory _ut = new address[](1);
    //                     _ut[0] = _uTokens[i];
    //                     _poolWithdraw(
    //                         _ut, 
    //                         IERC20(_lendingPoolToken).balanceOf(address(this)), 
    //                         _strategySteps[i].pool, 
    //                         _lendingPoolToken, 
    //                         _optyPoolProxy
    //                     );
    //                 }
    //             }    
    //         }
    //         else {
    //             if(_strategySteps[i].isBorrow){
    //                 // TODO : ut = borrowToken
    //             } else {
    //                 address[] memory _ut = new address[](1);
    //                 _ut[0] = _uTokens[i];
    //                 address _lendingPoolToken = IOptyDepositPoolProxy(_optyPoolProxy).
    //                                             getLendingPoolToken(_ut,_strategySteps[i].pool);
    //                 _poolWithdraw(
    //                     _ut, 
    //                     IERC20(_lendingPoolToken).balanceOf(address(this)), 
    //                     _lendingPoolToken, 
    //                     _strategySteps[i].pool, 
    //                     _optyPoolProxy
    //                 );
    //             }
    //         }
    //     }
    //     for(uint i = 0 ; i < _underlyingTokens.length ; i++){
    //         IERC20(_underlyingTokens[i]).safeTransfer(msg.sender, IERC20(_underlyingTokens[i]).balanceOf(address(this)));
    //     }
    //     _success = true;
    // }
    
    // function _poolWithdraw(address[] memory _underlyingTokens, uint _amount, address _redeemToken, address _pool, address _optyPoolProxy) internal {
    //     IERC20(_redeemToken).safeApprove(_optyPoolProxy,_amount);
    //     require(IOptyDepositPoolProxy(_optyPoolProxy).withdraw(_underlyingTokens,_pool,_amount));
    // } 
    
    // function singleStepPoolWithdraw(
    //                         address[] memory _underlyingTokens,
    //                         uint _amount, 
    //                         StrategyStep[] memory _strategySteps
    //                         ) public onlyValidAddress returns(bool _success) {
    //     require(_amount > 0, "!_amount");
    //     require(_strategySteps.length == 1,"!_strategySteps.length");
    //     address _lendingPoolToken = OptyRegistryContract.
    //                                 liquidityPoolToLPTokens(_strategySteps[0].liquidityPool,keccak256(abi.encodePacked(_underlyingTokens)));
    //     IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
    //     IERC20(_lendingPoolToken).safeApprove(_strategySteps[0].poolProxy,_amount);
    //     require(
    //         IOptyDepositPoolProxy(_strategySteps[0].poolProxy).
    //         withdraw(_underlyingTokens,_strategySteps[0].liquidityPool,_amount)
    //     );
    //     for(uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
    //         IERC20(_underlyingTokens[i]).safeTransfer(msg.sender,IERC20(_underlyingTokens[i]).balanceOf(address(this)));   
    //     }
    //     _success = true;
    // }
    
    function _getStrategySteps(bytes32 _hash) internal view returns(StrategyStep[] memory _strategySteps) {
        (,,,, _strategySteps) = OptyRegistryContract.getStrategy(_hash);
    }
    
    function getOutputToken(bytes32 _hash) public view returns(address _outputToken) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        require(_strategySteps.length > 0 , "!_strategySteps.length");
        uint index = _strategySteps.length - 1;
        _outputToken = _strategySteps[index].outputToken;
    }
    
    // function getSingleStepLiquidityPoolToken(
    //                                 StrategyStep[] memory _strategySteps,
    //                                 address[] memory _underlyingTokens
    //                                 ) public view returns(address) {
    //     address _liquidityPool = _strategySteps[0].liquidityPool;
    //     address _lendingPoolToken = OptyRegistryContract.
    //                                     liquidityPoolToLPTokens(
    //                                         _liquidityPool,
    //                                         keccak256(abi.encodePacked(_underlyingTokens))
    //                                         );
    //     return _lendingPoolToken;
    // }
}
