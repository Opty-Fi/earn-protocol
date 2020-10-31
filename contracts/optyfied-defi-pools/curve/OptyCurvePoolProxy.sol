// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/opty/IOptyRegistry.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveSwap.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ICurveDAO.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";

contract OptyCurvePoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;    
    using Address for address;
    
    address public optyRegistry;
    address public governance;
    
    /**
    * @dev Constructor function to store OptyRegistry contract address
    * 
    * @param _optyRegistry Address of OptyRegistry contract
    */
    constructor(address _optyRegistry) public {
        governance = msg.sender;
        setOptyRegistry(_optyRegistry);
    }
    
    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        optyRegistry = _optyRegistry;
    }
    
    function borrow(address[] memory _underlyingToken,address _lendingPoolAddressProvider, address _borrowToken, uint _amount) public override returns(bool) { return true; }
    function repay(address _lendingPoolAddressProvider, address _borrowToken,address _lendingPoolToken) public override returns(bool) { return true; }
    
    /**
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @param _underlyingTokens Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _amounts Quantity of _underlyingToken to deposit
    */
    function deploy(address[] memory _underlyingTokens,address _liquidityPool,uint[] memory _amounts) public override returns(bool){
        uint N_COINS = _underlyingTokens.length;
        address _liquidityPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_liquidityPool,_underlyingTokens);
        if (N_COINS == uint(2)){
            _deploy2(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
        else if (N_COINS == uint(3)){
            _deploy3(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
        }
        else if (N_COINS == uint(4)){
            _deploy4(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amounts);
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
    function _deploy2(
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
    function _deploy3(
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
    function _deploy4(
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
    * @param _underlyingTokens Address of the token that the user wants to withdraw
    * @param _liquidityPool Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for _underlyingToken
    */
    function recall(address[] memory _underlyingTokens,address _liquidityPool,uint _amount) public override returns(bool) {
        uint N_COINS = _underlyingTokens.length;
        address _liquidityPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_liquidityPool,_underlyingTokens);
        if (N_COINS == uint(1)){
            _recall1(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(2)){
            _recall2(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(3)){
            _recall3(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(4)){
            _recall4(_underlyingTokens, _liquidityPool, _liquidityPoolToken, _amount);
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
    function _recall1(
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint _amount
        ) internal returns(bool) {
        uint minAmountOut = 0;
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity_one_coin(_amount, 0, minAmountOut, true);
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
    function _recall2(
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
    function _recall3(
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
    function _recall4(
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
    
    /** 
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
    *      the user's balance in _liquidityPoolToken
    */
    function balanceInToken(
        address[] memory _underlyingTokens, 
        address _underlyingToken,  
        address _liquidityPool, 
        address _holder
        ) public override view returns(uint) {
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_liquidityPool,_underlyingTokens);
        uint tokenIndex = 0;
        for(uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
            if(_underlyingTokens[i] == _underlyingToken) {
                tokenIndex = i;
            }
        }
        /**
        * TODO: Implement Curve calculations
        */
        return ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(IERC20(_lendingPoolToken).balanceOf(_holder), tokenIndex);
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
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
}

// Curve Compound useful addresses:

// address _DAItoken = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
// address _USDCtoken = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
// address _CurveCompoundLPToken = address(0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2);
// address _CurveCompoundDepositContract = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);
// address _CurveCompoundGaugeContract = address(0x7ca5b0a2910B33e9759DC7dDB0413949071D7575);

// array dai-usdc = ["0x6B175474E89094C44Da98b954EedeAC495271d0F","0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]