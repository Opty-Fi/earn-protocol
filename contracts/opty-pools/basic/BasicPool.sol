// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../../libraries/SafeERC20.sol";
import "./../../utils/ERC20.sol";
import "./../../utils/ERC20Detailed.sol";
import "./../../utils/Ownable.sol";
import "./../../utils/ReentrancyGuard.sol";
import "./../../RiskManager.sol";
import "./../../StrategyManager.sol";
import "./../../utils/Modifiers.sol";

/**
 * @dev Opty.Fi's Basic Pool contract for underlying tokens (for example DAI)
 */
contract BasicPool is ERC20, ERC20Detailed, Modifiers, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    bytes32 public strategyHash;
    address public token; //  store the underlying token contract address (for example DAI)
    uint256 public poolValue;
    string  public profile;
    
    StrategyManager StrategyManagerContract;
    RiskManager RiskManagerContract;
    
    /**
     * @dev
     *  - Constructor used to initialise the Opty.Fi token name, symbol, decimals for token (for example DAI)
     *  - Storing the underlying token contract address (for example DAI)
     */
    constructor(
        string memory _profile, 
        address _riskManager, 
        address _underlyingToken, 
        address _strategyManager
        ) public ERC20Detailed(
                                string(abi.encodePacked("opty ",ERC20Detailed(_underlyingToken).name()," ",_profile)),
                                string(abi.encodePacked("op", ERC20Detailed(_underlyingToken).symbol(),_profile)),
                                ERC20Detailed(_underlyingToken).decimals()
                            ) {
        
        setProfile(_profile);
        setRiskManager(_riskManager);
        setToken(_underlyingToken); //  underlying token contract address (for example DAI)
        setStrategyManager(_strategyManager);
    }
    
    function setProfile(string memory _profile) public onlyOwner onlyValidAddress returns (bool _success)  {
        require(bytes(_profile).length > 0, "empty!");
        profile = _profile;
        _success = true;
    }
    
    function setRiskManager(address _riskManager) public onlyOwner onlyValidAddress returns (bool _success) {
        require(_riskManager != address(0),"!_riskManager");
        require(_riskManager.isContract(),"!_riskManager.isContract");
        RiskManagerContract = RiskManager(_riskManager);
        _success = true;
    }

    function setToken(address _underlyingToken) public onlyOwner onlyValidAddress returns (bool _success) {
        require(_underlyingToken != address(0),"!_underlyingToken");
        require(_underlyingToken.isContract(),"!_underlyingToken.isContract");
         token = _underlyingToken;
         _success = true;
    }
    
    function setStrategyManager(address _strategyManager) public onlyOwner onlyValidAddress returns (bool _success) {
        require(_strategyManager != address(0),"!_strategyManager");
        require(_strategyManager.isContract(),"!_strategyManager.isContract");
         StrategyManagerContract = StrategyManager(_strategyManager);
         _success = true;
    }
    
    function supplyToken(uint _amount) public onlyValidAddress {
       require(_amount > 0,"withdraw must be greater than 0");
       IERC20(token).safeApprove(address(StrategyManagerContract), _amount);
       StrategyManagerContract.poolDeposit(token,_amount,strategyHash);
    }
    
    function rebalance() public onlyValidAddress {
        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = token;
        bytes32 newStrategyHash = RiskManagerContract.getBestStrategy(profile,_underlyingTokens);
    
        if (keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash))
            && strategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
                _withdrawAll();
        }
    
        strategyHash = newStrategyHash;
    
        if (balance() > 0) {
            supplyToken(balance());
        }
    }
  
    function _rebalance() internal {
        if(balance() > 0){
          supplyToken(balance());
        }
    }

    /**
     * @dev Function to calculate pool value in underlying token (for example DAI)
     *
     * Note:
     *  - Need to modify this function in future whenever 2nd layer of depositing the underlying token (for example DAI) into any
     *    credit pool like compound is added.
     */
    function calPoolValueInToken() internal view returns (uint256) {
        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = token;
        uint balanceInToken = StrategyManagerContract.
                                    balanceInToken(
                                        strategyHash,
                                        token,
                                        address(this)
                                    );
        return balanceInToken.add(balance());
    }

    /**
     * @dev Function to get the underlying token balance of OptyPool Contract
     */
    function balance() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    function _balance() internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    function _withdrawAll() internal {
        address _lendingPoolToken = StrategyManagerContract.getOutputToken(strategyHash);
        uint256 _amount = IERC20(_lendingPoolToken).balanceOf(address(this));
        if (_amount > 0) {
            _withdrawToken(_amount);
        }
    }
    
    function _withdrawSome(uint _amount) internal {
        require(_amount > 0,"insufficient funds");
        address _lendingPoolToken = StrategyManagerContract.getOutputToken(strategyHash);
        uint256 b = IERC20(_lendingPoolToken).balanceOf(address(this));
        uint256 bT = StrategyManagerContract.balanceInToken(strategyHash,token,address(this));
        require(bT >= _amount, "insufficient funds");
        // can have unintentional rounding errors
        uint256 amount = (b.mul(_amount)).div(bT).add(1);
        _withdrawToken(amount);
    }
    
    function _withdrawToken(uint _amount) internal {
        require(_amount > 0,"insufficient funds");
        address _lendingPoolToken = StrategyManagerContract.getOutputToken(strategyHash);
        IERC20(_lendingPoolToken).safeApprove(address(StrategyManagerContract),_amount);
        require(StrategyManagerContract.poolWithdraw(token,_amount,strategyHash));
    }
    
    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract and in return giving op tokens to the user
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function userDeposit(uint256 _amount) external nonReentrant returns (bool _success) {
        require(_amount > 0, "deposit must be greater than 0");

        poolValue = calPoolValueInToken();
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        
        //  Calculate the shares value for opToken tokens (for example opDAI)
        uint256 shares = 0;
        if (poolValue == 0) {
            //  Considering 1:1 ratio (Eg: 1 Dai= 1 opDai)
            shares = _amount;
            poolValue = _amount;
        } else {
            //  Calculating the opToken shares on the basis of totalSupply and poolValue
            shares = (_amount.mul(totalSupply())).div(poolValue);
        }
        poolValue = calPoolValueInToken();
        //  Funtion to mint the opToken for the user equivallent to _shares send as DAI tokens
        _mint(msg.sender, shares);
        _success = true;
    }
    
    /**
     * @dev Function for depositing underlying tokens (for example DAI) into the contract and in return giving op tokens to the user
     *
     * Requirements:
     *
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function userDepositRebalance(uint256 _amount) external nonReentrant returns (bool _success) {
        require(_amount > 0, "deposit must be greater than 0");

        poolValue = calPoolValueInToken();
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        
        rebalance();

        //  Calculate the shares value for opToken tokens (for example opDAI)
        uint256 shares = 0;
        if (poolValue == 0) {
            //  Considering 1:1 ratio (Eg: 1 Dai= 1 opDai)
            shares = _amount;
        } else {
            //  Calculating the opToken shares on the basis of totalSupply and poolValue
            shares = (_amount.mul(totalSupply())).div(poolValue);
        }
        poolValue = calPoolValueInToken();
        //  Funtion to mint the opToken for the user equivallent to _shares send as DAI tokens
        _mint(msg.sender, shares);
        _success = true;
    }
    
    /**
     * @dev Function to withdraw token (for example DAI) corresponding to opToken
     *
     * Requirements:
     *
     *  - _withdrawalAmount should be greater than 0
     *  - _withdrawalAmount is in waopdai units, Eg: _withdrawalAmount = 1e18 waopdai means _withdrawalAmount = 1 opDai
     */
    function userWithdraw(uint256 _withdrawalAmount) external nonReentrant returns (bool _success) {
        require(_withdrawalAmount > 0, "Withdrawal amount must be greater than 0");

        uint256 lpTokenUserBalance = balanceOf(msg.sender);
        require(_withdrawalAmount <= lpTokenUserBalance, "Insufficient balance");

        poolValue = calPoolValueInToken();
        uint256 redeemlpTokenAmount = (poolValue.mul(_withdrawalAmount)).div(totalSupply());

        _balances[msg.sender] = _balances[msg.sender].sub(_withdrawalAmount, "withdrawal amount exceeds balance");
        _totalSupply = _totalSupply.sub(_withdrawalAmount);
        emit Transfer(msg.sender, address(0), _withdrawalAmount);
        
        // Check balance
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if(tokenBalance < redeemlpTokenAmount) {
            _withdrawSome(redeemlpTokenAmount.sub(tokenBalance));
        }
        
        IERC20(token).safeTransfer(msg.sender, redeemlpTokenAmount);
        poolValue = calPoolValueInToken();
        _success = true;
    }
    
    /**
     * @dev Function to withdraw the lp tokens from the liquidity pool (for example cDAI)
     * 
     * Requirements:
     *  -   contract function will be called.
     *  -   _redeemAmount: amount to withdraw from the  liquidity pool. Its uints are: 
     *      in  weth uints i.e. 1e18
     */
    function userWithdrawRebalance(uint256 _redeemAmount) external onlyValidAddress nonReentrant returns(bool) {
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
        address[] memory _underlyingTokens = new address[](1);
        _underlyingTokens[0] = token;
        if (tokenBalance < redeemAmountInToken) {
          newStrategyHash = RiskManagerContract.getBestStrategy(profile,_underlyingTokens);
          if (keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash))) {
              _withdrawAll();
          }
          else {
              _withdrawSome(redeemAmountInToken.sub(tokenBalance));
          }
        }
        IERC20(token).safeTransfer(msg.sender, redeemAmountInToken);
        if (keccak256(abi.encodePacked(newStrategyHash)) != keccak256(abi.encodePacked(strategyHash))) {
           strategyHash = newStrategyHash;
           _rebalance();
        }
        poolValue = calPoolValueInToken();
        return true;
    }
}
