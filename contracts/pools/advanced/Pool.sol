// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./../../libraries/SafeERC20.sol";
import "./../../utils/Context.sol";
import "./../../utils/ERC20.sol";
import "./../../utils/ERC20Detailed.sol";
import "./../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "./../../utils/Ownable.sol";
import "./../../utils/ReentrancyGuard.sol";
import "./../../interfaces/opty/IRiskManager.sol";
import "./../../interfaces/opty/IOptyStrategy.sol";

/**
 * @dev Opty.Fi's Advance Pool contract for DAI token
 */
contract OptyDAIAdvancePool is ERC20, ERC20Detailed, Ownable, ReentrancyGuard {
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

    function supplyAll() public ifNotDiscontinued ifNotPaused {
        uint256 _tokenBalance = IERC20(token).balanceOf(address(this));
        require(_tokenBalance > 0, "!amount>0");
        uint256 _steps = strategyCodeProviderContract.getDepositAllStepCount(strategyHash);
        for (uint256 _i = 0; _i < _steps; _i++) {
            bytes[] memory _codes = strategyCodeProviderContract.getPoolDepositAllCodes(payable(address(this)), token, strategyHash, _i);
            for (uint256 _j = 0; _j < _codes.length; _j++) {
                (address pool, bytes memory data) = abi.decode(_codes[_j], (address, bytes));
                (bool success, ) = pool.call(data);
                require(success);
            }
        }
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
    function userDepositRebalance(uint256 _amount) public ifNotDiscontinued ifNotPaused nonReentrant returns (bool _success) {
        require(_amount > 0, "!(_amount>0)");
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 opDaiUserBalanceBefore = balanceOf(msg.sender);
        require(_withdrawalAmount <= opDaiUserBalanceBefore, "Insufficient balance");

        poolValue = calPoolValueInToken();
        uint256 redeemOpDaiInDai = (poolValue.mul(_withdrawalAmount)).div(totalSupply());

        if (_tokenBalance.sub(_amount) == 0 || totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div((_tokenBalance.sub(_amount)));
        }
        if (balance() > 0) {
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = token;
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            supplyAll();
        }
        _mint(msg.sender, shares);
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
    function userWithdrawRebalance(uint256 _redeemAmount) public ifNotPaused nonReentrant returns (bool) {
        require(_redeemAmount > 0, "withdraw must be greater than 0");
        
        uint256 opBalance = balanceOf(msg.sender);
        require(_redeemAmount <= opBalance, "Insufficient balance");

        if (!discontinued) {
            _withdrawAll();
            harvest(strategyHash);
        }

        uint256 redeemAmountInToken = (balance().mul(_redeemAmount)).div(totalSupply());

        //  Updating the totalSupply of op tokens
        _balances[msg.sender] = _balances[msg.sender].sub(_redeemAmount, "Redeem amount exceeds balance");
        _totalSupply = _totalSupply.sub(_redeemAmount);
        emit Transfer(msg.sender, address(0), _redeemAmount);

        IERC20(token).safeTransfer(msg.sender, redeemAmountInToken);
        if (!discontinued && (balance() > 0)) {
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = token;
            strategyHash = riskManagerContract.getBestStrategy(profile, _underlyingTokens);
            supplyAll();
        }
        return true;
    }

    function getPricePerFullShare() public view returns (uint256) {
        return _calPoolValueInToken().div(totalSupply());
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
