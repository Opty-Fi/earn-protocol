// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/opty/IOptyRegistry.sol";
import "../../interfaces/curve/ICurveDeposit.sol";
import "../../interfaces/curve/ICurveSwap.sol";
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/curve/ICurveDAO.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../libraries/Addresses.sol";
import "../../libraries/SafeERC20.sol";
import "../../OptyRegistry.sol";

contract OptyCurvePoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    
    /**
    * @dev Opty Registry hard-coded contract address
    */
    address OptyRegistryAddress = address(0x1EA30475f9c7f89b95A94e42865C1b5DAC8972aF);
    
    
    /**
    * @dev Mapping to store the number of different tokens that each pool has
    */
    mapping (address => uint) numberOfTokens;
    
    /**
    * @dev Mapping that associates LP token address to liquidityPool address
    */
    mapping (address => address) LPToken;
    
    OptyRegistry OptyRegistryContract = OptyRegistry(OptyRegistryAddress);

    /**
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy(address _underlyingToken,address _liquidityPool,address _liquidityPoolToken,uint _amount) public override returns(bool){
        uint N_COINS = OptyRegistryContract.getNumberOfTokens(_liquidityPool);
        if (N_COINS == uint(2)){
            deploy2(_underlyingToken, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(3)){
            deploy3(_underlyingToken, _liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(4)){
            deploy4(_underlyingToken, _liquidityPool, _liquidityPoolToken, _amount);
        }
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 2 tokens
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy2(address _underlyingToken,address _liquidityPool,address _liquidityPoolToken,uint _amount) internal returns(bool){
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_liquidityPool);
        uint[2] memory amountsIn;
        for (uint i=0; i<uint(2); i++){
            if(tokensList[i] == _underlyingToken){
                amountsIn[i] = _amount;
                IERC20(tokensList[i]).safeApprove(_liquidityPool, uint(0));
                IERC20(tokensList[i]).safeApprove(_liquidityPool, _amount);
            }
            else{
                amountsIn[i] = uint(0);
                IERC20(tokensList[i]).safeApprove(_liquidityPool, uint(0));
            }
        }
        uint minAmountOut = uint(0);
        ICurveDeposit(_liquidityPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender,IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 3 tokens
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy3(address _underlyingToken,address _liquidityPool,address _liquidityPoolToken,uint _amount) internal returns(bool){
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_liquidityPool);
        uint[3] memory amountsIn;
        for (uint i=0; i<uint(3); i++){
            if(tokensList[i] == _underlyingToken){
                amountsIn[i] = _amount;
                IERC20(tokensList[i]).safeApprove(_liquidityPool, uint(0));
                IERC20(tokensList[i]).safeApprove(_liquidityPool, _amount);
            }
            else{
                amountsIn[i] = uint(0);
                IERC20(tokensList[i]).safeApprove(_liquidityPool, uint(0));
            }
        }
        uint minAmountOut = uint(0);
        ICurveDeposit(_liquidityPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender,IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Deploy function for a pool with 4 tokens
    * 
    * @param _underlyingToken Address of the token that the user wants to deposit
    * @param _liquidityPool Address of the pool deposit (or swap, in some cases) contract
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _underlyingToken to deposit
    */
    function deploy4(address _underlyingToken,address _liquidityPool,address _liquidityPoolToken,uint _amount) internal returns(bool){
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_liquidityPool);
        uint[4] memory amountsIn;
        for (uint i=0; i<uint(4); i++){
            if(tokensList[i] == _underlyingToken){
                amountsIn[i] = _amount;
                IERC20(tokensList[i]).safeApprove(_liquidityPool, uint(0));
                IERC20(tokensList[i]).safeApprove(_liquidityPool, _amount);
            }
            else{
                amountsIn[i] = uint(0);
                IERC20(tokensList[i]).safeApprove(_liquidityPool, uint(0));
            }
        }
        uint minAmountOut = uint(0);
        ICurveDeposit(_liquidityPool).add_liquidity(amountsIn, minAmountOut);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender,IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    /**
    * @dev Swaps _amount of _liquidityPoolToken for _underlyingToken
    * 
    * @param _underlyingToken Address of the token that the user wants to withdraw
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for _underlyingToken
    */
    function recall(address _underlyingToken, address _liquidityPoolToken, uint _amount) public override returns(bool) {
        address liquidityPool = OptyRegistryContract.getLPTokenToLiquidityPool(_liquidityPoolToken);
        address[] memory tokensList = OptyRegistryContract.getLPTokenToUnderlyingTokens(_liquidityPoolToken);
        uint8 N_COINS = uint8(tokensList.length);
        int128 i;
        for (uint8 j=0; j<N_COINS; j++){
            if(tokensList[j] == _underlyingToken){
                i = int128(j);
                break;
            }
        }
        uint minAmountOut = 0;
        IERC20(_liquidityPoolToken).safeApprove(liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(liquidityPool, uint(_amount));
        ICurveDeposit(liquidityPool).remove_liquidity_one_coin(_amount, i, minAmountOut, true);
        IERC20(_underlyingToken).safeTransfer(msg.sender, balance(_underlyingToken,address(this)));
        return true;
    }
    
    /**
    * @dev Calls the appropriate recallAllTokens function depending on N_COINS
    * 
    * @param _liquidityPoolToken Address of the token that represents users' holdings in the pool
    * @param _amount Quantity of _liquidityPoolToken to swap for underlying tokens
    */
    function recallAllTokens(address _liquidityPoolToken,uint _amount) public returns(bool){
        address liquidityPool = OptyRegistryContract.getLPTokenToLiquidityPool(_liquidityPoolToken);
        uint N_COINS = OptyRegistryContract.getLPTokenToUnderlyingTokens(_liquidityPoolToken).length;
        if (N_COINS == uint(2)){
            recallAllTokens2(liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(3)){
            recallAllTokens3(liquidityPool, _liquidityPoolToken, _amount);
        }
        else if (N_COINS == uint(4)){
            recallAllTokens4(liquidityPool, _liquidityPoolToken, _amount);
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
    function recallAllTokens2(address _liquidityPool, address _liquidityPoolToken, uint _amount) internal returns(bool) {
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_liquidityPool);
        uint[2] memory minAmountOut = [uint(0), uint(0)];
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity(_amount, minAmountOut);
        for (uint8 i=0; i<2; i++){
            IERC20(tokensList[i]).safeTransfer(msg.sender, balance(tokensList[i],address(this)));
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
    function recallAllTokens3(address _liquidityPool, address _liquidityPoolToken, uint _amount) internal returns(bool) {
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_liquidityPool);
        uint[3] memory minAmountOut = [uint(0), uint(0), uint(0)];
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity(_amount, minAmountOut);
        for (uint8 i=0; i<3; i++){
            IERC20(tokensList[i]).safeTransfer(msg.sender, balance(tokensList[i],address(this)));
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
    function recallAllTokens4(address _liquidityPool, address _liquidityPoolToken, uint _amount) internal returns(bool) {
        address[] memory tokensList = OptyRegistryContract.getUnderlyingTokens(_liquidityPool);
        uint[4] memory minAmountOut = [uint(0), uint(0), uint(0), uint(0)];
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_liquidityPool, uint(_amount));
        ICurveDeposit(_liquidityPool).remove_liquidity(_amount, minAmountOut);
        for (uint8 i=0; i<4; i++){
            IERC20(tokensList[i]).safeTransfer(msg.sender, balance(tokensList[i],address(this)));
        }
        return true;
    }
    
    /** 
    * @dev Calls the appropriate deploy function depending on N_COINS
    * 
    * @dev This function needs an address _underlyingToken argument to get how many _underlyingToken equal
    *      the user's balance in _liquidityPoolToken
    */
    function balanceInToken(address _liquidityPoolToken, address _holder) public override view returns(uint){
        // Mantisa 1e18 to decimals
        uint b = balance(_liquidityPoolToken,_holder);
        
        /**
        * TODO: Implement Curve calculations
        */
        
        return b;
    }
    
    /** 
    * @dev Returns the amount of _token that _holder has
    * 
    * @param _token Address of the ERC20 token of which the balance is read
    * @param _holder Address of which to know the balance
    */
    function balance(address _token,address _holder) public override view returns (uint) {
         return IERC20(_token).balanceOf(_holder);
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
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, balance(_liquidityPoolToken,address(this)));
        IERC20(crvToken).safeTransfer(msg.sender, balance(crvToken,address(this)));
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