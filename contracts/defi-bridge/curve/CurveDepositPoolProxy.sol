// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveSwap.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ICurveDAO.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";

contract CurveDepositPoolProxy is IDepositPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;  
    
    mapping(address => address[]) public lendingPoolToUnderlyingTokens;
    
    /**
    * @dev mapp coins and tokens to curve deposit pool
    */
    constructor() public {
        // cDAI + cUSDC
        address[] memory cDAIcUSDCUnderTokens = new address[](2);
        cDAIcUSDCUnderTokens[0] = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // DAI
        cDAIcUSDCUnderTokens[1] = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC
        setLendingPoolToUnderlyingTokens(address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06),cDAIcUSDCUnderTokens);
        
        // cDAI+cUSDC+USDT
        address[] memory cDAIcUSDCUSDTUnderTokens = new address[](3);
        cDAIcUSDCUSDTUnderTokens[0] = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // DAI
        cDAIcUSDCUSDTUnderTokens[1] = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC
        cDAIcUSDCUSDTUnderTokens[2] = address(0xdAC17F958D2ee523a2206206994597C13D831ec7); // USDT
        setLendingPoolToUnderlyingTokens(address(0xac795D2c97e60DF6a99ff1c814727302fD747a80),cDAIcUSDCUSDTUnderTokens);
    }
    
    function setLendingPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyGovernance {
        lendingPoolToUnderlyingTokens[_lendingPool] = _tokens;
    }
    
    /**
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    // * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function deposit(address _liquidityPool, address _liquidityPoolToken, uint[] memory _amounts) public override returns(bool) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        uint N_COINS = _underlyingTokens.length;
        require (_amounts.length == N_COINS, "!_amounts.length");
        
        if (N_COINS == uint(2)){
            _deposit2(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
        else if (N_COINS == uint(3)){
            _deposit3(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
        else if (N_COINS == uint(4)){
            _deposit4(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 2 tokens
    * 
    * @param _underlyingTokens Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function _deposit2(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint[] memory _amounts
        ) internal returns(bool){
        uint minAmountOut = uint(0);
        uint[2] memory amountsIn;
        for(uint8 i = 0 ; i < 2 ; i++){
            amountsIn[i] = _amounts[i];
            if(amountsIn[i] > 0) {
                IERC20(_underlyingTokens[i]).safeTransferFrom(msg.sender,address(this),amountsIn[i]);
                IERC20(_underlyingTokens[i]).safeApprove(_liquidityPool, uint(0));
                IERC20(_underlyingTokens[i]).safeApprove(_liquidityPool, amountsIn[i]);    
            }
        }
        ICurveDeposit(_liquidityPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender,IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 3 tokens
    * 
    * @param _underlyingTokens Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function _deposit3(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint[] memory _amounts) internal returns(bool){
        uint minAmountOut = uint(0);
        uint[3] memory amountsIn;
        for(uint8 i = 0 ; i < 3 ; i++){
            amountsIn[i] = _amounts[i];
            if(amountsIn[i] > 0) {
                IERC20(_underlyingTokens[i]).safeTransferFrom(msg.sender,address(this),amountsIn[i]);
                IERC20(_underlyingTokens[i]).safeApprove(_liquidityPool, uint(0));
                IERC20(_underlyingTokens[i]).safeApprove(_liquidityPool, amountsIn[i]);    
            }
        }
        ICurveDeposit(_liquidityPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender,IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 4 tokens
    * 
    * @param _underlyingTokens Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function _deposit4(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint[] memory _amounts
        ) internal returns(bool){
        uint minAmountOut = uint(0);
        uint[4] memory amountsIn;
        for(uint8 i = 0 ; i < 3 ; i++){
            amountsIn[i] = _amounts[i];
            if(amountsIn[i] > 0) {
                IERC20(_underlyingTokens[i]).safeTransferFrom(msg.sender,address(this),amountsIn[i]);
                IERC20(_underlyingTokens[i]).safeApprove(_liquidityPool, uint(0));
                IERC20(_underlyingTokens[i]).safeApprove(_liquidityPool, amountsIn[i]);    
            }
        }
        ICurveDeposit(_liquidityPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender,IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Swaps _amount of _liquidityPoolToken for _underlyingToken
    * 
    * @param _liquidityPool Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for _underlyingToken
    */
    function withdraw(address[] memory _underlyingTokens, address _liquidityPool, address _liquidityPoolToken, uint _amount) public override returns(bool) {
        uint N_COINS = _underlyingTokens.length;
        if (N_COINS == uint(1)){
            _withdraw1(_underlyingTokens[0], _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(2)){
            _withdraw2(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(3)){
            _withdraw3(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(4)){
            _withdraw4(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        return true;
    }
    
    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _withdraw1(
        address _underlyingToken,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint _amount
        ) internal returns(bool) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        int128 i = 0;
        for(uint8 j = 0 ; j < _underlyingTokens.length ; j++){
            if(_underlyingTokens[j] == _underlyingToken) {
                i = j;
            }
        }
        uint minAmountOut = 0;
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity_one_coin(_amount, i, minAmountOut, true);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _withdraw2(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint  _amount
        ) internal returns(bool) {
        uint[2] memory minAmountOut = [uint(0), uint(0)];
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity(_amount, minAmountOut);
        for(uint8 i = 0 ; i < 2 ; i++) {
            IERC20(_underlyingTokens[i]).safeTransfer(msg.sender, IERC20(_underlyingTokens[i]).balanceOf(address(this)));   
        }
        return true;
    }

    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _withdraw3(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint _amount
        ) internal returns(bool) {
        uint[3] memory minAmountOut = [uint(0), uint(0), uint(0)];
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity(_amount, minAmountOut);
        for(uint8 i = 0; i < 3 ; i++){
            IERC20(_underlyingTokens[i]).safeTransfer(msg.sender, IERC20(_underlyingTokens[i]).balanceOf(address(this)));
        }
        return true;
    }
    
    /**
    * @dev Swaps _amount of _liquidityPoolToken for a certain quantity of each underlying token
    * 
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function _withdraw4(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint _amount
        ) internal returns(bool) {
        uint[4] memory minAmountOut = [uint(0), uint(0), uint(0), uint(0)];
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity(_amount, minAmountOut);
        for(uint8 i = 0; i < 4 ; i++){
            IERC20(_underlyingTokens[i]).safeTransfer(msg.sender, IERC20(_underlyingTokens[i]).balanceOf(address(this)));
        }
        return true;
    }
    
    function getLiquidityPoolToken(address _lendingPool) public override view returns(address) {
        return ICurveDeposit(_lendingPool).token();
    }
    
    function getUnderlyingTokens(address  _lendingPool , address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = lendingPoolToUnderlyingTokens[_lendingPool];
    }
    
    function _getUnderlyingTokens(address  _lendingPool) internal view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = lendingPoolToUnderlyingTokens[_lendingPool];
    }
    
    /** 
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
    *      the user's balance in _liquidityPoolToken
    */
    function balanceInToken(
        address _underlyingToken,  
        address _liquidityPool, 
        address _holder
        ) public override view returns(uint) {
        address[] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
        address _liquidityPoolToken = getLiquidityPoolToken(_liquidityPool);
        int128 tokenIndex = 0;
        for(uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
            if(_underlyingTokens[i] == _underlyingToken) {
                tokenIndex = i;
            }
        }
        /**
        * TODO: Implement Curve calculations
        */
        return ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(IERC20(_liquidityPoolToken).balanceOf(_holder), tokenIndex);
    }
    
    /** 
    * @dev Deposits _amount of _liquidityPoolToken in _liquidityPoolGauge to generate CRV rewards
    * 
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _liquidityPoolGauge Address of the gauge associated to the pool
    * @param _amount Quantity of _liquidityPoolToken to deposit in the gauge
    */
    function stakeLPtokens(address _liquidityPoolToken, address _liquidityPoolGauge, uint _amount) public returns(bool){
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPoolGauge, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPoolGauge, uint(_amount));
        ICurveGauge(_liquidityPoolGauge).deposit(_amount);
        return true;
    }
    
    /** 
    * @dev Withdraws _amount of _liquidityPoolToken from _liquidityPoolToken and claims CRV rewards
    * 
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _liquidityPoolGauge Address of the gauge associated to the pool
    * @param _amount Quantity of _liquidityPoolToken to withdraw from the gauge
    */
    function unstakeLPtokens(address _liquidityPoolToken, address _liquidityPoolGauge, uint _amount) public returns(bool){
        ICurveGauge(_liquidityPoolGauge).withdraw(_amount);
        address tokenMinter = 0xd061D61a4d941c39E5453435B6345Dc261C2fcE0;
        address crvToken = 0xD533a949740bb3306d119CC777fa900bA034cd52;
        ICurveDAO(tokenMinter).mint(_liquidityPoolGauge);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        IERC20(crvToken).safeTransfer(msg.sender, IERC20(crvToken).balanceOf(address(this)));
        return true;
    }
}

// Curve Compound useful addresses:

// address _DAItoken = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
// address _USDCtoken = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
// address _CurveCompoundLPToken = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
// address _CurveCompoundDepositContract = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
// address _CurveCompoundGaugeContract = address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575);

// array dai-usdc = ["0x6B175474E89094C44Da98b954EedeAC495271d0F","0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]
