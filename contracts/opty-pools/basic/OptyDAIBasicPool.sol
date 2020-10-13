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
}

interface IRiskManager {
    function getBestStrategy(string memory _profile, address _underlyingToken) external view returns (IOptyRegistry.Strategy memory strategy);
}

/**
 * @dev Opty.Fi's Basic Pool contract for DAI token
 */
contract OptyDAIBasicPool is ERC20, ERC20Detailed, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IOptyRegistry.Strategy public currentStrategy;
    address public token; //  store the Dai token contract address
    // uint256 totalsupply;
    uint256 private poolValue;
    address public riskManager;
    string public profile;
    
    
    /**
     * @dev
     *  - Constructor used to initialise the Opty.Fi token name, symbol, decimals for DAI token
     *  - Storing the DAI contract address also in the contract
     */
    constructor(string memory _profile, address _riskManager, address _underlyingToken) public ERC20Detailed("Opty Fi DAI", "opDai", 18) {
        
        setProfile(_profile);
        setRiskManager(_riskManager);
        setToken(_underlyingToken); //  DAI token contract address
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
        
        IOptyRegistry.Strategy memory tempStrategy = IRiskManager(riskManager).getBestStrategy(profile, token);
        currentStrategy.score = tempStrategy.score;
        currentStrategy.isStrategy = tempStrategy.isStrategy;
        currentStrategy.index = tempStrategy.index;
        currentStrategy.blockNumber = tempStrategy.blockNumber;
        currentStrategy.strategySteps.push(IOptyRegistry.StrategyStep(tempStrategy.strategySteps[0].token, tempStrategy.strategySteps[0].creditPool,
        tempStrategy.strategySteps[0].borrowToken, tempStrategy.strategySteps[0].liquidityPool, tempStrategy.strategySteps[0].strategyContract,
        tempStrategy.strategySteps[0].lendingPoolToken, tempStrategy.strategySteps[0].poolProxy));
        
        IERC20(token).safeTransferFrom(msg.sender, currentStrategy.strategySteps[0].poolProxy, _amount);
        
        
        IOptyLiquidityPoolProxy(currentStrategy.strategySteps[0].poolProxy).deploy(currentStrategy.strategySteps[0].token, currentStrategy.strategySteps[0].liquidityPool, 
        currentStrategy.strategySteps[0].lendingPoolToken, _amount);
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
        if (currentStrategy.isStrategy ) {
            return IOptyLiquidityPoolProxy(currentStrategy.strategySteps[0].poolProxy).balanceInToken(currentStrategy.strategySteps[0].lendingPoolToken, address(this)).add(balance());       
        } 
        return balance();
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
    function redeem(address optyCompoundDaiLiquidityPool, uint256 _redeemAmount) external nonReentrant returns(bool _withdrawStatus) {
        require(_redeemAmount > 0, "withdraw must be greater than 0");
        
        uint256 opDaiUserBalanceBefore = balanceOf(msg.sender);
        require(_redeemAmount <= opDaiUserBalanceBefore, "Insufficient balance");
        
        poolValue = calPoolValueInToken();
        uint256 redeemOpDaiInDai = (poolValue.mul(_redeemAmount)).div(totalSupply());
        
        //  Updating the totalSupply of opDai tokens
        _balances[msg.sender] = _balances[msg.sender].sub(_redeemAmount, "Redeem amount exceeds balance");
        _totalSupply = _totalSupply.sub(_redeemAmount);
        emit Transfer(msg.sender, address(0), _redeemAmount);
        
        //  Get the liquidityPool's address from the getStrategy()
        // address _liquidityPool = getStrategy(token, "basic", 0)[0].liquidityPool;
        address _liquidityPool = address(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
        
        //  Calling the withdraw function  from the IOptyLiquidityPool interface for cDai tokens
        // optyCompoundDaiLiquidityPool is the address the OptyFi's Compound Dai Interaction contract
        _withdrawStatus = IOptyLiquidityPool(optyCompoundDaiLiquidityPool).withdraw(_liquidityPool, redeemOpDaiInDai);
        poolValue = calPoolValueInToken();
    }
}
