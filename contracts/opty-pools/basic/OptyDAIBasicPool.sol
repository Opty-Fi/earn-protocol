// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../../libraries/SafeMath.sol";
import "./../../libraries/Addresses.sol";
import "./../../libraries/SafeERC20.sol";
import "./../../utils/Context.sol";
import "./../../utils/ERC20.sol";
import "./../../utils/ERC20Detailed.sol";
import "./../../utils/Modifiers.sol";
import "./../../interfaces/compound/ICompound.sol";
import "./../../OptyRegistry.sol";
import "./../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "./../../utils/Ownable.sol";
import "./../../utils/ReentrancyGuard.sol";
import "./../../interfaces/opty/IOptyRegistry.sol";
import "./../../interfaces/opty/IRiskManager.sol";
import "./../../interfaces/opty/IOptyStrategy.sol";

// contract OptyStrategy {
    
//     using SafeERC20 for IERC20;

    
//     address public optyRegistry;
//     address public governance;


//     constructor(address _optyRegistry) public {
//           governance = msg.sender;
//         optyRegistry = _optyRegistry;
//     }

//     function setOptyRegistry(address _optyRegistry) public onlyGovernance {
//         optyRegistry = _optyRegistry;
//     }
    
//     function balance(bytes32 _hash, address _account) public view returns(uint _balance) {
//         _balance = 0;
//         if(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
//          IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
//         if(_strategySteps.length == 1){
//             _balance = singleStepBalance(_strategySteps, _account);
//         }
//         else {
//             revert("not-implemented");
//         }
//         }
//     }
    
//     function singleStepBalance(IOptyRegistry.StrategyStep[] memory _strategySteps, address _account) 
//     public view returns(uint _balance) {
//      _balance = IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).
//      balance(_strategySteps[0].lendingPoolToken, _account);

//     }
    
//     function balanceInToken(bytes32 _hash, address _account) public view returns(uint _balance) {
//         _balance = 0;
//         if(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
//           IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
//         if(_strategySteps.length == 1){
//             _balance = singleStepBalanceInToken(_strategySteps, _account);
//         }
//         else {
//             revert("not-implemented");
//         }
//         }
//     }
    
//     function singleStepBalanceInToken(IOptyRegistry.StrategyStep[] memory _strategySteps, address _account) 
//     public view returns(uint _balance) {
//      _balance = IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).
//      balanceInToken(_strategySteps[0].lendingPoolToken, _account);

//     }
    
//     function deploy(uint _amount, bytes32 _hash) public returns(bool _success) {
//     IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
//         if(_strategySteps.length == 1) {
//             require(singleStepDeploy(_amount,_strategySteps),"!singleStepDeploy()");
//         }
//         else {
//             revert("not implemented");
//         }
//         _success = true;
//     }
    
//     function singleStepDeploy(uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps) public returns(bool _success) {
//         IERC20(_strategySteps[0].token).safeTransfer(_strategySteps[0].poolProxy, _amount);
//         require(IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).
//         deploy(_strategySteps[0].token, _strategySteps[0].liquidityPool,_strategySteps[0].lendingPoolToken, _amount));
//         IERC20(_strategySteps[0].lendingPoolToken).
//         safeTransfer(msg.sender, IOptyLiquidityPoolProxy(
//             _strategySteps[0].poolProxy).balance(_strategySteps[0].lendingPoolToken,address(this)
//             ));
//         _success = true;
//     }
    
//     function recall(uint _amount, bytes32 _hash) public returns(bool _success) {
//         IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
//         if(_strategySteps.length == 1) {
//             require(singleStepRecall(_amount,_strategySteps),"!singleStepDeploy()");
//         }
//         else {
//             revert("not implemented");
//         }
//         _success = true;
//     }
    
//     function singleStepRecall(uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps) public returns(bool _success) {
//         IERC20(_strategySteps[0].lendingPoolToken).safeTransfer(_strategySteps[0].poolProxy,_amount);
//         require(IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).recall(_strategySteps[0].token,_strategySteps[0].lendingPoolToken,_amount));
//         IERC20(_strategySteps[0].token).safeTransfer(msg.sender,IERC20(_strategySteps[0].token).balanceOf(address(this)));
//         _success = true;
//     }
    
//     function _getStrategySteps(bytes32 _hash) internal view returns(IOptyRegistry.StrategyStep[] memory _strategySteps) {
//         (,,,, _strategySteps) = IOptyRegistry(optyRegistry).getStrategy(_hash);
//     }
    
//     function getLiquidityPoolToken(bytes32 _hash) public view returns(address _lendingPool) {
//         IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
//         if(_strategySteps.length == 1){
//             _lendingPool = getSingleStepLiquidityPoolToken(_strategySteps);
//         }
//         else{
//             revert("not implemented");
//         }
//     }
    
//     function getSingleStepLiquidityPoolToken(IOptyRegistry.StrategyStep[] memory _strategySteps) public pure returns(address) {
//         return _strategySteps[0].lendingPoolToken;
//     }
    
//     /**
//      * @dev Modifier to check caller is governance or not
//      */
//     modifier onlyGovernance() {
//         require(msg.sender == governance, "!governance");
//         _;
//     }
// }

/**
 * @dev Opty.Fi's Basic Pool contract for DAI token
 */
contract OptyDAIBasicPool is ERC20, ERC20Detailed, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public strategyHash;
    address public token; //  store the Dai token contract address
    address public riskManager;
    address public optyStrategy;
    uint256 public poolValue;
    string  public profile;
    
    
    
    /**
     * @dev
     *  - Constructor used to initialise the Opty.Fi token name, symbol, decimals for DAI token
     *  - Storing the DAI contract address also in the contract
     */
    constructor(string memory _profile, address _riskManager, address _underlyingToken, address _optyStrategy) public ERC20Detailed("Opty Fi DAI", "opDai", 18) {
        
        setProfile(_profile);
        setRiskManager(_riskManager);
        setToken(_underlyingToken); //  DAI token contract address
        setOptyStrategy(_optyStrategy);
    }
    
    function setProfile(string memory _profile) public onlyOwner returns (bool _success)  {
        profile = _profile;
        _success = true;
    }
    
    function setRiskManager(address _riskManager) public onlyOwner returns (bool _success) {
        riskManager = _riskManager;
        _success = true;
    }

    function setToken(address _underlyingToken) public onlyOwner returns (bool _success) {
         token = _underlyingToken;
         _success = true;
    }
    
    function setOptyStrategy(address _optyStrategy) public onlyOwner returns (bool _success) {
         optyStrategy = _optyStrategy;
         _success = true;
    }
    
    function supplyToken(uint _amount) public {
       IERC20(token).safeTransfer(optyStrategy, _amount);
       IOptyStrategy(optyStrategy).deploy(_amount,strategyHash);
    }
    
    function rebalance() public {
    bytes32 newStrategyHash = IRiskManager(riskManager).getBestStrategy(profile,token);
    
    if (keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash))) {
        _withdrawAll();
    }
    
    strategyHash = newStrategyHash;
    
    if (balance() > 0) {
        supplyToken(balance());
    }
    }
  
    function _rebalance(bytes32 _newStrategyHash) internal {
        if(balance() > 0){
          supplyToken(balance());
        }
        strategyHash = _newStrategyHash;
    }
    
    /**
     * @dev Function for depositing DAI tokens into the contract and in return giving opDai tokens to the user
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function invest(uint256 _amount) external nonReentrant returns (bool _success) {
        require(_amount > 0, "deposit must be greater than 0");

        poolValue = calPoolValueInToken();
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        
        rebalance();

        //  Calculate the shares value for opDai tokens
        uint256 shares = 0;
        if (poolValue == 0) {
            //  Considering 1:1 ratio (Eg: 1 Dai= 1 opDai)
            shares = _amount;
        } else {
            //  Calculating the opDai shares on the basis of totalSupply and poolValue
            shares = (_amount.mul(totalSupply())).div(poolValue);
        }
        poolValue = calPoolValueInToken();
        //  Funtion to mint the opDai tokens for the user equivallent to _shares send as DAI tokens
        _mint(msg.sender, shares);
        _success = true;
    }

    /**
     * @dev Function to calculate pool value in DAI
     *
     * Note:
     *  - Need to modify this function in future whenever 2nd layer of depositing the DAI into any
     *    credit pool like compound is added.
     */
    function calPoolValueInToken() internal view returns (uint256) {
        uint balanceInToken = IOptyStrategy(optyStrategy).balanceInToken(strategyHash,address(this));
        return balanceInToken.add(balance());
    }

    /**
     * @dev Function to get the DAI balance of OptyPool Contract
     */
    function balance() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    function _balance() internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Function to withdraw DAI corresponding to opDai
     *
     * Requirements:
     *
     *  - _withdrawalAmount should be greater than 0
     *  - _withdrawalAmount is in waopdai units, Eg: _withdrawalAmount = 1e18 waopdai means _withdrawalAmount = 1 opDai
     */
    function _withdraw(uint256 _withdrawalAmount) external nonReentrant returns (bool _success) {
        require(_withdrawalAmount > 0, "Withdrawal amount must be greater than 0");

        uint256 opDaiUserBalanceBefore = balanceOf(msg.sender);
        require(_withdrawalAmount <= opDaiUserBalanceBefore, "Insufficient balance");

        poolValue = calPoolValueInToken();
        uint256 redeemOpDaiInDai = (poolValue.mul(_withdrawalAmount)).div(totalSupply());

        _balances[msg.sender] = _balances[msg.sender].sub(_withdrawalAmount, "withdrawal amount exceeds balance");
        _totalSupply = _totalSupply.sub(_withdrawalAmount);
        emit Transfer(msg.sender, address(0), _withdrawalAmount);

        IERC20(token).safeTransfer(msg.sender, redeemOpDaiInDai);
        poolValue = calPoolValueInToken();
        emit Transfer(address(this), msg.sender, redeemOpDaiInDai);
        _success = true;
    }
    
    function _withdrawAll() internal {
        uint256 amount = IOptyStrategy(optyStrategy).balance(strategyHash,address(this));
        if (amount > 0) {
            _withdrawToken(amount);
        }
    }
    
    function _withdrawSome(uint _amount) internal {
        uint256 b = IOptyStrategy(optyStrategy).balance(strategyHash,address(this));
        uint256 bT = IOptyStrategy(optyStrategy).balanceInToken(strategyHash,address(this));
        require(bT >= _amount, "insufficient funds");
        // can have unintentional rounding errors
        uint256 amount = (b.mul(_amount)).div(bT).add(1);
        _withdrawToken(amount);
    }
    
    function _withdrawToken(uint _amount) internal {
        address lendingPoolToken =
        IOptyStrategy(optyStrategy).getLiquidityPoolToken(strategyHash);
        IERC20(lendingPoolToken).safeTransfer(optyStrategy,_amount);
        require(IOptyStrategy(optyStrategy).recall(_amount,strategyHash));
    }
    
    /**
     * @dev Function to withdraw the cDai tokens from the compound dai liquidity pool
     * 
     * Requirements:
     *  -   optyCompoundDaiLiquidityPool: Opty.Fi's CompoundDaiLiquidityPool address from where cDai's
     *      contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the compound dai's liquidity pool. Its uints are: 
     *      in  weth uints i.e. 1e18
     */
    function redeem(uint256 _redeemAmount) external nonReentrant returns(bool) {
        require(_redeemAmount > 0, "withdraw must be greater than 0");
        
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "Insufficient balance");
        
        poolValue = calPoolValueInToken();
        uint256 redeemAmountInToken = (poolValue.mul(_redeemAmount)).div(totalSupply());
        
        //  Updating the totalSupply of op tokens
        _balances[msg.sender] = _balances[msg.sender].sub(_redeemAmount, "Redeem amount exceeds balance");
        _totalSupply = _totalSupply.sub(_redeemAmount);
        emit Transfer(msg.sender, address(0), _redeemAmount);
        
        // Check Token balance
      uint256 tokenBalance = IERC20(token).balanceOf(address(this));
      bytes32 newStrategyHash =  strategyHash;
      if (tokenBalance < redeemAmountInToken) {
          newStrategyHash = IRiskManager(riskManager).getBestStrategy(profile,token);
          if (keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash))) {
              _withdrawAll();
          }
          else {
              _withdrawSome(redeemAmountInToken.sub(tokenBalance));
          }
      }
       IERC20(token).safeTransfer(msg.sender, redeemAmountInToken);
       if (keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash))) {
           _rebalance(newStrategyHash);
      }
      poolValue = calPoolValueInToken();
      return true;
    }
}
