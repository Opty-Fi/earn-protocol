// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./libraries/SafeERC20.sol";
import "./interfaces/opty/IDepositPoolProxy.sol";
import "./interfaces/opty/IBorrowPoolProxy.sol";
import "./Registry.sol";
import "./libraries/Addresses.sol";
import "./utils/ERC20.sol";
import "./utils/Modifiers.sol";

contract StrategyManager is Modifiers{
    
    using SafeERC20 for IERC20;
    using Address for address;

    Registry RegistryContract;

    constructor(address _registry) public Modifiers(_registry) {
        setRegistry(_registry);
    }

    function balanceInToken(
                        bytes32 _hash,
                        address _underlyingToken, 
                        address _account
                        ) public view returns(uint _balance) {
        _balance = 0;
        if (_hash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
            require(_strategySteps.length > 0 , "!_strategySteps.length");
            uint index = _strategySteps.length - 1;
            if(_strategySteps[index].isBorrow) {
                // TODO: Return the marke t value of underlying token
            } else {
                address _optyPoolProxy = RegistryContract.liquidityPoolToCodeProvider(_strategySteps[index].pool);
                _balance = IDepositPoolProxy(_optyPoolProxy).
                            balanceInToken(msg.sender, _underlyingToken,_strategySteps[index].pool,_strategySteps[index].outputToken, _account);
            }
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
            uint8 steps = uint8(_strategySteps.length);
            require(steps > 0 , "!_strategySteps.length");
            IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this), _amount);
            for (uint8 i = 0 ; i < steps ; i++) {
                if(_strategySteps[i].isBorrow) {
                    // address _optyPoolProxy = OptyRegistryContract.liquidityPoolToBorrowPoolProxy(_strategySteps[i].pool);
                    // _poolDepositAndBorrow();
                }
                else {
                    address _optyPoolProxy = RegistryContract.liquidityPoolToCodeProvider(_strategySteps[i].pool);
                    address[] memory _underlyingTokens = IDepositPoolProxy(_optyPoolProxy).getUnderlyingTokens(_strategySteps[i].pool, _strategySteps[i].outputToken);
                    uint[] memory _amounts = new uint[](_underlyingTokens.length);
                    for (uint8 j = 0 ; j < _underlyingTokens.length ; j++) {
                        if(_underlyingTokens[j] == _underlyingToken) {
                            _amounts[j] = IERC20(_underlyingToken).balanceOf(address(this));
                            IERC20(_underlyingTokens[j]).safeApprove(_optyPoolProxy,_amounts[j]);
                        }
                    }
                    require(IDepositPoolProxy(_optyPoolProxy).deposit(msg.sender, _underlyingToken, _strategySteps[i].pool,_strategySteps[i].outputToken,_amounts),"Deposit error");
                    _underlyingToken = _strategySteps[i].outputToken;
                }
            }
            if(!(_strategySteps[steps-1].outputToken == address(0))){
                IERC20(_strategySteps[steps-1].outputToken).safeTransfer(msg.sender, IERC20(_strategySteps[steps-1].outputToken).balanceOf(address(this)));
            }
            _success = true;
    }
    
    function poolWithdraw(address _underlyingToken, uint _amount, bytes32 _hash) public onlyValidAddress returns(bool _success) {
        require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash");   
        require(_amount > 0 , "!_amount");
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 steps = uint8(_strategySteps.length);
        require(steps > 0 , "!_strategySteps.length");
        if(_strategySteps[steps-1].outputToken != address(0)){
            IERC20(_strategySteps[steps-1].outputToken).safeTransferFrom(msg.sender,address(this), _amount);
        }
        for(uint8 i = 0 ; i < steps ; i++ ) {
            if(_strategySteps[i].isBorrow){
                // TODO : borrow
            } else {
                address _optyPoolProxy = RegistryContract.liquidityPoolToCodeProvider(_strategySteps[steps-i-1].pool);
                address[] memory _underlyingTokens = new address[](1);
                if((steps-i-1) == 0){
                    _underlyingTokens[0] = _underlyingToken;
                } else {
                    _underlyingTokens[0] = _strategySteps[i-1].outputToken;
                }
                if(_strategySteps[steps-1].outputToken != address(0)){
                    IERC20(_strategySteps[steps-i-1].outputToken).safeApprove(_optyPoolProxy,IERC20(_strategySteps[steps-i-1].outputToken).balanceOf(address(this)));
                }
                require(IDepositPoolProxy(_optyPoolProxy).withdraw(msg.sender, _underlyingTokens,_strategySteps[steps-i-1].pool,_strategySteps[steps-i-1].outputToken,_amount));
            }
        }
        IERC20(_underlyingToken).safeTransfer(msg.sender,IERC20(_underlyingToken).balanceOf(address(this)));
        _success = true;
    }
    
    function _getStrategySteps(bytes32 _hash) internal view returns(StrategyStep[] memory _strategySteps) {
        (,,,, _strategySteps) = RegistryContract.getStrategy(_hash);
    }
    
    function getOutputToken(bytes32 _hash) public view returns(address _outputToken) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        require(_strategySteps.length > 0 , "!_strategySteps.length");
        uint index = _strategySteps.length - 1;
        _outputToken = _strategySteps[index].outputToken;
    }
}
