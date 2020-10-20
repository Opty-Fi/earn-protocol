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
//  Deepanshu TODO: Need to change this import for withdraw functionality acc. to new Interface ie IOptyLiquidityPoolProxy
// import "./../../interfaces/OptyLiquidityPool/IOptyLiquidityPool.sol";
import "./../../OptyRegistry.sol";
import "./../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "./../../utils/Ownable.sol";
import "./../../utils/ReentrancyGuard.sol";

interface IOptyRegistry{
    struct LiquidityPool{
        uint8 rating;
        bool  isLiquidityPool;
    }
    
    struct StrategyStep {
        address token; 
        address creditPool; 
        address borrowToken; 
        address liquidityPool; 
        address strategyContract;
        address lendingPoolToken;
        address poolProxy;
    }

    struct Strategy { 
        uint8          score;
        bool           isStrategy;
        uint256        index;
        uint256        blockNumber;
        StrategyStep[] strategySteps;
    }

    function tokenToStrategies(address _underLyingToken, uint256 index) external view returns(bytes32);
    function getStrategy(bytes32 _hash) external view returns(uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps);
    function getTokenStrategies(address _token) external view returns(bytes32[] memory);
    function liquidityPools(address _pool) external view returns(LiquidityPool memory);
}

interface IRiskManager {
    // function getBestStrategy(string memory _profile, address _underlyingToken) external view returns (IOptyRegistry.Strategy memory strategy);
    function getBestStrategy(string memory _profile, address _underlyingToken) external view returns (bytes32 hash);
}

interface IDelegatedStrategyPool{
    function deploy(uint _amount, bytes32 _hash) external returns(bool _success);
    function recall(uint _amount, bytes32 _hash) external returns(bool _success);
    function balance(bytes32 _hash, address _account) external view returns(uint _balance);
    function balanceInToken(bytes32 _hash, address _account) external view returns(uint _balance);
    function getLiquidityPool(bytes32 _hash) external view returns(address _lendingPool);
}

contract DelegatedStrategyPool {
    
    using SafeERC20 for IERC20;

    
    address public optyRegistry;
    address public governance;


    constructor(address _optyRegistry) public {
          governance = msg.sender;
        optyRegistry = _optyRegistry;
    }

    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        optyRegistry = _optyRegistry;
    }
    
    function balance(bytes32 _hash, address _account) public view returns(uint _balance) {
        _balance = 0;
        if(_hash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
         IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
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
    
    function deploy(uint _amount, bytes32 _hash) public returns(bool _success) {
    IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1) {
            require(singleStepDeploy(_amount,_strategySteps),"!singleStepDeploy()");
        }
        else {
            revert("not implemented");
        }
        _success = true;
    }
    
    function singleStepDeploy(uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps) public returns(bool _success) {
        IERC20(_strategySteps[0].token).safeTransfer(_strategySteps[0].poolProxy, _amount);
        IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).deploy(_strategySteps[0].token, _strategySteps[0].liquidityPool, 
        _strategySteps[0].lendingPoolToken, _amount);
        IERC20(_strategySteps[0].lendingPoolToken).
        safeTransfer(msg.sender, IOptyLiquidityPoolProxy(
            _strategySteps[0].poolProxy).balance(_strategySteps[0].liquidityPool,address(this)
            ));
        _success = true;
    }
    
    function recall(uint _amount, bytes32 _hash) public returns(bool _success) {
        IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1) {
            require(singleStepRecall(_amount,_strategySteps),"!singleStepDeploy()");
        }
        else {
            revert("not implemented");
        }
        _success = true;
    }
    
    function singleStepRecall(uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps) public returns(bool _success) {
        IERC20(_strategySteps[0].lendingPoolToken).safeTransferFrom(msg.sender,_strategySteps[0].poolProxy,_amount);
        require(IOptyLiquidityPoolProxy(_strategySteps[0].poolProxy).recall(_strategySteps[0].token,_strategySteps[0].lendingPoolToken,_amount));
        IERC20(_strategySteps[0].token).safeTransfer(msg.sender,IERC20(_strategySteps[0].token).balanceOf(address(this)));
        _success = true;
    }
    
    function _getStrategySteps(bytes32 _hash) internal view returns(IOptyRegistry.StrategyStep[] memory _strategySteps) {
        (,,,, _strategySteps) = IOptyRegistry(optyRegistry).getStrategy(_hash);
    }
    
    function getLiquidityPool(bytes32 _hash) public view returns(address _lendingPool) {
        IOptyRegistry.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(_strategySteps.length == 1){
            _lendingPool = getSingleStepLiquidityPool(_strategySteps);
        }
        else{
            revert("not implemented");
        }
    }
    
    function getSingleStepLiquidityPool(IOptyRegistry.StrategyStep[] memory _strategySteps) public pure returns(address) {
        return _strategySteps[0].liquidityPool;
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
}

/**
 * @dev Opty.Fi's Basic Pool contract for DAI token
 */
contract OptyDAIBasicPool is ERC20, ERC20Detailed, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // IOptyRegistry.Strategy public currentStrategy;
    bytes32 public strategyHash;
    address public token; //  store the Dai token contract address
    address public riskManager;
    address public delegatedStrategyPool;
    uint256 public poolValue;
    string public profile;
    
    
    
    /**
     * @dev
     *  - Constructor used to initialise the Opty.Fi token name, symbol, decimals for DAI token
     *  - Storing the DAI contract address also in the contract
     */
    constructor(string memory _profile, address _riskManager, address _underlyingToken, address _delegatedStrategyPool) public ERC20Detailed("Opty Fi DAI", "opDai", 18) {
        
        setProfile(_profile);
        setRiskManager(_riskManager);
        setToken(_underlyingToken); //  DAI token contract address
        setDelegatedStartegyPool(_delegatedStrategyPool);
        // provider = Lender.COMPOUND;
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
    
    function setDelegatedStartegyPool(address _delegatedStrategyPool) public onlyOwner returns (bool _success) {
         delegatedStrategyPool = _delegatedStrategyPool;
         _success = true;
    }
    
    function rebalance() public {
    // Lender newProvider = recommend();
    bytes32 newStrategyHash = IRiskManager(riskManager).getBestStrategy(profile,token);

    if (keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash))) {
      uint256 amount = IDelegatedStrategyPool(delegatedStrategyPool).balance(strategyHash,address(this));
    if (amount > 0) {
        address lendingPool = IDelegatedStrategyPool(delegatedStrategyPool).getLiquidityPool(strategyHash);
      IERC20(lendingPool).safeTransfer(delegatedStrategyPool, amount);
      IDelegatedStrategyPool(delegatedStrategyPool).recall(amount,strategyHash);
     }
    }

    if (balance() > 0) {
        IERC20(token).safeTransfer(delegatedStrategyPool, balance());
        IDelegatedStrategyPool(delegatedStrategyPool).deploy(balance(),strategyHash);
    }

    strategyHash = newStrategyHash;
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
        (bool success , bytes memory returnedData) = 
        delegatedStrategyPool.
        staticcall(abi.encodeWithSignature("balanceInToken(bytes32,address)",strategyHash,address(this)));
        require(success);
        (uint balanceInToken) = abi.decode(returnedData,(uint));
        return balanceInToken.add(balance());
    }

    /**
     * @dev Function to get the DAI balance of OptyPool Contract
     */
    function balance() public view returns (uint256) {
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
    
    /**
     * @dev Function to withdraw the cDai tokens from the compound dai liquidity pool
     * 
     * Requirements:
     *  -   optyCompoundDaiLiquidityPool: Opty.Fi's CompoundDaiLiquidityPool address from where cDai's
     *      contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the compound dai's liquidity pool. Its uints are: 
     *      in  weth uints i.e. 1e18
     */
    // function redeem(uint256 _redeemAmount) external nonReentrant returns(bool) {
    //     require(_redeemAmount > 0, "withdraw must be greater than 0");
        
    //     uint256 opBalance = balanceOf(msg.sender);
    //     require(_redeemAmount <= opBalance, "Insufficient balance");
        
    //     poolValue = calPoolValueInToken();
    //     uint256 redeemAmountInToken = (poolValue.mul(_redeemAmount)).div(totalSupply());
        
    //     //  Updating the totalSupply of opDai tokens
    //     _balances[msg.sender] = _balances[msg.sender].sub(_redeemAmount, "Redeem amount exceeds balance");
    //     _totalSupply = _totalSupply.sub(_redeemAmount);
    //     emit Transfer(msg.sender, address(0), _redeemAmount);
        
    //     // Check Token balance
    //   uint256 tokenBalance = IERC20(token).balanceOf(address(this));
      
    //   if (tokenBalance < redeemAmountInToken) {
    // //       // TODO
    // //       // get the best strategy from RM 
    // //       // withdraw All if newProvider != provider
          
    // //       // Withdraw some if provider is unchanged
    
    // // TODO : Include this calculation as a part of Proxy
    // // -------------------------------------------------
    // uint256 _amt =  redeemAmountInToken.sub(tokenBalance);
    // uint256 balComp = IOptyLiquidityPoolProxy(currentStrategy.strategySteps[0].poolProxy).
    // balance(currentStrategy.strategySteps[0].lendingPoolToken, address(this));
    // uint256 balToken = IOptyLiquidityPoolProxy(currentStrategy.strategySteps[0].poolProxy).
    // balanceInToken(currentStrategy.strategySteps[0].lendingPoolToken, address(this));
    // require(balToken >= _amt, "insufficient funds");
    // // can have unintentional rounding errors
    // uint256 amount = (balComp.mul(_amt)).div(balToken).add(1);
    // // ---------------------------------------------
    //     IERC20(currentStrategy.strategySteps[0].lendingPoolToken).
    //     safeTransfer(currentStrategy.strategySteps[0].poolProxy, amount);
    //     require(IOptyLiquidityPoolProxy(currentStrategy.strategySteps[0].poolProxy).
    //     recall(currentStrategy.strategySteps[0].token,currentStrategy.strategySteps[0].lendingPoolToken,amount));
    //   }

    //   IERC20(token).safeTransfer(msg.sender, redeemAmountInToken);
    //   // TODO: redeploy if provider is changes 
       
    //     //  Get the liquidityPool's address from the getStrategy()
    //     // address _liquidityPool = getStrategy(token, "basic", 0)[0].liquidityPool;
    //     // address _liquidityPool = address(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
        
    //     //  Calling the withdraw function  from the IOptyLiquidityPool interface for cDai tokens
    //     // optyCompoundDaiLiquidityPool is the address the OptyFi's Compound Dai Interaction contract
    //     // _withdrawStatus = IOptyLiquidityPool(optyCompoundDaiLiquidityPool).withdraw(_liquidityPool, redeemOpDaiInDai);
    //   poolValue = calPoolValueInToken();
    //   return true;
    // }
}
