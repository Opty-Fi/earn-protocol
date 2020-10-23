// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../libraries/SafeERC20.sol";
import "./../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "./../interfaces/opty/IOptyRegistry.sol";
import "./../libraries/Addresses.sol";

contract OptyStrategy {
    
    using SafeERC20 for IERC20;
    using Address for address;

    
    address public optyRegistry;
    address public governance;


    constructor(address _optyRegistry) public {
        governance = msg.sender;
        optyRegistry = _optyRegistry;
    }

    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        optyRegistry = _optyRegistry;
    }
    
    function balance(bytes32 _hash, address _account) public view returns(uint _balance) {
        _balance = 0;
        if(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
         IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        require(_strategySteps.length > 0,"!_strategySteps.length");
        if(_strategySteps.length == 1){
            _balance = singleStepBalance(_strategySteps, _account);
        }
        else {
            revert("not-implemented");
        }
        }
    }
    
    function singleStepBalance(IOptyRegistry.StrategyStep[] memory _strategySteps, address _account) 
    public view returns(uint _balance) {
     _balance = IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).
     balance(_strategySteps[0].lendingPoolToken, _account);

    }
    
    function balanceInToken(bytes32 _hash, address _account) public view returns(uint _balance) {
        _balance = 0;
        if(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
          IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1){
            _balance = singleStepBalanceInToken(_strategySteps, _account);
        }
        else {
            revert("not-implemented");
        }
        }
    }
    
    function singleStepBalanceInToken(IOptyRegistry.StrategyStep[] memory _strategySteps, address _account) 
    public view returns(uint _balance) {
     _balance = IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).
     balanceInToken(_strategySteps[0].lendingPoolToken, _account);

    }
    
    function deploy(uint _amount, bytes32 _hash) public onlyValidAddress returns(bool _success) {
    require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash");   
    require(_amount > 0, "!_amount");
    IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1) {
            require(singleStepDeploy(_amount,_strategySteps),"!singleStepDeploy()");
        }
        else {
            revert("not implemented");
        }
        _success = true;
    }
    
    function singleStepDeploy(uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps) public onlyValidAddress returns(bool _success) {
        require(_amount > 0, "!_amount");
        require(_strategySteps.length == 1,"!_strategySteps.length");
        IERC20(_strategySteps[0].token).safeTransfer(_strategySteps[0].poolProxy, _amount);
        require(IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).
        deploy(_strategySteps[0].token, _strategySteps[0].liquidityPool,_strategySteps[0].lendingPoolToken, _amount));
        IERC20(_strategySteps[0].lendingPoolToken).
        safeTransfer(msg.sender, IOptyLiquidityPoolProxy(
            _strategySteps[0].poolProxy).balance(_strategySteps[0].lendingPoolToken,address(this)
            ));
        _success = true;
    }
    
    function recall(uint _amount, bytes32 _hash) public onlyValidAddress returns(bool _success) {
        require(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!_hash"); 
        require(_amount > 0, "!_amount");
        IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1) {
            require(singleStepRecall(_amount,_strategySteps),"!singleStepDeploy()");
        }
        else {
            revert("not implemented");
        }
        _success = true;
    }
    
    function singleStepRecall(uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps) public onlyValidAddress returns(bool _success) {
        require(_amount > 0, "!_amount");
        require(_strategySteps.length == 1,"!_strategySteps.length");
        IERC20(_strategySteps[0].lendingPoolToken).safeTransfer(_strategySteps[0].poolProxy,_amount);
        require(IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).recall(_strategySteps[0].token,_strategySteps[0].lendingPoolToken,_amount));
        IERC20(_strategySteps[0].token).safeTransfer(msg.sender,IERC20(_strategySteps[0].token).balanceOf(address(this)));
        _success = true;
    }
    
    function _getStrategySteps(bytes32 _hash) internal view returns(IOptyRegistry.StrategyStep[] memory _strategySteps) {
        (,,,, _strategySteps) = IOptyRegistry(optyRegistry).getStrategy(_hash);
    }
    
    function getLiquidityPoolToken(bytes32 _hash) public view returns(address _lendingPool) {
        IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1){
            _lendingPool = getSingleStepLiquidityPoolToken(_strategySteps);
        }
        else{
            revert("not implemented");
        }
    }
    
    function getSingleStepLiquidityPoolToken(IOptyRegistry.StrategyStep[] memory _strategySteps) public pure returns(address) {
        return _strategySteps[0].lendingPoolToken;
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
    
    /**
     * @dev Modifier to check if the address is zero address or not
     */
    modifier onlyValidAddress(){
        require(msg.sender != address(0), "zero address");
        _;
    }
}