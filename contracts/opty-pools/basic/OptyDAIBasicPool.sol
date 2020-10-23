// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../../libraries/SafeERC20.sol";
import "./../../utils/ERC20.sol";
import "./../../utils/ERC20Detailed.sol";
import "./../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "./../../utils/Ownable.sol";
import "./../../utils/ReentrancyGuard.sol";
import "./../../interfaces/opty/IRiskManager.sol";
import "./../../interfaces/opty/IOptyStrategy.sol";

/**
 * @dev Opty.Fi's Basic Pool contract for DAI token
 */
contract OptyDAIBasicPool is ERC20, ERC20Detailed, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

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
    
    function setProfile(string memory _profile) public onlyOwner onlyValidAddress returns (bool _success)  {
        require(bytes(_profile).length > 0, "empty!");
        profile = _profile;
        _success = true;
    }
    
    function setRiskManager(address _riskManager) public onlyOwner onlyValidAddress returns (bool _success) {
        require(_riskManager != address(0),"!_riskManager");
        require(_riskManager.isContract(),"!_riskManager.isContract");
        riskManager = _riskManager;
        _success = true;
    }

    function setToken(address _underlyingToken) public onlyOwner onlyValidAddress returns (bool _success) {
        require(_underlyingToken != address(0),"!_underlyingToken");
        require(_underlyingToken.isContract(),"!_underlyingToken.isContract");
         token = _underlyingToken;
         _success = true;
    }
    
    function setOptyStrategy(address _optyStrategy) public onlyOwner onlyValidAddress returns (bool _success) {
        require(_optyStrategy != address(0),"!_optyStrategy");
        require(_optyStrategy.isContract(),"!_optyStrategy.isContract");
         optyStrategy = _optyStrategy;
         _success = true;
    }
    
    function supplyToken(uint _amount) public onlyValidAddress {
       require(_amount > 0,"withdraw must be greater than 0");
       IERC20(token).safeTransfer(optyStrategy, _amount);
       IOptyStrategy(optyStrategy).deploy(_amount,strategyHash);
    }
    
    function rebalance() public onlyValidAddress {
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
        require(_amount > 0,"insufficient funds");
        uint256 b = IOptyStrategy(optyStrategy).balance(strategyHash,address(this));
        uint256 bT = IOptyStrategy(optyStrategy).balanceInToken(strategyHash,address(this));
        require(bT >= _amount, "insufficient funds");
        // can have unintentional rounding errors
        uint256 amount = (b.mul(_amount)).div(bT).add(1);
        _withdrawToken(amount);
    }
    
    function _withdrawToken(uint _amount) internal {
        require(_amount > 0,"insufficient funds");
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
    function redeem(uint256 _redeemAmount) external onlyValidAddress nonReentrant returns(bool) {
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
    
    /**
     * @dev Modifier to check if the address is zero address or not
     */
    modifier onlyValidAddress(){
        require(msg.sender != address(0), "zero address");
        _;
    }
}
